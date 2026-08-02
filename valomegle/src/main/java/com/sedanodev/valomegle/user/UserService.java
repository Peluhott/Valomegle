package com.sedanodev.valomegle.user;

import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.sedanodev.valomegle.security.JwtService;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class UserService {

    private static final List<String> VALID_RANKS = List.of(
            "Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant");
    private static final List<String> VALID_REGIONS = List.of("West", "Central", "East");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public UserResponse createUser(CreateUser request) {
        User newUser = new User();
        newUser.setUsername(request.getUsername());
        newUser.setEmail(request.getEmail());
        newUser.setPassword(passwordEncoder.encode(request.getPassword()));

        User saved = userRepository.save(newUser);
        log.info("Registered new user: {}", saved.getUsername());
        return new UserResponse(saved.getId(), saved.getUsername(), saved.getEmail());
    }

    public String login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> {
                    log.warn("Login failed, user not found: {}", request.getUsername());
                    return new InvalidCredentialsException("Invalid username or password");
                });

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.warn("Login failed, invalid password for user: {}", request.getUsername());
            throw new InvalidCredentialsException("Invalid username or password");
        }

        log.info("User logged in: {}", user.getUsername());
        return jwtService.generateToken(user.getUsername());
    }

    public ProfileResponse getProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> {
                    log.warn("Profile lookup failed, user not found: {}", username);
                    return new UserNotFoundException("User not found");
                });
        return new ProfileResponse(user.getUsername(), user.getFirstName(), user.getLastName(),
                user.getRank(), user.getRegion());
    }

    public ProfileResponse updateProfile(String username, UpdateProfileRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> {
                    log.warn("Profile update failed, user not found: {}", username);
                    return new UserNotFoundException("User not found");
                });

        if (request.getRank() != null && !VALID_RANKS.contains(request.getRank())) {
            throw new IllegalArgumentException("Invalid rank: " + request.getRank());
        }
        if (request.getRegion() != null && !VALID_REGIONS.contains(request.getRegion())) {
            throw new IllegalArgumentException("Invalid region: " + request.getRegion());
        }

        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }
        if (request.getRank() != null) {
            user.setRank(request.getRank());
        }
        if (request.getRegion() != null) {
            user.setRegion(request.getRegion());
        }

        User saved = userRepository.save(user);
        return new ProfileResponse(saved.getUsername(), saved.getFirstName(), saved.getLastName(),
                saved.getRank(), saved.getRegion());
    }

}
