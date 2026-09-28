package com.sedanodev.valomegle.call;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.sedanodev.valomegle.call.exception.CallNoPendingInviteException;
import com.sedanodev.valomegle.call.exception.CallNotFriendsException;
import com.sedanodev.valomegle.call.exception.CallTargetUnreachableException;
import com.sedanodev.valomegle.call.exception.CallUserBusyException;

@RestControllerAdvice(assignableTypes = CallController.class)
public class CallExceptionHandler {

    @ExceptionHandler(CallNotFriendsException.class)
    public ResponseEntity<String> handleNotFriends(CallNotFriendsException e) {
        return ResponseEntity.status(400).body(e.getMessage());
    }

    @ExceptionHandler(CallTargetUnreachableException.class)
    public ResponseEntity<String> handleTargetUnreachable(CallTargetUnreachableException e) {
        return ResponseEntity.status(409).body(e.getMessage());
    }

    @ExceptionHandler(CallUserBusyException.class)
    public ResponseEntity<String> handleUserBusy(CallUserBusyException e) {
        return ResponseEntity.status(409).body(e.getMessage());
    }

    @ExceptionHandler(CallNoPendingInviteException.class)
    public ResponseEntity<String> handleNoPendingInvite(CallNoPendingInviteException e) {
        return ResponseEntity.status(409).body(e.getMessage());
    }
}
