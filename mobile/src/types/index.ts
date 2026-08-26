export interface Drama {
  id: string;
  title: string;
  genre: string;
  description: string;
  thumbnailUrl: string;
  totalEpisodes: number;
  freeEpisodes: number; // episodes 1–N are free
  tags: string[];
  isNew?: boolean;
  isTrending?: boolean;
}

export interface Episode {
  id: string;
  dramaId: string;
  episodeNumber: number;
  title: string;
  durationSeconds: number;
  videoUrl: string | null; // HLS .m3u8 or direct .mp4; null for locked/unauthenticated
  thumbnailUrl: string;
  isLocked: boolean;       // requires coins or ad-watch
  coinCost: number;        // 0 if free
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  coinBalance: number;
  unlockedEpisodeIds: string[];
  likedEpisodeIds: string[];
}

export interface UnlockRequest {
  episodeId: string;
  method: 'coins' | 'ad';
}

export interface UnlockResponse {
  success: boolean;
  newCoinBalance?: number;
  videoUrl?: string;
  message?: string;
}

export type RootStackParamList = {
  Feed: { dramaId?: string; startEpisode?: number };
  DramaDetail: { dramaId: string };
  EpisodePlayer: { dramaId: string; episodeNumber: number };
  Home: undefined;
  Profile: undefined;
  Paywall: { episode: Episode; drama: Drama };
};
