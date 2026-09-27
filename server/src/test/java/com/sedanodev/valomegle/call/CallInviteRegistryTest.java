package com.sedanodev.valomegle.call;

import java.time.Duration;
import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class CallInviteRegistryTest {

    @Test
    void removeExpiredClearsOnlyInvitesOlderThanMaxAge() {
        CallInviteRegistry registry = new CallInviteRegistry();
        registry.record("alice", "bob");

        Assertions.assertTrue(registry.removeExpired(Duration.ofMinutes(1)).isEmpty());
        Assertions.assertTrue(registry.hasPendingInvite("alice"));

        List<PendingCallInvite> expired = registry.removeExpired(Duration.ZERO.minusSeconds(1));

        Assertions.assertEquals(1, expired.size());
        Assertions.assertEquals("alice", expired.get(0).callerUsername());
        Assertions.assertEquals("bob", expired.get(0).calleeUsername());
        Assertions.assertFalse(registry.hasPendingInvite("alice"));
        Assertions.assertFalse(registry.hasPendingInvite("bob"));
    }

    @Test
    void clearInvitesForCalleeReturnsTheCallersInvite() {
        CallInviteRegistry registry = new CallInviteRegistry();
        registry.record("alice", "bob");

        List<PendingCallInvite> cleared = registry.clearInvitesFor("bob");

        Assertions.assertEquals(1, cleared.size());
        Assertions.assertEquals("alice", cleared.get(0).callerUsername());
        Assertions.assertNull(registry.calleeInvitedByUser("alice"));
    }
}
