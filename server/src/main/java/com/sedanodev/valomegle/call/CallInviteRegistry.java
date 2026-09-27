package com.sedanodev.valomegle.call;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

// In-memory tracker for pending direct-call invites, same concurrency approach as
// MatchRegistry — no persistence, just thread-safe lookups while an invite is live.
// Kept to state only: sending notifications about invites is CallService's job.
@Component
public class CallInviteRegistry {

    // callerUsername -> invite
    private final Map<String, PendingCallInvite> outgoingInvites = new ConcurrentHashMap<>();
    // calleeUsername -> callerUsername (reverse index so "who invited me" is O(1))
    private final Map<String, String> incomingInvites = new ConcurrentHashMap<>();

    public void record(String callerUsername, String calleeUsername) {
        outgoingInvites.put(callerUsername, new PendingCallInvite(callerUsername, calleeUsername, Instant.now()));
        incomingInvites.put(calleeUsername, callerUsername);
    }

    // Who is currently inviting this user, if anyone — used for accept/decline.
    public String callerInvitingUser(String calleeUsername) {
        return incomingInvites.get(calleeUsername);
    }

    // Who this user is currently inviting, if anyone — used for cancel and for the
    // matchmaking queue-join guard.
    public String calleeInvitedByUser(String callerUsername) {
        PendingCallInvite invite = outgoingInvites.get(callerUsername);
        return invite != null ? invite.calleeUsername() : null;
    }

    public boolean hasPendingInvite(String username) {
        return outgoingInvites.containsKey(username) || incomingInvites.containsKey(username);
    }

    public void remove(String callerUsername, String calleeUsername) {
        outgoingInvites.remove(callerUsername);
        incomingInvites.remove(calleeUsername);
    }

    // Removes any invite the given user was involved in, as either caller or callee,
    // and reports which so the caller (CallService) can notify whoever is left waiting.
    // In practice a user is party to at most one pending invite at a time (invite()
    // guards against both sides), but this clears both directions defensively.
    public List<PendingCallInvite> clearInvitesFor(String username) {
        List<PendingCallInvite> cleared = new ArrayList<>();

        PendingCallInvite outgoing = outgoingInvites.remove(username);
        if (outgoing != null) {
            incomingInvites.remove(outgoing.calleeUsername());
            cleared.add(outgoing);
        }

        String callerUsername = incomingInvites.remove(username);
        if (callerUsername != null) {
            PendingCallInvite incoming = outgoingInvites.remove(callerUsername);
            if (incoming != null) {
                cleared.add(incoming);
            }
        }

        return cleared;
    }

    public List<PendingCallInvite> removeExpired(Duration maxAge) {
        Instant cutoff = Instant.now().minus(maxAge);
        List<PendingCallInvite> expired = new ArrayList<>();

        for (PendingCallInvite invite : outgoingInvites.values()) {
            if (invite.createdAt().isBefore(cutoff)
                    && outgoingInvites.remove(invite.callerUsername(), invite)) {
                incomingInvites.remove(invite.calleeUsername(), invite.callerUsername());
                expired.add(invite);
            }
        }

        return expired;
    }
}
