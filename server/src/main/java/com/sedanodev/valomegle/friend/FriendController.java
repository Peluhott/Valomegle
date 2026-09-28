package com.sedanodev.valomegle.friend;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sedanodev.valomegle.friend.request.SendFriendRequestRequest;
import com.sedanodev.valomegle.friend.response.FriendRequestResponse;
import com.sedanodev.valomegle.friend.response.FriendResponse;

@RestController
@RequestMapping("/api/friends")
public class FriendController {

    private final FriendService friendService;

    public FriendController(FriendService friendService) {
        this.friendService = friendService;
    }

    @PostMapping("/requests")
    public ResponseEntity<Void> sendRequest(Authentication authentication, @RequestBody SendFriendRequestRequest request) {
        friendService.sendRequest(authentication.getName(), request.getUsername());
        return ResponseEntity.status(201).build();
    }

    @GetMapping("/requests/incoming")
    public ResponseEntity<List<FriendRequestResponse>> listIncoming(Authentication authentication) {
        return ResponseEntity.ok(friendService.listIncoming(authentication.getName()));
    }

    @GetMapping("/requests/outgoing")
    public ResponseEntity<List<FriendRequestResponse>> listOutgoing(Authentication authentication) {
        return ResponseEntity.ok(friendService.listOutgoing(authentication.getName()));
    }

    @PostMapping("/requests/{id}/accept")
    public ResponseEntity<Void> accept(Authentication authentication, @PathVariable Long id) {
        friendService.accept(authentication.getName(), id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/requests/{id}/decline")
    public ResponseEntity<Void> decline(Authentication authentication, @PathVariable Long id) {
        friendService.decline(authentication.getName(), id);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<List<FriendResponse>> listFriends(Authentication authentication) {
        return ResponseEntity.ok(friendService.listFriends(authentication.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> unfriend(Authentication authentication, @PathVariable Long id) {
        friendService.unfriend(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }
}
