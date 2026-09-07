package com.sedanodev.valomegle.match;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

@Component
public class MatchRegistry {

    private final Map<String, String> partners = new ConcurrentHashMap<>();

    public void pair(String a, String b) {
        partners.put(a, b);
        partners.put(b, a);
    }

    public String partnerOf(String userId) {
        return partners.get(userId);
    }

    public void unpair(String userId) {
        String partnerId = partners.remove(userId);
        if (partnerId != null) {
            partners.remove(partnerId);
        }
    }
}
