package com.sedanodev.valomegle.friend;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import com.sedanodev.valomegle.connection.ConnectionService;
import com.sedanodev.valomegle.friend.exception.FriendActionNotAllowedException;
import com.sedanodev.valomegle.user.User;
import com.sedanodev.valomegle.user.UserRepository;

class FriendServiceTest {

    private static User userWithId(Long id, String username) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        return user;
    }

    @Test
    void sendRequestRejectsSelfFriending() {
        FriendRepository friendRepository = mock(FriendRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        ConnectionService connectionService = mock(ConnectionService.class);
        FriendService service = new FriendService(friendRepository, userRepository, connectionService);

        assertThrows(FriendActionNotAllowedException.class, () -> service.sendRequest("alice", "alice"));
        verify(friendRepository, never()).save(any());
    }

    @Test
    void sendRequestRejectsWhenNoMatchHistory() {
        FriendRepository friendRepository = mock(FriendRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        ConnectionService connectionService = mock(ConnectionService.class);

        User alice = userWithId(1L, "alice");
        User bob = userWithId(2L, "bob");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(bob));
        when(connectionService.hasMatchedWith("alice", "bob")).thenReturn(false);

        FriendService service = new FriendService(friendRepository, userRepository, connectionService);

        assertThrows(FriendActionNotAllowedException.class, () -> service.sendRequest("alice", "bob"));
        verify(friendRepository, never()).save(any());
    }

    @Test
    void sendRequestRejectsDuplicate() {
        FriendRepository friendRepository = mock(FriendRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        ConnectionService connectionService = mock(ConnectionService.class);

        User alice = userWithId(1L, "alice");
        User bob = userWithId(2L, "bob");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(bob));
        when(connectionService.hasMatchedWith("alice", "bob")).thenReturn(true);
        when(friendRepository.existsBetween(alice, bob)).thenReturn(true);

        FriendService service = new FriendService(friendRepository, userRepository, connectionService);

        assertThrows(FriendActionNotAllowedException.class, () -> service.sendRequest("alice", "bob"));
        verify(friendRepository, never()).save(any());
    }

    @Test
    void acceptRejectsNonRecipient() {
        FriendRepository friendRepository = mock(FriendRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        ConnectionService connectionService = mock(ConnectionService.class);

        User alice = userWithId(1L, "alice");
        User bob = userWithId(2L, "bob");
        Friend request = new Friend(10L, alice, bob, FriendStatus.PENDING, Instant.now());
        when(friendRepository.findById(10L)).thenReturn(Optional.of(request));

        FriendService service = new FriendService(friendRepository, userRepository, connectionService);

        // alice is the sender, not the recipient - she cannot accept her own request
        assertThrows(FriendActionNotAllowedException.class, () -> service.accept("alice", 10L));
        verify(friendRepository, never()).save(any());
    }

    @Test
    void declineRejectsNonRecipient() {
        FriendRepository friendRepository = mock(FriendRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        ConnectionService connectionService = mock(ConnectionService.class);

        User alice = userWithId(1L, "alice");
        User bob = userWithId(2L, "bob");
        Friend request = new Friend(10L, alice, bob, FriendStatus.PENDING, Instant.now());
        when(friendRepository.findById(10L)).thenReturn(Optional.of(request));

        FriendService service = new FriendService(friendRepository, userRepository, connectionService);

        assertThrows(FriendActionNotAllowedException.class, () -> service.decline("alice", 10L));
        verify(friendRepository, never()).delete(any());
    }

    @Test
    void unfriendRejectsNonAcceptedFriendship() {
        FriendRepository friendRepository = mock(FriendRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        ConnectionService connectionService = mock(ConnectionService.class);

        User alice = userWithId(1L, "alice");
        User bob = userWithId(2L, "bob");
        Friend request = new Friend(10L, alice, bob, FriendStatus.PENDING, Instant.now());
        when(friendRepository.findById(10L)).thenReturn(Optional.of(request));

        FriendService service = new FriendService(friendRepository, userRepository, connectionService);

        assertThrows(FriendActionNotAllowedException.class, () -> service.unfriend("alice", 10L));
        verify(friendRepository, never()).delete(any());
    }

    @Test
    void unfriendRejectsUnrelatedUser() {
        FriendRepository friendRepository = mock(FriendRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        ConnectionService connectionService = mock(ConnectionService.class);

        User alice = userWithId(1L, "alice");
        User bob = userWithId(2L, "bob");
        Friend friendship = new Friend(10L, alice, bob, FriendStatus.ACCEPTED, Instant.now());
        when(friendRepository.findById(10L)).thenReturn(Optional.of(friendship));

        FriendService service = new FriendService(friendRepository, userRepository, connectionService);

        assertThrows(FriendActionNotAllowedException.class, () -> service.unfriend("carol", 10L));
        verify(friendRepository, never()).delete(any());
    }
}
