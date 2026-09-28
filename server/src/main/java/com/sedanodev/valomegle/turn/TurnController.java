package com.sedanodev.valomegle.turn;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sedanodev.valomegle.turn.response.TurnCredentialsResponse;

@RestController
@RequestMapping("/api/turn")
public class TurnController {

    private final TurnCredentialService turnCredentialService;

    public TurnController(TurnCredentialService turnCredentialService) {
        this.turnCredentialService = turnCredentialService;
    }

    @GetMapping("/credentials")
    public ResponseEntity<TurnCredentialsResponse> credentials(Authentication authentication) {
        return ResponseEntity.ok(turnCredentialService.generateCredentials(authentication.getName()));
    }
}
