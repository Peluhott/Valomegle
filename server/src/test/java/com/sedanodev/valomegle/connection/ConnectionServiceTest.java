package com.sedanodev.valomegle.connection;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.sedanodev.valomegle.connection.response.RecentMatchResponse;
import com.sedanodev.valomegle.user.User;
import com.sedanodev.valomegle.user.UserRepository;

class ConnectionServiceTest {

    private static User userWithId(Long id, String username) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        return user;
    }

    @Test
    void recordMatchResolvesBothUsersAndSavesConnection() {
        UserRepository userRepository = mock(UserRepository.class);
        ConnectionRepository connectionRepository = mock(ConnectionRepository.class);

        User alice = userWithId(1L, "alice");
        User bob = userWithId(2L, "bob");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(bob));

        ConnectionService service = new ConnectionService(connectionRepository, userRepository);
        service.recordMatch("alice", "bob");

        ArgumentCaptor<Connection> captor = ArgumentCaptor.forClass(Connection.class);
        verify(connectionRepository).save(captor.capture());
        Connection saved = captor.getValue();
        assertEquals(alice, saved.getUser1());
        assertEquals(bob, saved.getUser2());
    }

    @Test
    void getRecentMatchesMapsToOtherUserOnEachSide() {
        UserRepository userRepository = mock(UserRepository.class);
        ConnectionRepository connectionRepository = mock(ConnectionRepository.class);

        User alice = userWithId(1L, "alice");
        User bob = userWithId(2L, "bob");
        User carol = userWithId(3L, "carol");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));

        Instant firstMatch = Instant.parse("2026-01-01T00:00:00Z");
        Instant secondMatch = Instant.parse("2026-01-02T00:00:00Z");
        Connection aliceAsUser1 = new Connection(1L, alice, bob, firstMatch, null);
        Connection aliceAsUser2 = new Connection(2L, carol, alice, secondMatch, null);
        when(connectionRepository.findRecentByUser(any(), any()))
                .thenReturn(List.of(aliceAsUser2, aliceAsUser1));

        ConnectionService service = new ConnectionService(connectionRepository, userRepository);
        List<RecentMatchResponse> matches = service.getRecentMatches("alice");

        assertEquals(2, matches.size());
        assertEquals("carol", matches.get(0).getUsername());
        assertEquals(secondMatch, matches.get(0).getMatchedAt());
        assertEquals("bob", matches.get(1).getUsername());
        assertEquals(firstMatch, matches.get(1).getMatchedAt());
    }
}
