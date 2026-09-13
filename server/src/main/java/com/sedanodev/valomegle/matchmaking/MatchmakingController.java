package com.sedanodev.valomegle.matchmaking;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sedanodev.valomegle.matchmaking.request.JoinQueueRequest;

@RestController
@RequestMapping("/api/matchmaking")
public class MatchmakingController {

    private final MatchmakingService matchmakingService;

    public MatchmakingController(MatchmakingService matchmakingService) {
        this.matchmakingService = matchmakingService;
    }

    @PostMapping("/join")
    public ResponseEntity<Void> join(Authentication authentication, @RequestBody(required = false) JoinQueueRequest request) {
        matchmakingService.join(authentication.getName(), request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/leave")
    public ResponseEntity<Void> leave(Authentication authentication) {
        matchmakingService.leave(authentication.getName());
        return ResponseEntity.ok().build();
    }
}
