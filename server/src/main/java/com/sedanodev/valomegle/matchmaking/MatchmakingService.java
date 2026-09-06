package com.sedanodev.valomegle.matchmaking;

import java.util.Map;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.sedanodev.valomegle.websocket.WebSocketMessenger;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class MatchmakingService {

    private static final String QUEUE_KEY = "matchmaking:queue";

    private final StringRedisTemplate redisTemplate;
    private final WebSocketMessenger messenger;

    public MatchmakingService(StringRedisTemplate redisTemplate, WebSocketMessenger messenger) {
        this.redisTemplate = redisTemplate;
        this.messenger = messenger;
    }

    public void join(String userId) {
        redisTemplate.opsForList().remove(QUEUE_KEY, 0, userId);
        redisTemplate.opsForList().rightPush(QUEUE_KEY, userId);
        log.info("User joined matchmaking queue: {}", userId);

        tryMatch();
    }

    public void leave(String userId) {
        redisTemplate.opsForList().remove(QUEUE_KEY, 0, userId);
        log.info("User left matchmaking queue: {}", userId);
    }

    // MVP simplification: each join() triggers at most one match check, so if 3+ users are ever
    // queued simultaneously, only the earliest two (still-reachable) ones match per join event.
    // Fine for the 2-user manual test this targets, not a real concurrent-load design.
    //
    // There's no dequeue-on-disconnect (wiring it from WebSocketHandler would create a
    // matchmaking<->websocket package cycle), so a closed tab/refresh can leave a dead entry
    // sitting in the queue indefinitely. We don't detect that until we try to deliver to it -
    // messenger.send()'s return value IS the liveness check, there's no separate way to peek at
    // it - so the caller slot is retried with fresh candidates (discarding dead ones) until we
    // find one we can actually reach, or the queue runs dry. The callee is only ever notified
    // once the caller is confirmed reachable, so a stale caller entry can no longer produce a
    // "matched with a peer who was never there" notification on the callee's side.
    private void tryMatch() {
        String callerId = redisTemplate.opsForList().leftPop(QUEUE_KEY);
        if (callerId == null) {
            return;
        }

        String calleeId = redisTemplate.opsForList().leftPop(QUEUE_KEY);
        if (calleeId == null) {
            redisTemplate.opsForList().leftPush(QUEUE_KEY, callerId);
            return;
        }

        boolean callerSent = messenger.send(callerId, calleeId, "queue-matched", Map.of("role", "caller"));
        while (!callerSent) {
            log.debug("Discarding unreachable queue entry: {}", callerId);
            callerId = redisTemplate.opsForList().leftPop(QUEUE_KEY);
            if (callerId == null) {
                redisTemplate.opsForList().leftPush(QUEUE_KEY, calleeId);
                return;
            }
            callerSent = messenger.send(callerId, calleeId, "queue-matched", Map.of("role", "caller"));
        }

        messenger.send(calleeId, callerId, "queue-matched", Map.of("role", "callee"));
        log.info("Matched users {} (caller) and {} (callee)", callerId, calleeId);
    }
}
