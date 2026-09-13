package com.sedanodev.valomegle.matchmaking;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sedanodev.valomegle.call.CallInviteRegistry;
import com.sedanodev.valomegle.connection.ConnectionService;
import com.sedanodev.valomegle.match.MatchRegistry;
import com.sedanodev.valomegle.match.UserDisconnectedEvent;
import com.sedanodev.valomegle.matchmaking.request.JoinQueueRequest;
import com.sedanodev.valomegle.user.RankOrder;
import com.sedanodev.valomegle.user.UserRepository;
import com.sedanodev.valomegle.user.UserService;
import com.sedanodev.valomegle.user.exception.UserNotFoundException;
import com.sedanodev.valomegle.websocket.WebSocketMessenger;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class MatchmakingService {

    private static final String QUEUE_KEY = "matchmaking:queue";
    private static final String TICKETS_KEY = "matchmaking:tickets";

    private final StringRedisTemplate redisTemplate;
    private final WebSocketMessenger messenger;
    private final MatchRegistry matchRegistry;
    private final ConnectionService connectionService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final CallInviteRegistry callInviteRegistry;

    public MatchmakingService(StringRedisTemplate redisTemplate, WebSocketMessenger messenger,
            MatchRegistry matchRegistry, ConnectionService connectionService, UserRepository userRepository,
            ObjectMapper objectMapper, CallInviteRegistry callInviteRegistry) {
        this.redisTemplate = redisTemplate;
        this.messenger = messenger;
        this.matchRegistry = matchRegistry;
        this.connectionService = connectionService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.callInviteRegistry = callInviteRegistry;
    }

    public void join(String userId, JoinQueueRequest prefs) {
        validate(prefs);

        if (matchRegistry.partnerOf(userId) != null) {
            throw new IllegalArgumentException("You are already in a call");
        }
        if (callInviteRegistry.hasPendingInvite(userId)) {
            throw new IllegalArgumentException("You already have a pending call invite");
        }

        userRepository.findByUsername(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        MatchTicket ticket = new MatchTicket(
                userId,
                prefs != null ? prefs.getRankLo() : null,
                prefs != null ? prefs.getRankHi() : null,
                prefs != null && prefs.getRegions() != null ? prefs.getRegions() : List.of());
        saveTicket(ticket);

        redisTemplate.opsForList().remove(QUEUE_KEY, 0, userId);
        redisTemplate.opsForList().rightPush(QUEUE_KEY, userId);
        log.info("User joined matchmaking queue: {}", userId);

        tryMatch();
    }

    public void leave(String userId) {
        redisTemplate.opsForList().remove(QUEUE_KEY, 0, userId);
        removeTicket(userId);
        log.info("User left matchmaking queue: {}", userId);
    }

    // Used by the call feature to keep a queued user from also placing/receiving a
    // direct call invite. Backed by the ticket hash rather than scanning the queue
    // list, since join()/leave() already keep the two in sync with each other.
    public boolean isInQueue(String userId) {
        return Boolean.TRUE.equals(redisTemplate.opsForHash().hasKey(TICKETS_KEY, userId));
    }

    // rankLo/rankHi must be either both present (a valid, ordered range) or both
    // absent; regions, if given, must all be recognized region names.
    private void validate(JoinQueueRequest prefs) {
        if (prefs == null) {
            return;
        }

        if (prefs.getRankLo() != null || prefs.getRankHi() != null) {
            int loIdx = RankOrder.indexOf(prefs.getRankLo());
            int hiIdx = RankOrder.indexOf(prefs.getRankHi());
            if (loIdx < 0 || hiIdx < 0) {
                throw new IllegalArgumentException("Invalid rank range: " + prefs.getRankLo() + " - " + prefs.getRankHi());
            }
            if (loIdx > hiIdx) {
                throw new IllegalArgumentException("rankLo must not be higher than rankHi");
            }
        }

        if (prefs.getRegions() != null) {
            for (String region : prefs.getRegions()) {
                if (!UserService.VALID_REGIONS.contains(region)) {
                    throw new IllegalArgumentException("Invalid region: " + region);
                }
            }
        }
    }

    private void saveTicket(MatchTicket ticket) {
        try {
            redisTemplate.opsForHash().put(TICKETS_KEY, ticket.username(), objectMapper.writeValueAsString(ticket));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize match ticket", e);
        }
    }

    private MatchTicket loadTicket(String userId) {
        Object raw = redisTemplate.opsForHash().get(TICKETS_KEY, userId);
        if (raw == null) {
            // No ticket on record (shouldn't normally happen for someone still in the
            // queue list) — treat as "no preference" rather than failing the match.
            return new MatchTicket(userId, null, null, List.of());
        }
        try {
            return objectMapper.readValue((String) raw, MatchTicket.class);
        } catch (JsonProcessingException e) {
            log.warn("Failed to deserialize match ticket for {}: {}", userId, e.getMessage());
            return new MatchTicket(userId, null, null, List.of());
        }
    }

    private void removeTicket(String userId) {
        redisTemplate.opsForHash().delete(TICKETS_KEY, userId);
    }

    private boolean compatible(MatchTicket a, MatchTicket b) {
        return regionsCompatible(a, b) && ranksCompatible(a, b);
    }

    // Compatibility is judged purely by what each side selected, never by either
    // user's actual profile rank/region - a no-preference side is a wildcard that
    // accepts anyone, matching how "no preference" already behaves for outgoing
    // filtering below.
    private boolean regionsCompatible(MatchTicket a, MatchTicket b) {
        return a.regions().isEmpty() || b.regions().isEmpty()
                || a.regions().stream().anyMatch(b.regions()::contains);
    }

    private boolean ranksCompatible(MatchTicket a, MatchTicket b) {
        int aLo = a.rankLo() != null ? RankOrder.indexOf(a.rankLo()) : 0;
        int aHi = a.rankHi() != null ? RankOrder.indexOf(a.rankHi()) : RankOrder.ORDER.size() - 1;
        int bLo = b.rankLo() != null ? RankOrder.indexOf(b.rankLo()) : 0;
        int bHi = b.rankHi() != null ? RankOrder.indexOf(b.rankHi()) : RankOrder.ORDER.size() - 1;
        return aLo <= bHi && bLo <= aHi;
    }

    // MVP simplification: each join() triggers at most one match check, so if 3+ users are ever
    // queued simultaneously, only the earliest two (still-reachable) ones match per join event.
    // Fine for the 2-user manual test this targets, not a real concurrent-load design.
    //
    // onUserDisconnected() dequeues on a clean socket close, but an unclean drop (killed process,
    // network loss before the close frame) can still leave a dead entry in the queue. We don't
    // detect that until we try to deliver to it - messenger.send()'s return value IS the liveness
    // check, there's no separate way to peek at it - so the caller slot is retried with fresh
    // candidates (discarding dead ones) until we find one we can actually reach, or the queue runs
    // dry. The callee is only ever notified once the caller is confirmed reachable, so a stale
    // caller entry can no longer produce a "matched with a peer who was never there" notification
    // on the callee's side.
    //
    // The candidate scan is also bounded and single-pass per join() call: it snapshots the queue
    // length up front and considers at most that many candidates, skipping (and restoring)
    // incompatible ones rather than looping indefinitely looking for a compatible match.
    private void tryMatch() {
        String callerId = redisTemplate.opsForList().leftPop(QUEUE_KEY);
        if (callerId == null) {
            return;
        }

        MatchTicket callerTicket = loadTicket(callerId);
        // Snapshot the queue length up front so this scan is bounded even though it's
        // popping and (for incompatible entries) pushing candidates back — the queue
        // only shrinks during the loop itself, it can't grow from *this* call.
        long scanLimit = redisTemplate.opsForList().size(QUEUE_KEY);
        List<String> incompatible = new ArrayList<>();
        String calleeId = null;

        for (long i = 0; i < scanLimit; i++) {
            String candidateId = redisTemplate.opsForList().leftPop(QUEUE_KEY);
            if (candidateId == null) {
                break;
            }

            MatchTicket candidateTicket = loadTicket(candidateId);
            if (!compatible(callerTicket, candidateTicket)) {
                incompatible.add(candidateId);
                continue;
            }

            if (messenger.send(callerId, candidateId, "queue-matched", Map.of("role", "caller"))) {
                calleeId = candidateId;
                break;
            }
            log.debug("Discarding unreachable queue entry: {}", candidateId);
            // Dead session — matches today's behavior of not requeueing it.
        }

        // Restore skipped-but-incompatible candidates to the front, in their original
        // relative order, so a narrow preference doesn't get starved behind new arrivals.
        for (int i = incompatible.size() - 1; i >= 0; i--) {
            redisTemplate.opsForList().leftPush(QUEUE_KEY, incompatible.get(i));
        }

        if (calleeId == null) {
            redisTemplate.opsForList().rightPush(QUEUE_KEY, callerId);
            return;
        }

        messenger.send(calleeId, callerId, "queue-matched", Map.of("role", "callee"));
        log.info("Matched users {} (caller) and {} (callee)", callerId, calleeId);
        matchRegistry.pair(callerId, calleeId);
        removeTicket(callerId);
        removeTicket(calleeId);

        try {
            connectionService.recordMatch(callerId, calleeId);
        } catch (Exception e) {
            log.warn("Failed to record match history for {} and {}: {}", callerId, calleeId, e.getMessage());
        }
    }

    // Tell the dropped user's partner the peer is gone, then dequeue them. The partner
    // notify + unpair run first so a Redis failure in leave() can't skip them.
    @EventListener
    public void onUserDisconnected(UserDisconnectedEvent event) {
        String userId = event.userId();

        String partnerId = matchRegistry.partnerOf(userId);
        if (partnerId != null) {
            matchRegistry.unpair(userId);
            messenger.send(partnerId, userId, "peer-disconnected", Map.of());
        }

        try {
            leave(userId);
        } catch (Exception e) {
            log.warn("Failed to dequeue disconnected user {}: {}", userId, e.getMessage());
        }
    }
}
