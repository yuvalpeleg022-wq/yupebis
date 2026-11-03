import type { CareerMeta, NewsEvent, NewsType, World } from '@gbm/shared-types';
import { SAVE_VERSION, nextId } from '@gbm/shared-types';

export function emptyWorld(meta: Omit<CareerMeta, 'saveVersion' | 'idCounters' | 'createdAt' | 'updatedAt'>): World {
  const now = new Date().toISOString();
  return {
    meta: { ...meta, saveVersion: SAVE_VERSION, idCounters: {}, createdAt: now, updatedAt: now },
    rules: {},
    leagues: {},
    clubs: {},
    players: {},
    contracts: {},
    staff: {},
    injuries: {},
    fixtures: {},
    matches: {},
    playerGameStats: [],
    series: {},
    news: [],
    finances: [],
    transfers: [],
    negotiations: {},
    playerSeasons: [],
    seasonStandings: [],
    seasonSummaries: [],
    awards: [],
    managerHistory: [],
    staffHistory: [],
    staffNegotiations: {},
    scoutingReports: {},
    dataIssues: {},
    dataSources: {},
  };
}

export function addNews(
  world: World,
  type: NewsType,
  title: string,
  body: string,
  opts: { clubId?: string | null; playerId?: string | null; important?: boolean } = {},
): NewsEvent {
  const n: NewsEvent = {
    id: nextId(world, 'nw'),
    date: world.meta.currentDate,
    type,
    title,
    body,
    clubId: opts.clubId ?? null,
    playerId: opts.playerId ?? null,
    important: opts.important ?? false,
    read: false,
  };
  world.news.push(n);
  // Keep the news feed bounded for long careers.
  if (world.news.length > 600) world.news.splice(0, world.news.length - 600);
  return n;
}

export function userClub(world: World) {
  return world.clubs[world.meta.userClubId];
}

export function playableLeagues(world: World) {
  return Object.values(world.leagues).filter((l) => l.active);
}
