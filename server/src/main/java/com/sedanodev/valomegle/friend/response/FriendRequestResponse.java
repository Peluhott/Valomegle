package com.sedanodev.valomegle.friend.response;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class FriendRequestResponse {
    private Long id;
    private String otherUsername;
    private Instant createdAt;
}
