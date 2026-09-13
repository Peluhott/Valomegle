package com.sedanodev.valomegle.call;

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

    // callerUsername -> calleeUsername
    private final Map<String, String> outgoingInvites = new ConcurrentHashMap<>();
    // calleeUsername -> callerUsername (reverse index so "who invited me" is O(1))
    private final Map<String, String> incomingInvites = new ConcurrentHashMap<>();

    public void record(String callerUsername, String calleeUsername) {
        outgoingInvites.put(callerUsername, calleeUsername);
        incomingInvites.put(calleeUsername, callerUsername);
    }

    // Who is currently inviting this user, if anyone — used for accept/decline.
    public String callerInvitingUser(String calleeUsername) {
        return incomingInvites.get(calleeUsername);
    }

    // Who this user is currently inviting, if anyone — used for cancel and for the
    // matchmaking queue-join guard.
    public String calleeInvitedByUser(String callerUsername) {
        return outgoingInvites.get(callerUsername);
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

        String calleeUsername = outgoingInvites.remove(username);
        if (calleeUsername != null) {
            incomingInvites.remove(calleeUsername);
            cleared.add(new PendingCallInvite(username, calleeUsername));
        }

        String callerUsername = incomingInvites.remove(username);
        if (callerUsername != null) {
            outgoingInvites.remove(callerUsername);
            cleared.add(new PendingCallInvite(callerUsername, username));
        }

        return cleared;
    }
}
