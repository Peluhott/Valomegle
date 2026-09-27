package com.sedanodev.valomegle.matchmaking;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
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

    // Backs opsForList() with a real Deque so matchNewcomer()'s range/remove/push
    // sequences behave like an actual FIFO instead of stubbed one-shot returns.
    @SuppressWarnings("unchecked")
    private static ListOperations<String, String> queueBackedListOps(StringRedisTemplate redisTemplate, Deque<String> queue) {
        ListOperations<String, String> listOps = mock(ListOperations.class);
        when(redisTemplate.opsForList()).thenReturn(listOps);

        when(listOps.range(anyString(), anyLong(), anyLong())).thenAnswer(inv -> List.copyOf(queue));
        when(listOps.rightPush(anyString(), anyString())).thenAnswer(inv -> {
            queue.addLast(inv.getArgument(1));
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
        when(messenger.isOnline(any())).thenReturn(true);
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
    void newcomerSkipsOutOfRangeHeadAndMatchesNextCompatibleCandidate() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        Deque<String> queue = new ArrayDeque<>();
        Map<String, String> tickets = new HashMap<>();
        queueBackedListOps(redisTemplate, queue);
        ticketBackedHashOps(redisTemplate, tickets);
        ObjectMapper objectMapper = new ObjectMapper();

        WebSocketMessenger messenger = mock(WebSocketMessenger.class);
        when(messenger.send(any(), any(), any(), any())).thenReturn(true);
        when(messenger.isOnline(any())).thenReturn(true);
        MatchRegistry matchRegistry = new MatchRegistry();
        ConnectionService connectionService = mock(ConnectionService.class);
        UserRepository userRepository = mock(UserRepository.class);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(userWith(null, null)));
        CallInviteRegistry callInviteRegistry = mock(CallInviteRegistry.class);

        MatchmakingService service = new MatchmakingService(redisTemplate, messenger, matchRegistry, connectionService,
                userRepository, objectMapper, callInviteRegistry);

        // Two users already waiting: the head's range doesn't overlap alice's
        // Silver-Platinum window, the one behind it does.
        queue.addLast("lowRankUser");
        queue.addLast("inRangeUser");
        putTicket(tickets, objectMapper, new MatchTicket("lowRankUser", "Iron", "Bronze", List.of()));
        putTicket(tickets, objectMapper, new MatchTicket("inRangeUser", "Gold", "Diamond", List.of()));

        JoinQueueRequest prefs = new JoinQueueRequest();
        prefs.setRankLo("Silver");
        prefs.setRankHi("Platinum");
        service.join("alice", prefs);

        assertEquals("inRangeUser", matchRegistry.partnerOf("alice"));
        assertEquals(List.of("lowRankUser"), List.copyOf(queue), "non-overlapping head should keep its place");
        verify(messenger).send(eq("inRangeUser"), eq("alice"), eq("queue-matched"), eq(Map.of("role", "caller")));
        verify(messenger).send(eq("alice"), eq("inRangeUser"), eq("queue-matched"), eq(Map.of("role", "callee")));
    }

    @Test
    void mutualRegionMismatchLeavesBothQueuedInArrivalOrder() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        Deque<String> queue = new ArrayDeque<>();
        Map<String, String> tickets = new HashMap<>();
        queueBackedListOps(redisTemplate, queue);
        ticketBackedHashOps(redisTemplate, tickets);
        ObjectMapper objectMapper = new ObjectMapper();

        WebSocketMessenger messenger = mock(WebSocketMessenger.class);
        when(messenger.send(any(), any(), any(), any())).thenReturn(true);
        when(messenger.isOnline(any())).thenReturn(true);
        MatchRegistry matchRegistry = new MatchRegistry();
        ConnectionService connectionService = mock(ConnectionService.class);
        UserRepository userRepository = mock(UserRepository.class);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(userWith(null, null)));
        when(userRepository.findByUsername("dave")).thenReturn(Optional.of(userWith(null, null)));
        CallInviteRegistry callInviteRegistry = mock(CallInviteRegistry.class);

        MatchmakingService service = new MatchmakingService(redisTemplate, messenger, matchRegistry, connectionService,
                userRepository, objectMapper, callInviteRegistry);

        JoinQueueRequest alicePrefs = new JoinQueueRequest();
        alicePrefs.setRegions(List.of("West"));
        service.join("alice", alicePrefs);

        JoinQueueRequest davePrefs = new JoinQueueRequest();
        davePrefs.setRegions(List.of("East"));
        service.join("dave", davePrefs);

        assertNull(matchRegistry.partnerOf("alice"));
        assertEquals(List.of("alice", "dave"), List.copyOf(queue));
    }

    @Test
    void unreachableCandidateIsDiscardedAndNextOneMatched() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        Deque<String> queue = new ArrayDeque<>();
        Map<String, String> tickets = new HashMap<>();
        queueBackedListOps(redisTemplate, queue);
        ticketBackedHashOps(redisTemplate, tickets);
        ObjectMapper objectMapper = new ObjectMapper();

        WebSocketMessenger messenger = mock(WebSocketMessenger.class);
        when(messenger.send(any(), any(), any(), any())).thenReturn(true);
        when(messenger.send(eq("ghost"), any(), any(), any())).thenReturn(false);
        when(messenger.isOnline(any())).thenReturn(true);
        MatchRegistry matchRegistry = new MatchRegistry();
        ConnectionService connectionService = mock(ConnectionService.class);
        UserRepository userRepository = mock(UserRepository.class);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(userWith(null, null)));
        CallInviteRegistry callInviteRegistry = mock(CallInviteRegistry.class);

        MatchmakingService service = new MatchmakingService(redisTemplate, messenger, matchRegistry, connectionService,
                userRepository, objectMapper, callInviteRegistry);

        queue.addLast("ghost");
        queue.addLast("bob");
        putTicket(tickets, objectMapper, new MatchTicket("ghost", null, null, List.of()));
        putTicket(tickets, objectMapper, new MatchTicket("bob", null, null, List.of()));

        service.join("alice", null);

        assertEquals("bob", matchRegistry.partnerOf("alice"));
        assertTrue(queue.isEmpty());
        assertFalse(tickets.containsKey("ghost"), "dead entry's ticket should be discarded");
    }

    @Test
    void unreachableNewcomerTellsCallerTheMatchFellThrough() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        Deque<String> queue = new ArrayDeque<>();
        Map<String, String> tickets = new HashMap<>();
        queueBackedListOps(redisTemplate, queue);
        ticketBackedHashOps(redisTemplate, tickets);
        ObjectMapper objectMapper = new ObjectMapper();

        WebSocketMessenger messenger = mock(WebSocketMessenger.class);
        when(messenger.send(any(), any(), any(), any())).thenReturn(true);
        when(messenger.send(eq("alice"), any(), any(), any())).thenReturn(false);
        when(messenger.isOnline(any())).thenReturn(true);
        MatchRegistry matchRegistry = new MatchRegistry();
        ConnectionService connectionService = mock(ConnectionService.class);
        UserRepository userRepository = mock(UserRepository.class);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(userWith(null, null)));
        CallInviteRegistry callInviteRegistry = mock(CallInviteRegistry.class);

        MatchmakingService service = new MatchmakingService(redisTemplate, messenger, matchRegistry, connectionService,
                userRepository, objectMapper, callInviteRegistry);

        queue.addLast("bob");
        putTicket(tickets, objectMapper, new MatchTicket("bob", null, null, List.of()));

        service.join("alice", null);

        verify(messenger).send(eq("bob"), eq("alice"), eq("peer-disconnected"), any());
        assertNull(matchRegistry.partnerOf("bob"));
        assertTrue(tickets.isEmpty());
        verifyNoInteractions(connectionService);
    }

    @Test
    void joinWithoutOpenSocketIsRejected() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        WebSocketMessenger messenger = mock(WebSocketMessenger.class);
        when(messenger.isOnline("alice")).thenReturn(false);
        CallInviteRegistry callInviteRegistry = mock(CallInviteRegistry.class);

        MatchmakingService service = new MatchmakingService(redisTemplate, messenger, new MatchRegistry(),
                mock(ConnectionService.class), mock(UserRepository.class), new ObjectMapper(), callInviteRegistry);

        assertThrows(IllegalArgumentException.class, () -> service.join("alice", null));
        verifyNoInteractions(redisTemplate);
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
        when(messenger.isOnline(any())).thenReturn(true);
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
        // actual profile rank/region might be.
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
        when(messenger.isOnline(any())).thenReturn(true);
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
