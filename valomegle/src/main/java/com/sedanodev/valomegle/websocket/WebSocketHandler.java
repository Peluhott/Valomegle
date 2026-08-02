package com.sedanodev.valomegle.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.sedanodev.valomegle.security.JwtService;

@Component
public class WebSocketHandler extends TextWebSocketHandler {

    private final WebSocketSessionManager sessionManager;
    private final JwtService jwtUtil;

    public WebSocketHandler(WebSocketSessionManager sessionManager, JwtService jwtUtil) {
        this.sessionManager = sessionManager;
        this.jwtUtil = jwtUtil;
    }

    @Override

    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String query = session.getUri().getQuery();
        if (query == null || !query.contains("token=")) {
            session.close();
            return;
        }
        String token = query.replace("token=", "");
        String userId = jwtUtil.extractUsername(token);
        session.getAttributes().put("userId", userId); // store it here
        sessionManager.addSession(userId, session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode node = mapper.readTree(message.getPayload());

        String fromUserId = (String) session.getAttributes().get("userId");
        String targetUserId = node.get("targetUserId").asText();
        String type = node.get("type").asText();
        JsonNode signalPayload = node.get("payload");

        relay(fromUserId, targetUserId, type, signalPayload);
    }

    private void relay(String fromUserId, String targetUserId, String type, JsonNode signalPayload) throws Exception {
        WebSocketSession targetSession = sessionManager.getSession(targetUserId);
        if (targetSession == null || !targetSession.isOpen()) {
            return;
        }

        ObjectMapper mapper = new ObjectMapper();
        ObjectNode outgoing = mapper.createObjectNode();
        outgoing.put("fromUserId", fromUserId);
        outgoing.put("type", type);
        outgoing.set("payload", signalPayload);

        targetSession.sendMessage(new TextMessage(mapper.writeValueAsString(outgoing)));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String userId = (String) session.getAttributes().get("userId"); // just retrieve it
        if (userId != null) {
            sessionManager.removeSession(userId);
        }
    }
}
