package com.sedanodev.valomegle.websocket;

import java.io.IOException;
import java.nio.ByteBuffer;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.PingMessage;
import org.springframework.web.socket.WebSocketSession;

import lombok.extern.slf4j.Slf4j;

// Detects sockets that died without a close frame (killed tab, network loss, laptop
// sleep). Browsers answer pings automatically; a session with no pong within
// PONG_TIMEOUT_MS is closed, which fires the normal disconnect cleanup.
@Slf4j
@Component
public class WebSocketHeartbeat {

    public static final String LAST_PONG_ATTRIBUTE = "lastPong";
    private static final long PING_INTERVAL_MS = 25_000;
    private static final long PONG_TIMEOUT_MS = 60_000;

    private final WebSocketSessionManager sessionManager;

    public WebSocketHeartbeat(WebSocketSessionManager sessionManager) {
        this.sessionManager = sessionManager;
    }

    @Scheduled(fixedRate = PING_INTERVAL_MS)
    public void pingAll() {
        long now = System.currentTimeMillis();
        for (WebSocketSession session : sessionManager.allSessions()) {
            if (!session.isOpen()) {
                continue;
            }
            Object lastPong = session.getAttributes().get(LAST_PONG_ATTRIBUTE);
            try {
                if (lastPong instanceof Long last && now - last > PONG_TIMEOUT_MS) {
                    log.info("Closing unresponsive WebSocket for {}", session.getAttributes().get("userId"));
                    session.close(CloseStatus.SESSION_NOT_RELIABLE);
                } else {
                    session.sendMessage(new PingMessage(ByteBuffer.allocate(0)));
                }
            } catch (IOException | RuntimeException e) {
                log.warn("Heartbeat failed for {}: {}", session.getAttributes().get("userId"), e.getMessage());
            }
        }
    }
}
