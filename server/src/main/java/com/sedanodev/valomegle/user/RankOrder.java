package com.sedanodev.valomegle.user;

import java.util.List;

// Canonical, ordered rank ladder — index position is the single source of truth
// for "who outranks whom" everywhere rank comparisons are needed (profile
// validation, matchmaking preference matching). Lowest rank first.
public final class RankOrder {

    public static final List<String> ORDER = List.of(
            "Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant");

    private RankOrder() {}

    // -1 if rank is null/not recognized.
    public static int indexOf(String rank) {
        return rank == null ? -1 : ORDER.indexOf(rank);
    }
}
