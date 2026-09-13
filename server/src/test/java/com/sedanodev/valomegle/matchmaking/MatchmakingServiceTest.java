package com.sedanodev.valomegle.matchmaking;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sedanodev.valomegle.call.CallInviteRegistry;
import com.sedanodev.valomegle.connection.ConnectionService;
import com.sedanodev.valomegle.match.MatchRegistry;
import com.sedanodev.valomegle.match.UserDisconnectedEvent;
import com.sedanodev.valomegle.matchmaking.request.JoinQueueRequest;
import com.sedanodev.valomegle.user.User;
import com.sedanodev.valomegle.user.UserRepository;
import com.sedanodev.valomegle.websocket.WebSocketMessenger;

class MatchmakingServiceTest {

    @SuppressWarnings("unchecked")
    private static ListOperations<String, String> stubbedListOps(StringRedisTemplate redisTemplate) {
        ListOperations<String, String> listOps = mock(ListOperations.class);
        when(redisTemplate.opsForList()).thenReturn(listOps);
        return listOps;
    }

    // Backs opsForList() with a real Deque so tryMatch()'s multi-step pop/push
    // sequences behave like an actual FIFO instead of stubbed one-shot returns.
    @SuppressWarnings("unchecked")
    private static ListOperations<String, String> queueBackedListOps(StringRedisTemplate redisTemplate, Deque<String> queue) {
        ListOperations<String, String> listOps = mock(ListOperations.class);
        when(redisTemplate.opsForList()).thenReturn(listOps);

        when(listOps.leftPop(anyString())).thenAnswer(inv -> queue.pollFirst());
        when(listOps.size(anyString())).thenAnswer(inv -> (long) queue.size());
        when(listOps.rightPush(anyString(), anyString())).thenAnswer(inv -> {
            queue.addLast(inv.getArgument(1));
            return (long) queue.size();
        });
        when(listOps.leftPush(anyString(), anyString())).thenAnswer(inv -> {
            queue.addFirst(inv.getArgument(1));
            return (long) queue.size();
        });
        when(listOps.remove(anyString(), anyLong(), any())).thenAnswer(inv -> {
            queue.remove((String) inv.getArgument(2));
            return 1L;
        });
        return listOps;
    }

    // Backs opsForHash() with a real Map so save/load/removeTicket round-trip
    // through the same in-memory store the way Redis would.
    @SuppressWarnings("unchecked")
    private static HashOperations<String, Object, Object> ticketBackedHashOps(StringRedisTemplate redisTemplate, Map<String, String> tickets) {
        HashOperations<String, Object, Object> hashOps = mock(HashOperations.class);
        when(redisTemplate.opsForHash()).thenReturn(hashOps);

        when(hashOps.get(anyString(), any())).thenAnswer(inv -> tickets.get(inv.getArgument(1)));
        doAnswer(inv -> tickets.put((String) inv.getArgument(1), (String) inv.getArgument(2)))
                .when(hashOps).put(anyString(), any(), any());
        when(hashOps.delete(anyString(), any())).thenAnswer(inv -> {
            boolean removed = tickets.remove(inv.getArgument(1)) != null;
            return removed ? 1L : 0L;
        });
        return hashOps;
    }

    private static void putTicket(Map<String, String> tickets, ObjectMapper objectMapper, MatchTicket ticket) {
        try {
            tickets.put(ticket.username(), objectMapper.writeValueAsString(ticket));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static User userWith(String rank, String region) {
        User user = new User();
        user.setUsername("u");
        user.setEmail("u@example.com");
        user.setPassword("x");
        user.setRank(rank);
        user.setRegion(region);
        return user;
    }

    @Test
    void onUserDisconnectedNotifiesAndUnpairsEvenWhenDequeueFails() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        ListOperations<String, String> listOps = stubbedListOps(redisTemplate);
        when(listOps.remove(any(), anyLong(), any())).thenThrow(new RuntimeException("redis down"));

        WebSocketMessenger messenger = mock(WebSocketMessenger.class);
        MatchRegistry matchRegistry = new MatchRegistry();
        matchRegistry.pair("alice", "bob");

        ConnectionService connectionService = mock(ConnectionService.class);
        UserRepository userRepository = mock(UserRepository.class);
        ObjectMapper objectMapper = new ObjectMapper();
        CallInviteRegistry callInviteRegistry = mock(CallInviteRegistry.class);
        MatchmakingService service = new MatchmakingService(redisTemplate, messenger, matchRegistry, connectionService,
                userRepository, objectMapper, callInviteRegistry);
        service.onUserDisconnected(new UserDisconnectedEvent("alice"));

        verify(messenger).send(eq("bob"), eq("alice"), eq("peer-disconnected"), any());
        assertNull(matchRegistry.partnerOf("alice"));
        assertNull(matchRegistry.partnerOf("bob"));
    }

    @Test
    void onUserDisconnectedForUnmatchedUserJustDequeues() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        ListOperations<String, String> listOps = stubbedListOps(redisTemplate);

        WebSocketMessenger messenger = mock(WebSocketMessenger.class);
        MatchRegistry matchRegistry = new MatchRegistry();

        ConnectionService connectionService = mock(ConnectionService.class);
        UserRepository userRepository = mock(UserRepository.class);
        ObjectMapper objectMapper = new ObjectMapper();
        CallInviteRegistry callInviteRegistry = mock(CallInviteRegistry.class);
        MatchmakingService service = new MatchmakingService(redisTemplate, messenger, matchRegistry, connectionService,
                userRepository, objectMapper, callInviteRegistry);
        service.onUserDisconnected(new UserDisconnectedEvent("nobody"));

        verify(listOps).remove(eq("matchmaking:queue"), anyLong(), eq("nobody"));
        verifyNoInteractions(messenger);
    }

    @Test
    void joinWithNoPreferencesMatchesFirstWaitingUser() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        Deque<String> queue = new ArrayDeque<>();
        Map<String, String> tickets = new HashMap<>();
        queueBackedListOps(redisTemplate, queue);
        ticketBackedHashOps(redisTemplate, tickets);

        WebSocketMessenger messenger = mock(WebSocketMessenger.class);
        when(messenger.send(any(), any(), any(), any())).thenReturn(true);
        MatchRegistry matchRegistry = new MatchRegistry();
        ConnectionService connectionService = mock(ConnectionService.class);
        UserRepository userRepository = mock(UserRepository.class);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(userWith(null, null)));
        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(userWith(null, null)));
        ObjectMapper objectMapper = new ObjectMapper();
        CallInviteRegistry callInviteRegistry = mock(CallInviteRegistry.class);

        MatchmakingService service = new MatchmakingService(redisTemplate, messenger, matchRegistry, connectionService,
                userRepository, objectMapper, callInviteRegistry);

        service.join("alice", null);
        service.join("bob", null);

        assertEquals("bob", matchRegistry.partnerOf("alice"));
        assertEquals("alice", matchRegistry.partnerOf("bob"));
        assertTrue(queue.isEmpty());
    }

    @Test
    void rankRangeSkipsOutOfRangeCandidateAndRestoresItToQueue() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        Deque<String> queue = new ArrayDeque<>();
        Map<String, String> tickets = new HashMap<>();
        queueBackedListOps(redisTemplate, queue);
        ticketBackedHashOps(redisTemplate, tickets);
        ObjectMapper objectMapper = new ObjectMapper();

        WebSocketMessenger messenger = mock(WebSocketMessenger.class);
        when(messenger.send(any(), any(), any(), any())).thenReturn(true);
        MatchRegistry matchRegistry = new MatchRegistry();
        ConnectionService connectionService = mock(ConnectionService.class);
        UserRepository userRepository = mock(UserRepository.class);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(userWith(null, null)));
        when(userRepository.findByUsername("dave")).thenReturn(Optional.of(userWith(null, null)));
        CallInviteRegistry callInviteRegistry = mock(CallInviteRegistry.class);

        MatchmakingService service = new MatchmakingService(redisTemplate, messenger, matchRegistry, connectionService,
                userRepository, objectMapper, callInviteRegistry);

        // Alice joins first (queue is empty, so she's simply enqueued as the sole
        // waiting user) - this exercises join()'s real ticket-building from prefs.
        JoinQueueRequest prefs = new JoinQueueRequest();
        prefs.setRankLo("Silver");
        prefs.setRankHi("Platinum");
        service.join("alice", prefs);

        // Two candidates queue up behind her, each with their own selected rank range:
        // one that doesn't overlap alice's Silver-Platinum window, one that does.
        queue.addLast("lowRankUser");
        queue.addLast("inRangeUser");
        putTicket(tickets, objectMapper, new MatchTicket("lowRankUser", "Iron", "Bronze", List.of()));
        putTicket(tickets, objectMapper, new MatchTicket("inRangeUser", "Gold", "Diamond", List.of()));

        // Dave's join is the trigger that runs tryMatch() with alice (the longest-waiting
        // user) popped as caller, scanning lowRankUser then inRangeUser as candidates.
        service.join("dave", null);

        assertEquals("inRangeUser", matchRegistry.partnerOf("alice"));
        assertTrue(queue.contains("lowRankUser"), "non-overlapping candidate should be restored to the queue");
        assertFalse(queue.contains("inRangeUser"), "matched candidate should be removed from the queue");
    }

    @Test
    void mutualRegionMismatchPreventsMatch() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        Deque<String> queue = new ArrayDeque<>();
        Map<String, String> tickets = new HashMap<>();
        queueBackedListOps(redisTemplate, queue);
        ticketBackedHashOps(redisTemplate, tickets);
        ObjectMapper objectMapper = new ObjectMapper();

        WebSocketMessenger messenger = mock(WebSocketMessenger.class);
        when(messenger.send(any(), any(), any(), any())).thenReturn(true);
        MatchRegistry matchRegistry = new MatchRegistry();
        ConnectionService connectionService = mock(ConnectionService.class);
        UserRepository userRepository = mock(UserRepository.class);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(userWith(null, null)));
        when(userRepository.findByUsername("dave")).thenReturn(Optional.of(userWith(null, null)));
        CallInviteRegistry callInviteRegistry = mock(CallInviteRegistry.class);

        MatchmakingService service = new MatchmakingService(redisTemplate, messenger, matchRegistry, connectionService,
                userRepository, objectMapper, callInviteRegistry);

        // Alice joins first, wanting West only.
        JoinQueueRequest prefs = new JoinQueueRequest();
        prefs.setRegions(List.of("West"));
        service.join("alice", prefs);

        // Candidate wants East only - mutually incompatible with alice's West-only request.
        queue.addLast("eastOnlyUser");
        putTicket(tickets, objectMapper, new MatchTicket("eastOnlyUser", null, null, List.of("East")));

        // Dave also wants East only, so he's a genuine mismatch too rather than a
        // no-preference wildcard - his join triggers tryMatch() with alice popped as
        // caller against eastOnlyUser, then dave himself once eastOnlyUser is skipped.
        JoinQueueRequest davePrefs = new JoinQueueRequest();
        davePrefs.setRegions(List.of("East"));
        service.join("dave", davePrefs);

        assertNull(matchRegistry.partnerOf("alice"));
        assertTrue(queue.contains("eastOnlyUser"), "incompatible candidate should be restored to the queue");
        assertTrue(queue.contains("alice"), "caller should be requeued when no match is found");
    }

    @Test
    void callerWithPreferenceCanMatchCandidateWithNoPreferenceAtAll() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        Deque<String> queue = new ArrayDeque<>();
        Map<String, String> tickets = new HashMap<>();
        queueBackedListOps(redisTemplate, queue);
        ticketBackedHashOps(redisTemplate, tickets);
        ObjectMapper objectMapper = new ObjectMapper();

        WebSocketMessenger messenger = mock(WebSocketMessenger.class);
        when(messenger.send(any(), any(), any(), any())).thenReturn(true);
        MatchRegistry matchRegistry = new MatchRegistry();
        ConnectionService connectionService = mock(ConnectionService.class);
        UserRepository userRepository = mock(UserRepository.class);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(userWith(null, null)));
        when(userRepository.findByUsername("noPrefUser")).thenReturn(Optional.of(userWith(null, null)));
        CallInviteRegistry callInviteRegistry = mock(CallInviteRegistry.class);

        MatchmakingService service = new MatchmakingService(redisTemplate, messenger, matchRegistry, connectionService,
                userRepository, objectMapper, callInviteRegistry);

        // Alice joins first with a rank+region preference.
        JoinQueueRequest prefs = new JoinQueueRequest();
        prefs.setRankLo("Gold");
        prefs.setRankHi("Platinum");
        prefs.setRegions(List.of("West"));
        service.join("alice", prefs);

        // Candidate queued with quick-match (no preferences at all) - a no-preference
        // ticket is a wildcard, so it satisfies any filter regardless of what its user's
        // actual profile rank/region might be. This join triggers tryMatch() with alice
        // popped as caller against this candidate.
        service.join("noPrefUser", null);

        assertEquals("noPrefUser", matchRegistry.partnerOf("alice"));
    }

    @Test
    void overlappingSelectedRankRangesMatchRegardlessOfActualRank() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        Deque<String> queue = new ArrayDeque<>();
        Map<String, String> tickets = new HashMap<>();
        queueBackedListOps(redisTemplate, queue);
        ticketBackedHashOps(redisTemplate, tickets);

        WebSocketMessenger messenger = mock(WebSocketMessenger.class);
        when(messenger.send(any(), any(), any(), any())).thenReturn(true);
        MatchRegistry matchRegistry = new MatchRegistry();
        ConnectionService connectionService = mock(ConnectionService.class);
        UserRepository userRepository = mock(UserRepository.class);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(userWith(null, null)));
        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(userWith(null, null)));
        ObjectMapper objectMapper = new ObjectMapper();
        CallInviteRegistry callInviteRegistry = mock(CallInviteRegistry.class);

        MatchmakingService service = new MatchmakingService(redisTemplate, messenger, matchRegistry, connectionService,
                userRepository, objectMapper, callInviteRegistry);

        // Alice selects Iron only.
        JoinQueueRequest alicePrefs = new JoinQueueRequest();
        alicePrefs.setRankLo("Iron");
        alicePrefs.setRankHi("Iron");
        service.join("alice", alicePrefs);

        // Bob selects Iron-Gold, which overlaps alice's window at Iron - with nobody
        // else queued, they should match on that overlap alone, independent of either
        // account's actual profile rank (both null here).
        JoinQueueRequest bobPrefs = new JoinQueueRequest();
        bobPrefs.setRankLo("Iron");
        bobPrefs.setRankHi("Gold");
        service.join("bob", bobPrefs);

        assertEquals("bob", matchRegistry.partnerOf("alice"));
    }
}
