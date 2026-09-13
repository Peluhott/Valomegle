package com.sedanodev.valomegle.matchmaking;

import java.util.List;

// Snapshot of a waiting user: what they're willing to accept in a partner (null
// rankLo/rankHi or empty regions = no preference on that axis, i.e. anyone).
// Serialized to JSON and stored in Redis alongside the plain FIFO order list,
// keyed by username.
public record MatchTicket(String username, String rankLo, String rankHi, List<String> regions) {
}
