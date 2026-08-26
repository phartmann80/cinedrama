#!/usr/bin/env bash
#
# Generate placeholder preview teasers for the CineDrama landing page cards.
#
# Outputs 4 muted, seamless-loop H.264 MP4s (480x640 portrait) at:
#   /opt/cinedrama/downloads/previews/<slug>.mp4
#
# These are served by the Nginx `location /download/previews/` block (inline,
# video/mp4, long cache). When real trailers replace them later, just overwrite
# the same paths — no code change needed in the landing page.
#
# SECRET-FREE. No passwords, tokens, or copyrighted material. Each teaser is an
# original animated version of the card's existing brand gradient (slow drift,
# film grain, vignette, optional genre label) generated entirely with ffmpeg.
#
# RUN (on the VPS as root, or any user with write access to the output dir):
#   sudo apt-get install -y ffmpeg        # if not already installed
#   sudo bash deploy/scripts/make-preview-teasers.sh
#
# Optional env:
#   FFMPEG            ffmpeg binary (default: ffmpeg)
#   OUT_DIR           output dir (default: /opt/cinedrama/downloads/previews)
#   DURATION          seconds per clip (default: 6)
#   SIZE              WxH (default: 480x640)
#   FPS               (default: 30)
#   CRF               x264 quality (default: 30; lower = better/larger)
#   FONT_FILE         font for the optional genre label (default: DejaVu Bold)
#
# Check ffmpeg has drawtext (needs freetype); label is skipped gracefully if not.
#
set -euo pipefail

FFMPEG="${FFMPEG:-ffmpeg}"
OUT_DIR="${OUT_DIR:-/opt/cinedrama/downloads/previews}"
DURATION="${DURATION:-6}"
SIZE="${SIZE:-480x640}"
FPS="${FPS:-30}"
CRF="${CRF:-30}"
FONT_FILE="${FONT_FILE:-/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf}"

# Show config: slug | label | accent RGB (R G B)
# Accent matches the gradient used on the landing page cards.
SHOWS=(
  "billionaire-s-revenge|DRAMA · THRILLER|232 0 61"
  "neon-exodus|SCI-FI · ACTION|59 130 246"
  "whisper-of-the-tide|ROMANCE · SUSPENSE|20 184 166"
  "crown-of-lies|POLITICAL · DRAMA|139 92 246"
)

# --- 1. Preflight ---------------------------------------------------------
if ! command -v "${FFMPEG}" >/dev/null 2>&1; then
  echo "ERROR: ffmpeg not found (set FFMPEG or install: sudo apt-get install -y ffmpeg)"
  exit 1
fi

# Detect drawtext support (gentle, non-fatal).
HAS_DRAWTEXT=0
if "${FFMPEG}" -hide_banner -filters 2>/dev/null | grep -q " drawtext "; then
  HAS_DRAWTEXT=1
fi

mkdir -p "${OUT_DIR}"
echo "=== CineDrama preview teasers ==="
echo "  ffmpeg:    ${FFMPEG}"
echo "  output:    ${OUT_DIR}"
echo "  duration:  ${DURATION}s  size: ${SIZE}  fps: ${FPS}  crf: ${CRF}"
echo "  drawtext:  $([ "${HAS_DRAWTEXT}" -eq 1 ] && echo yes || echo 'no (label skipped)')"
echo ""

# --- 2. Per-show generation ----------------------------------------------
W="$(echo "${SIZE}" | cut -dx -f1)"
H="$(echo "${SIZE}" | cut -dx -f2)"
D="${DURATION}"

# Build a geq RGB component expression for one color channel.
# Two moving glows (primary + subtle secondary) sweep in a periodic ellipse so
# the clip loops seamlessly at DURATION. Film grain + vignette are added after.
make_comp() {
  local base="$1" accent="$2"
  # E1 = primary glow, E2 = secondary (phase-shifted) glow, both periodic.
  local e1="$3"
  printf '%s+%s*%s+%s*0.45*exp(-((X-W/2+W*0.24*sin(2*PI*T/%s))^2+(Y-H/2+H*0.20*cos(2*PI*T/%s))^2)/(0.06*W*W))' \
    "${base}" "${accent}" "${e1}" "${accent}" "${D}" "${D}"
}

make_teaser() {
  local slug="$1" label="$2" r="$3" g="$4" b="$5"
  local out="${OUT_DIR}/${slug}.mp4"

  # Base near-black with a faint brand tint.
  local br=$((r / 22)) bg=$((g / 22)) bb=$((b / 22))

  # Primary glow gaussian.
  local e
  e="exp(-((X-W/2-W*0.27*sin(2*PI*T/${D}))^2+(Y-H/2-H*0.27*cos(2*PI*T/${D}))^2)/(0.14*W*W))"
  local R G B
  R="$(make_comp "${br}" "${r}" "${e}")"
  G="$(make_comp "${bg}" "${g}" "${e}")"
  B="$(make_comp "${bb}" "${b}" "${e}")"

  local filters
  filters="geq=r='${R}':g='${G}':b='${B}',format=yuv420p"

  # Optional genre label (requires drawtext + freetype + a font file).
  if [ "${HAS_DRAWTEXT}" -eq 1 ] && [ -r "${FONT_FILE}" ]; then
    filters="${filters},drawtext=fontfile=${FONT_FILE}:text='${label}':fontcolor=white:fontsize=26:borderw=2:bordercolor=black@0.55:box=0:x=(w-text_w)/2:y=h-h*0.20,format=yuv420p"
  else
    echo "  (label skipped for ${slug}: drawtext or font not available)"
  fi

  # Slow drifting grain + vignette so it reads "cinematic".
  filters="${filters},noise=alls=6:allf=t,vignette=PI/5,format=yuv420p"

  echo "  [${slug}] generating..."
  "${FFMPEG}" -hide_banner -loglevel error \
    -f lavfi -i "color=c=black:s=${SIZE}:d=${D},format=gbrp" \
    -vf "${filters}" \
    -r "${FPS}" -t "${D}" \
    -c:v libx264 -crf "${CRF}" -preset slower -pix_fmt yuv420p -movflags +faststart \
    -an "${out}"
}

i=0
for entry in "${SHOWS[@]}"; do
  IFS='|' read -r slug label rgb <<< "${entry}"
  IFS=' ' read -r R G B <<< "${rgb}"
  make_teaser "${slug}" "${label}" "${R}" "${G}" "${B}"
  i=$((i + 1))
done

# --- 3. Verify -------------------------------------------------------------
echo ""
echo "=== Generated ==="
FAIL=0
for entry in "${SHOWS[@]}"; do
  IFS='|' read -r slug label rgb <<< "${entry}"
  f="${OUT_DIR}/${slug}.mp4"
  if [ -s "${f}" ]; then
    size="$(du -h "${f}" | cut -f1)"
    printf '  %-24s %s (%s)\n' "${slug}" "$(stat -c '%s' "${f}") bytes" "${size}"
  else
    echo "  ERROR: missing/empty ${f}"
    FAIL=1
  fi
done

echo ""
if [ "${FAIL}" -eq 0 ]; then
  echo "All ${#SHOWS[@]} teasers generated. Serving URL pattern: /download/previews/<slug>.mp4"
else
  echo "One or more teasers failed."
  exit 1
fi
