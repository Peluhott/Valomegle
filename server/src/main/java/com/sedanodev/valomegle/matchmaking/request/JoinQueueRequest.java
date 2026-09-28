package com.sedanodev.valomegle.matchmaking.request;

import java.util.List;

import lombok.Data;

@Data
public class JoinQueueRequest {
    private String rankLo;
    private String rankHi;
    private List<String> regions;
}
