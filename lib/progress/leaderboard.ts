/** One row of get_friend_leaderboard(). */
export type LeaderboardEntry = {
  seniorId: string;
  displayName: string;
  streak: number;
  weekRate: number;
  includesSampleData: boolean;
  isMe: boolean;
};

// Plain code-point order, so every device and the server agree.
function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Highest week % first, then the longer streak, then name, then id. The
 * board resets every Monday because the week % is this week's.
 */
export function sortLeaderboard<T extends LeaderboardEntry>(entries: readonly T[]): T[] {
  return [...entries].sort(
    (a, b) =>
      b.weekRate - a.weekRate ||
      b.streak - a.streak ||
      compareText(a.displayName, b.displayName) ||
      compareText(a.seniorId, b.seniorId),
  );
}

/** 1-based position of the signed-in senior, or null if they are not on the board. */
export function myRank(entries: readonly LeaderboardEntry[]): number | null {
  const index = sortLeaderboard(entries).findIndex((e) => e.isMe);
  return index === -1 ? null : index + 1;
}
