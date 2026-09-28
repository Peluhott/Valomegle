package com.sedanodev.valomegle.friend;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.sedanodev.valomegle.friend.exception.FriendActionNotAllowedException;
import com.sedanodev.valomegle.friend.exception.FriendRequestNotFoundException;

@RestControllerAdvice(assignableTypes = FriendController.class)
public class FriendExceptionHandler {

    @ExceptionHandler(FriendRequestNotFoundException.class)
    public ResponseEntity<String> handleFriendRequestNotFound(FriendRequestNotFoundException e) {
        return ResponseEntity.status(404).body(e.getMessage());
    }

    @ExceptionHandler(FriendActionNotAllowedException.class)
    public ResponseEntity<String> handleFriendActionNotAllowed(FriendActionNotAllowedException e) {
        return ResponseEntity.status(400).body(e.getMessage());
    }
}
