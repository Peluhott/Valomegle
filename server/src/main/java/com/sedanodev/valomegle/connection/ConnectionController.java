package com.sedanodev.valomegle.connection;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sedanodev.valomegle.connection.response.RecentMatchResponse;

@RestController
@RequestMapping("/api/connections")
public class ConnectionController {

    private final ConnectionService connectionService;

    public ConnectionController(ConnectionService connectionService) {
        this.connectionService = connectionService;
    }

    @GetMapping("/recent")
    public ResponseEntity<List<RecentMatchResponse>> getRecentMatches(Authentication authentication) {
        return ResponseEntity.ok(connectionService.getRecentMatches(authentication.getName()));
    }
}
