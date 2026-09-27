package com.sedanodev.valomegle.websocket;

import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.PongMessage;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.sedanodev.valomegle.match.MatchRegistry;
import com.sedanodev.valomegle.match.UserDisconnectedEvent;

@Slf4j
@Component
public class WebSocketHandler extends TextWebSocketHandler {

    private static final int SEND_TIME_LIMIT_MS = 10_000;
    private static final int SEND_BUFFER_LIMIT_BYTES = 512 * 1024;

    private final WebSocketSessionManager sessionManager;
    private final WebSocketMessenger messenger;
    private final ObjectMapper objectMapper;
    private final MatchRegistry matchRegistry;
    private final ApplicationEventPublisher eventPublisher;

    public WebSocketHandler(WebSocketSessionManager sessionManager, WebSocketMessenger messenger, ObjectMapper objectMapper, MatchRegistry matchRegistry, ApplicationEventPublisher eventPublisher) {
        this.sessionManager = sessionManager;
        this.messenger = messenger;
        this.objectMapper = objectMapper;
        this.matchRegistry = matchRegistry;
        this.eventPublisher = eventPublisher;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String userId = (String) session.getAttributes().get("userId");
        if (userId == null) {
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        session.getAttributes().put(WebSocketHeartbeat.LAST_PONG_ATTRIBUTE, System.currentTimeMillis());
        // The heartbeat thread sends pings alongside request threads relaying frames,
        // and a raw Tomcat session throws on concurrent sends.
        sessionManager.addSession(userId,
                new ConcurrentWebSocketSessionDecorator(session, SEND_TIME_LIMIT_MS, SEND_BUFFER_LIMIT_BYTES));
    }

    @Override
    protected void handlePongMessage(WebSocketSession session, PongMessage message) {
        session.getAttributes().put(WebSocketHeartbeat.LAST_PONG_ATTRIBUTE, System.currentTimeMillis());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String fromUserId = (String) session.getAttributes().get("userId");

        // Frame size is already bounded before this runs: Tomcat's default 8 KB text
        // buffer closes the session (code 1009) on anything larger, which comfortably
        // fits signaling frames (SDP offers/answers, trickled ICE candidates).
        JsonNode node;
        try {
            node = objectMapper.readTree(message.getPayload());
        } catch (Exception e) {
            log.debug("Dropped frame from {}: malformed JSON", fromUserId);
            messenger.send(fromUserId, "server", "error", Map.of("reason", "malformed-frame"));
            return;
        }

        if (!node.hasNonNull("type") || !node.hasNonNull("payload")) {
            log.debug("Dropped frame from {}: missing required field", fromUserId);
            messenger.send(fromUserId, "server", "error", Map.of("reason", "malformed-frame"));
            return;
        }

        String type = node.get("type").asText();
        JsonNode signalPayload = node.get("payload");

        String partnerId = matchRegistry.partnerOf(fromUserId);
        if (partnerId == null) {
            log.debug("Dropped frame from {}: no active match", fromUserId);
            messenger.send(fromUserId, "server", "error", Map.of("reason", "no-active-match"));
            return;
        }

        messenger.send(partnerId, fromUserId, type, signalPayload);
        if ("webrtc-hangup".equals(type)) {
            matchRegistry.unpair(fromUserId);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String userId = (String) session.getAttributes().get("userId");
        if (userId != null && sessionManager.removeSession(userId, session)) {
            eventPublisher.publishEvent(new UserDisconnectedEvent(userId));
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.error("WebSocket transport error for {}", session.getAttributes().get("userId"), exception);
    }
}
