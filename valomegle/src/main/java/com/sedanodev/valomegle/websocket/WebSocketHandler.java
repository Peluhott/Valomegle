package com.sedanodev.valomegle.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.sedanodev.valomegle.service.JwtService;

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
        String payload = message.getPayload();
        ObjectMapper mapper = new ObjectMapper();
        JsonNode node = mapper.readTree(payload);

        String targetUserId = node.get("targetUserId").asText();
        String msg = node.get("message").asText();

        WebSocketSession targetSession = sessionManager.getSession(targetUserId);
        if (targetSession != null && targetSession.isOpen()) {
            targetSession.sendMessage(new TextMessage(msg));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String userId = (String) session.getAttributes().get("userId"); // just retrieve it
        if (userId != null) {
            sessionManager.removeSession(userId);
        }
    }
}
