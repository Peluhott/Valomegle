package com.sedanodev.valomegle.call;

// A caller's outstanding invite to a callee that hasn't been accepted, declined, or
// cancelled yet. Returned by CallInviteRegistry when clearing invites so the caller
// (CallService) knows which direction to notify.
public record PendingCallInvite(String callerUsername, String calleeUsername) {
}
