package com.sedanodev.valomegle.connection;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.sedanodev.valomegle.connection.response.RecentMatchResponse;
import com.sedanodev.valomegle.user.User;
import com.sedanodev.valomegle.user.UserRepository;
import com.sedanodev.valomegle.user.exception.UserNotFoundException;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class ConnectionService {

    private final ConnectionRepository connectionRepository;
    private final UserRepository userRepository;

    public ConnectionService(ConnectionRepository connectionRepository, UserRepository userRepository) {
        this.connectionRepository = connectionRepository;
        this.userRepository = userRepository;
    }

    public void recordMatch(String username1, String username2) {
        User user1 = userRepository.findByUsername(username1)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + username1));
        User user2 = userRepository.findByUsername(username2)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + username2));

        Connection connection = new Connection(null, user1, user2, Instant.now(), null);
        connectionRepository.save(connection);
        log.info("Recorded match between {} and {}", username1, username2);
    }

    public List<RecentMatchResponse> getRecentMatches(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + username));

        return connectionRepository.findRecentByUser(user, PageRequest.of(0, 10)).stream()
                .map(connection -> {
                    User other = connection.getUser1().getId().equals(user.getId())
                            ? connection.getUser2()
                            : connection.getUser1();
                    return new RecentMatchResponse(other.getUsername(), connection.getConnectedAt());
                })
                .toList();
    }

    // Used by the friend feature to enforce that friending requires a shared match history.
    public boolean hasMatchedWith(String usernameA, String usernameB) {
        User userA = userRepository.findByUsername(usernameA)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + usernameA));
        User userB = userRepository.findByUsername(usernameB)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + usernameB));

        return connectionRepository.existsMatchBetween(userA, userB);
    }
}
