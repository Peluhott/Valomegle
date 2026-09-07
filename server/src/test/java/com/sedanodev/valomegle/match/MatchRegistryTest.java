package com.sedanodev.valomegle.match;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class MatchRegistryTest {

    @Test
    void pairWritesBothDirections() {
        MatchRegistry registry = new MatchRegistry();
        registry.pair("a", "b");

        Assertions.assertEquals("b", registry.partnerOf("a"));
        Assertions.assertEquals("a", registry.partnerOf("b"));
    }

    @Test
    void unpairRemovesBothEntries() {
        MatchRegistry registry = new MatchRegistry();
        registry.pair("a", "b");
        registry.unpair("a");

        Assertions.assertNull(registry.partnerOf("a"));
        Assertions.assertNull(registry.partnerOf("b"));
    }

    @Test
    void partnerOfUnknownUserIsNull() {
        MatchRegistry registry = new MatchRegistry();

        Assertions.assertNull(registry.partnerOf("unknown"));
    }

    @Test
    void unpairUnknownUserDoesNotThrow() {
        MatchRegistry registry = new MatchRegistry();

        Assertions.assertDoesNotThrow(() -> registry.unpair("unknown"));
    }
}
