package com.sedanodev.valomegle.user;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.sedanodev.valomegle.security.JwtService;
import com.sedanodev.valomegle.user.request.UpdateProfileRequest;

class UserServiceTest {

    private static User existingUser() {
        User user = new User();
        user.setUsername("alice");
        user.setEmail("alice@example.com");
        user.setPassword("hashed");
        return user;
    }

    @Test
    void updateProfileAcceptsRankFromTheLadder() {
        UserRepository userRepository = mock(UserRepository.class);
        User user = existingUser();
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UserService service = new UserService(userRepository, mock(PasswordEncoder.class), mock(JwtService.class));

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setRank("Ascendant");

        assertEquals("Ascendant", service.updateProfile("alice", request).getRank());
    }

    @Test
    void updateProfileRejectsRankOutsideTheLadder() {
        UserRepository userRepository = mock(UserRepository.class);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(existingUser()));

        UserService service = new UserService(userRepository, mock(PasswordEncoder.class), mock(JwtService.class));

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setRank("Immortal");

        assertThrows(IllegalArgumentException.class, () -> service.updateProfile("alice", request));
    }
}
