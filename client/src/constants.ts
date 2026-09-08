export const RANKS = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'];
export const REGIONS = ['West', 'Central', 'East'];

export function rankRangeLabel(lo: number, hi: number): string {
    return lo === hi ? `${RANKS[lo]} only` : `${RANKS[lo]} – ${RANKS[hi]}`;
}
