package com.sedanodev.valomegle.call;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sedanodev.valomegle.call.request.CallInviteRequest;

@RestController
@RequestMapping("/api/calls")
public class CallController {

    private final CallService callService;

    public CallController(CallService callService) {
        this.callService = callService;
    }

    @PostMapping("/invite")
    public ResponseEntity<Void> invite(Authentication authentication, @RequestBody CallInviteRequest request) {
        callService.invite(authentication.getName(), request.getTargetUsername());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/accept")
    public ResponseEntity<Void> accept(Authentication authentication) {
        callService.accept(authentication.getName());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/decline")
    public ResponseEntity<Void> decline(Authentication authentication) {
        callService.decline(authentication.getName());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/cancel")
    public ResponseEntity<Void> cancel(Authentication authentication) {
        callService.cancel(authentication.getName());
        return ResponseEntity.ok().build();
    }
}
