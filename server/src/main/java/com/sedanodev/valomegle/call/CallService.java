package com.sedanodev.valomegle.call;

import java.util.Map;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import com.sedanodev.valomegle.call.exception.CallNoPendingInviteException;
import com.sedanodev.valomegle.call.exception.CallNotFriendsException;
import com.sedanodev.valomegle.call.exception.CallTargetUnreachableException;
import com.sedanodev.valomegle.call.exception.CallUserBusyException;
import com.sedanodev.valomegle.connection.ConnectionService;
import com.sedanodev.valomegle.friend.FriendService;
import com.sedanodev.valomegle.match.MatchRegistry;
import com.sedanodev.valomegle.match.UserDisconnectedEvent;
import com.sedanodev.valomegle.matchmaking.MatchmakingService;
import com.sedanodev.valomegle.websocket.WebSocketMessenger;
import com.sedanodev.valomegle.websocket.WebSocketSessionManager;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class CallService {

    private final FriendService friendService;
    private final MatchmakingService matchmakingService;
    private final MatchRegistry matchRegistry;
    private final CallInviteRegistry callInviteRegistry;
    private final WebSocketSessionManager sessionManager;
    private final WebSocketMessenger messenger;
    private final ConnectionService connectionService;

    public CallService(FriendService friendService, MatchmakingService matchmakingService, MatchRegistry matchRegistry,
            CallInviteRegistry callInviteRegistry, WebSocketSessionManager sessionManager, WebSocketMessenger messenger,
            ConnectionService connectionService) {
        this.friendService = friendService;
        this.matchmakingService = matchmakingService;
        this.matchRegistry = matchRegistry;
        this.callInviteRegistry = callInviteRegistry;
        this.sessionManager = sessionManager;
        this.messenger = messenger;
        this.connectionService = connectionService;
    }

    public void invite(String callerUsername, String targetUsername) {
        if (!friendService.areFriends(callerUsername, targetUsername)) {
            throw new CallNotFriendsException("You can only call users you're friends with");
        }

        WebSocketSession targetSession = sessionManager.getSession(targetUsername);
        if (targetSession == null || !targetSession.isOpen()) {
            throw new CallTargetUnreachableException(targetUsername + " is not currently online");
        }

        if (isBusy(callerUsername)) {
            throw new CallUserBusyException("You are already in a call, queued, or have a pending invite");
        }
        if (isBusy(targetUsername)) {
            throw new CallUserBusyException(targetUsername + " is currently busy");
        }

        callInviteRegistry.record(callerUsername, targetUsername);
        messenger.send(targetUsername, callerUsername, "call-invite", Map.of("fromUsername", callerUsername));
        log.info("{} invited {} to a direct call", callerUsername, targetUsername);
    }

    public void accept(String calleeUsername) {
        String callerUsername = callInviteRegistry.callerInvitingUser(calleeUsername);
        if (callerUsername == null) {
            throw new CallNoPendingInviteException("No pending call invite to accept");
        }

        callInviteRegistry.remove(callerUsername, calleeUsername);
        matchRegistry.pair(callerUsername, calleeUsername);
        messenger.send(callerUsername, calleeUsername, "call-accepted",
                Map.of("role", "caller", "peerUsername", calleeUsername));
        log.info("{} accepted {}'s call invite", calleeUsername, callerUsername);

        try {
            connectionService.recordMatch(callerUsername, calleeUsername);
        } catch (Exception e) {
            log.warn("Failed to record match history for {} and {}: {}", callerUsername, calleeUsername, e.getMessage());
        }
    }

    public void decline(String calleeUsername) {
        String callerUsername = callInviteRegistry.callerInvitingUser(calleeUsername);
        if (callerUsername == null) {
            throw new CallNoPendingInviteException("No pending call invite to decline");
        }

        callInviteRegistry.remove(callerUsername, calleeUsername);
        messenger.send(callerUsername, calleeUsername, "call-declined", Map.of("peerUsername", calleeUsername));
        log.info("{} declined {}'s call invite", calleeUsername, callerUsername);
    }

    public void cancel(String callerUsername) {
        String calleeUsername = callInviteRegistry.calleeInvitedByUser(callerUsername);
        if (calleeUsername == null) {
            throw new CallNoPendingInviteException("No pending call invite to cancel");
        }

        callInviteRegistry.remove(callerUsername, calleeUsername);
        messenger.send(calleeUsername, callerUsername, "call-cancelled", Map.of("peerUsername", callerUsername));
        log.info("{} cancelled their call invite to {}", callerUsername, calleeUsername);
    }

    private boolean isBusy(String username) {
        return matchRegistry.partnerOf(username) != null
                || matchmakingService.isInQueue(username)
                || callInviteRegistry.hasPendingInvite(username);
    }

    // Clears any pending invite the disconnected user was party to and lets whoever
    // was left waiting on the other end know, so their UI doesn't hang forever.
    @EventListener
    public void onUserDisconnected(UserDisconnectedEvent event) {
        String userId = event.userId();

        for (PendingCallInvite invite : callInviteRegistry.clearInvitesFor(userId)) {
            if (invite.callerUsername().equals(userId)) {
                // Disconnected user was the caller — the callee was left ringing.
                messenger.send(invite.calleeUsername(), userId, "call-cancelled", Map.of("peerUsername", userId));
            } else {
                // Disconnected user was the callee — the caller was left waiting.
                messenger.send(invite.callerUsername(), userId, "call-declined", Map.of("peerUsername", userId));
            }
        }
    }
}
