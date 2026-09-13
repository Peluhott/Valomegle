package com.sedanodev.valomegle.matchmaking;

import java.util.List;

// Snapshot of a waiting user: their actual rank/region (nullable — profile fields
// are optional) and what they're willing to accept (null rankLo/rankHi or empty
// regions = no preference on that axis). Serialized to JSON and stored in Redis
// alongside the plain FIFO order list, keyed by username.
public record MatchTicket(String username, String myRank, String myRegion,
                           String rankLo, String rankHi, List<String> regions) {
}
