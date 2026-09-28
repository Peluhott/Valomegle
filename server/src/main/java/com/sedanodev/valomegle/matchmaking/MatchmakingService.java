package com.sedanodev.valomegle.matchmaking;

import java.util.List;
import java.util.Map;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.dao.DataAccessException;
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
    private final Object queueLock = new Object();

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
        // Match notifications go over the socket, so queueing without one would leave
        // a ticket nobody can ever be told about.
        if (!messenger.isOnline(userId)) {
            throw new IllegalArgumentException("Not connected - refresh and try again");
        }

        userRepository.findByUsername(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        MatchTicket ticket = new MatchTicket(
                userId,
                prefs != null ? prefs.getRankLo() : null,
                prefs != null ? prefs.getRankHi() : null,
                prefs != null && prefs.getRegions() != null ? prefs.getRegions() : List.of());

        synchronized (queueLock) {
            redisTemplate.opsForList().remove(QUEUE_KEY, 0, userId);
            saveTicket(ticket);
            log.info("User joined matchmaking queue: {}", userId);
            matchNewcomer(ticket);
        }
    }

    // Read-only preview: how many currently-queued, actually-online tickets would be
    // compatible with the given (not-yet-submitted) preferences. Never pops/mutates
    // the queue the way matchNewcomer() does. isOnline() excludes tickets left behind by an
    // unclean disconnect (killed tab, network loss before the close frame) that
    // the heartbeat hasn't closed yet - see matchNewcomer()'s comment.
    public int countCompatible(String userId, JoinQueueRequest prefs) {
        validate(prefs);

        MatchTicket hypothetical = new MatchTicket(
                userId,
                prefs != null ? prefs.getRankLo() : null,
                prefs != null ? prefs.getRankHi() : null,
                prefs != null && prefs.getRegions() != null ? prefs.getRegions() : List.of());

        List<String> queuedUserIds = redisTemplate.opsForList().range(QUEUE_KEY, 0, -1);
        if (queuedUserIds == null) {
            return 0;
        }

        int count = 0;
        for (String candidateId : queuedUserIds) {
            if (candidateId.equals(userId) || !messenger.isOnline(candidateId)) {
                continue;
            }
            if (compatible(hypothetical, loadTicket(candidateId))) {
                count++;
            }
        }
        return count;
    }

    public void leave(String userId) {
        synchronized (queueLock) {
            redisTemplate.opsForList().remove(QUEUE_KEY, 0, userId);
            removeTicket(userId);
        }
        log.info("User left matchmaking queue: {}", userId);
    }

    // Queue entries outlive a restart in Redis, but no socket does - anything left
    // over is a ghost that would otherwise sit in the queue and make CallService
    // report its user as busy. Assumes a single backend instance: with more than
    // one, this would wipe queue entries owned by the others.
    @EventListener(ApplicationReadyEvent.class)
    public void clearStaleQueue() {
        try {
            redisTemplate.delete(List.of(QUEUE_KEY, TICKETS_KEY));
            log.info("Cleared matchmaking queue left over from previous run");
        } catch (DataAccessException e) {
            // Don't fail startup over this - dead entries are still discarded lazily
            // when matchNewcomer() fails to reach them.
            log.warn("Could not clear stale matchmaking queue on startup: {}", e.getMessage());
        }
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

    // Matches the newcomer against the longest-waiting compatible, reachable entry.
    // Every queue mutation holds queueLock and every join() matches immediately, so
    // no two compatible users are ever left waiting together - checking only the
    // newcomer is enough. The lock is in-process, which assumes a single backend
    // instance; running several would need a Redis lock or Lua script instead.
    //
    // messenger.send()'s return value is the liveness check: an unclean drop the
    // heartbeat hasn't caught yet can still leave a dead entry, which is discarded
    // here when delivery to it fails.
    private void matchNewcomer(MatchTicket newcomer) {
        String newcomerId = newcomer.username();
        List<String> queued = redisTemplate.opsForList().range(QUEUE_KEY, 0, -1);
        String callerId = null;

        for (String candidateId : queued != null ? queued : List.<String>of()) {
            if (candidateId.equals(newcomerId) || !compatible(newcomer, loadTicket(candidateId))) {
                continue;
            }

            redisTemplate.opsForList().remove(QUEUE_KEY, 0, candidateId);
            if (messenger.send(candidateId, newcomerId, "queue-matched", Map.of("role", "caller"))) {
                callerId = candidateId;
                break;
            }
            log.debug("Discarding unreachable queue entry: {}", candidateId);
            removeTicket(candidateId);
        }

        if (callerId == null) {
            redisTemplate.opsForList().rightPush(QUEUE_KEY, newcomerId);
            return;
        }

        removeTicket(callerId);
        removeTicket(newcomerId);

        if (!messenger.send(newcomerId, callerId, "queue-matched", Map.of("role", "callee"))) {
            // The caller's client has already left its queued state, so it's told the
            // match fell through rather than silently requeued.
            messenger.send(callerId, newcomerId, "peer-disconnected", Map.of());
            log.info("Match between {} and {} fell through: callee unreachable", callerId, newcomerId);
            return;
        }

        log.info("Matched users {} (caller) and {} (callee)", callerId, newcomerId);
        matchRegistry.pair(callerId, newcomerId);

        try {
            connectionService.recordMatch(callerId, newcomerId);
        } catch (Exception e) {
            log.warn("Failed to record match history for {} and {}: {}", callerId, newcomerId, e.getMessage());
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
