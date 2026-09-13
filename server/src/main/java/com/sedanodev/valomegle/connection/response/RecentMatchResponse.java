package com.sedanodev.valomegle.connection.response;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RecentMatchResponse {
    private String username;
    private Instant matchedAt;
}
