package com.sedanodev.valomegle.turn;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.sedanodev.valomegle.turn.response.TurnCredentialsResponse;

// Mints coturn's REST-API-style time-limited credentials (use-auth-secret mode):
// username = "<expiry>:<userId>", credential = base64(HMAC-SHA1(secret, username)).
// coturn independently derives the same credential from TURN_SECRET to validate it,
// so nothing needs to be stored - a fresh, valid pair can always be recomputed.
@Service
public class TurnCredentialService {

    private static final String HMAC_ALGORITHM = "HmacSHA1";
    private static final long TTL_SECONDS = 60 * 10;

    @Value("${turn.url}")
    private String url;

    @Value("${turn.secret}")
    private String secret;

    public TurnCredentialsResponse generateCredentials(String userId) {
        long expiry = System.currentTimeMillis() / 1000 + TTL_SECONDS;
        String username = expiry + ":" + userId;
        String credential = sign(username);
        return new TurnCredentialsResponse(url, username, credential);
    }

    private String sign(String username) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return Base64.getEncoder().encodeToString(mac.doFinal(username.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("Failed to sign TURN credential", e);
        }
    }
}
