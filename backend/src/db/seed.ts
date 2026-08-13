/**
 * Seed script — run with: npm run db:seed
 *
 * Inserts the initial dramas and their episodes. Idempotent: skips dramas that
 * already exist by title, and upserts episodes via the unique (dramaId, episodeNumber)
 * index.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { eq, sql } from 'drizzle-orm';
import * as schema from './schema.js';
import { dramasTable, episodesTable } from './schema.js';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const DRAMAS = [
  {
    title: "Billionaire's Revenge",
    genre: 'Drama · Thriller',
    description:
      'When a self-made billionaire discovers his fiancée married his rival, he orchestrates a meticulous corporate takedown that tears both families apart.',
    thumbnailUrl: 'https://cdn.cinedrama.app/thumbs/billionaires-revenge.jpg',
    totalEpisodes: 24,
    freeEpisodes: 2,
    tags: ['drama', 'thriller', 'romance', 'revenge'],
    isNew: false,
    isTrending: true,
  },
  {
    title: 'Neon Exodus',
    genre: 'Sci-Fi · Action',
    description:
      'In 2089, a rogue AI detective hunts synthetic humans disguised as citizens — until she discovers she might be one of them.',
    thumbnailUrl: 'https://cdn.cinedrama.app/thumbs/neon-exodus.jpg',
    totalEpisodes: 18,
    freeEpisodes: 2,
    tags: ['sci-fi', 'action', 'ai', 'thriller'],
    isNew: true,
    isTrending: false,
  },
  {
    title: 'Whisper of the Tide',
    genre: 'Romance · Suspense',
    description:
      'A marine biologist and a mysterious salvage diver uncover a decades-old maritime conspiracy — and an undeniable connection.',
    thumbnailUrl: 'https://cdn.cinedrama.app/thumbs/whisper-of-the-tide.jpg',
    totalEpisodes: 30,
    freeEpisodes: 2,
    tags: ['romance', 'suspense', 'mystery'],
    isNew: false,
    isTrending: true,
  },
  {
    title: 'Crown of Lies',
    genre: 'Political · Drama',
    description:
      "The heir to a political dynasty must choose between her family's legacy and the journalist who threatens to expose everything.",
    thumbnailUrl: 'https://cdn.cinedrama.app/thumbs/crown-of-lies.jpg',
    totalEpisodes: 20,
    freeEpisodes: 2,
    tags: ['political', 'drama', 'romance'],
    isNew: true,
    isTrending: true,
  },
];

const EPISODE_TITLE_TEMPLATES = [
  'The Beginning',
  'Shadows Fall',
  'No Way Back',
  'The Truth Revealed',
  'Burning Bridges',
  'Into the Storm',
  'The Last Chance',
  'Betrayal',
  'Reckoning',
  'A New Dawn',
  'The Price of Power',
  'Unmasked',
  'Crossroads',
  'The Final Gambit',
  'Aftermath',
];

function episodeTitle(n: number): string {
  return EPISODE_TITLE_TEMPLATES[(n - 1) % EPISODE_TITLE_TEMPLATES.length];
}

async function seed() {
  console.log('Seeding database…');

  for (const dramaData of DRAMAS) {
    const existing = await db
      .select({ id: dramasTable.id })
      .from(dramasTable)
      .where(eq(dramasTable.title, dramaData.title))
      .limit(1);

    let dramaId: string;
    if (existing.length > 0) {
      dramaId = existing[0].id;
      console.log(`  skip drama: "${dramaData.title}" (${dramaId})`);
    } else {
      const [inserted] = await db
        .insert(dramasTable)
        .values(dramaData)
        .returning({ id: dramasTable.id });
      dramaId = inserted.id;
      console.log(`  inserted drama: "${dramaData.title}" (${dramaId})`);
    }

    let upserted = 0;
    for (let ep = 1; ep <= dramaData.totalEpisodes; ep++) {
      const isLocked = ep > dramaData.freeEpisodes;
      const videoUrl = `https://cdn.cinedrama.app/videos/${dramaId}/ep${ep}.m3u8`;

      await db
        .insert(episodesTable)
        .values({
          dramaId,
          episodeNumber: ep,
          title: episodeTitle(ep),
          durationSeconds: 90 + ((ep * 7) % 61),
          videoUrl,
          thumbnailUrl: `https://cdn.cinedrama.app/thumbs/${dramaId}/ep${ep}.jpg`,
          isLocked,
          coinCost: isLocked ? 5 : 0,
        })
        .onConflictDoUpdate({
          target: [episodesTable.dramaId, episodesTable.episodeNumber],
          set: {
            videoUrl: sql`excluded.video_url`,
          },
        });

      upserted++;
    }
    console.log(`    episodes upserted: ${upserted} / ${dramaData.totalEpisodes}`);
  }

  console.log('Seed complete.');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  pool.end();
  process.exit(1);
});
