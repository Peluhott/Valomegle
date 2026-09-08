package com.sedanodev.valomegle.matchmaking;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

import com.sedanodev.valomegle.match.MatchRegistry;
import com.sedanodev.valomegle.match.UserDisconnectedEvent;
import com.sedanodev.valomegle.websocket.WebSocketMessenger;

class MatchmakingServiceTest {

    @SuppressWarnings("unchecked")
    private static ListOperations<String, String> stubbedListOps(StringRedisTemplate redisTemplate) {
        ListOperations<String, String> listOps = mock(ListOperations.class);
        when(redisTemplate.opsForList()).thenReturn(listOps);
        return listOps;
    }

    @Test
    void onUserDisconnectedNotifiesAndUnpairsEvenWhenDequeueFails() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        ListOperations<String, String> listOps = stubbedListOps(redisTemplate);
        when(listOps.remove(any(), anyLong(), any())).thenThrow(new RuntimeException("redis down"));

        WebSocketMessenger messenger = mock(WebSocketMessenger.class);
        MatchRegistry matchRegistry = new MatchRegistry();
        matchRegistry.pair("alice", "bob");

        MatchmakingService service = new MatchmakingService(redisTemplate, messenger, matchRegistry);
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

        MatchmakingService service = new MatchmakingService(redisTemplate, messenger, matchRegistry);
        service.onUserDisconnected(new UserDisconnectedEvent("nobody"));

        verify(listOps).remove(eq("matchmaking:queue"), anyLong(), eq("nobody"));
        verifyNoInteractions(messenger);
    }
}
