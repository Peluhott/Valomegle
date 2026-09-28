package com.sedanodev.valomegle.websocket;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;

class WebSocketSessionManagerTest {

    private static WebSocketSession sessionWithId(String id) {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn(id);
        return session;
    }

    @Test
    void removeSessionMatchesRawSessionAgainstStoredDecorator() {
        WebSocketSessionManager manager = new WebSocketSessionManager();
        WebSocketSession raw = sessionWithId("s1");
        manager.addSession("alice", new ConcurrentWebSocketSessionDecorator(raw, 1000, 1024));

        Assertions.assertTrue(manager.removeSession("alice", raw));
        Assertions.assertNull(manager.getSession("alice"));
    }

    @Test
    void removeSessionKeepsNewerReplacementSession() {
        WebSocketSessionManager manager = new WebSocketSessionManager();
        WebSocketSession old = sessionWithId("s1");
        WebSocketSession replacement = sessionWithId("s2");
        manager.addSession("alice", old);
        manager.addSession("alice", replacement);

        Assertions.assertFalse(manager.removeSession("alice", old));
        Assertions.assertSame(replacement, manager.getSession("alice"));
    }
}
