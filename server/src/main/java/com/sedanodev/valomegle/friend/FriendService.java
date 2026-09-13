package com.sedanodev.valomegle.friend;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;

import com.sedanodev.valomegle.connection.ConnectionService;
import com.sedanodev.valomegle.friend.exception.FriendActionNotAllowedException;
import com.sedanodev.valomegle.friend.exception.FriendRequestNotFoundException;
import com.sedanodev.valomegle.friend.response.FriendRequestResponse;
import com.sedanodev.valomegle.friend.response.FriendResponse;
import com.sedanodev.valomegle.user.User;
import com.sedanodev.valomegle.user.UserRepository;
import com.sedanodev.valomegle.user.exception.UserNotFoundException;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class FriendService {

    private final FriendRepository friendRepository;
    private final UserRepository userRepository;
    private final ConnectionService connectionService;

    public FriendService(FriendRepository friendRepository, UserRepository userRepository,
            ConnectionService connectionService) {
        this.friendRepository = friendRepository;
        this.userRepository = userRepository;
        this.connectionService = connectionService;
    }

    public void sendRequest(String senderUsername, String targetUsername) {
        if (senderUsername.equals(targetUsername)) {
            throw new FriendActionNotAllowedException("You cannot send a friend request to yourself");
        }

        User sender = userRepository.findByUsername(senderUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + senderUsername));
        User target = userRepository.findByUsername(targetUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + targetUsername));

        if (!connectionService.hasMatchedWith(senderUsername, targetUsername)) {
            throw new FriendActionNotAllowedException("You can only send friend requests to users you've matched with");
        }
        if (friendRepository.existsBetween(sender, target)) {
            throw new FriendActionNotAllowedException("A friend request or friendship already exists between these users");
        }

        friendRepository.save(new Friend(null, sender, target, FriendStatus.PENDING, Instant.now()));
        log.info("Friend request sent from {} to {}", senderUsername, targetUsername);
    }

    public List<FriendRequestResponse> listIncoming(String username) {
        User user = resolveUser(username);
        return friendRepository.findByUser2AndStatus(user, FriendStatus.PENDING).stream()
                .map(friend -> new FriendRequestResponse(friend.getId(), friend.getUser1().getUsername(), friend.getCreatedAt()))
                .toList();
    }

    public List<FriendRequestResponse> listOutgoing(String username) {
        User user = resolveUser(username);
        return friendRepository.findByUser1AndStatus(user, FriendStatus.PENDING).stream()
                .map(friend -> new FriendRequestResponse(friend.getId(), friend.getUser2().getUsername(), friend.getCreatedAt()))
                .toList();
    }

    public void accept(String username, Long requestId) {
        Friend friend = findRequest(requestId);

        if (!friend.getUser2().getUsername().equals(username) || friend.getStatus() != FriendStatus.PENDING) {
            throw new FriendActionNotAllowedException("This friend request cannot be accepted");
        }

        friend.setStatus(FriendStatus.ACCEPTED);
        friendRepository.save(friend);
        log.info("Friend request {} accepted by {}", requestId, username);
    }

    public void decline(String username, Long requestId) {
        Friend friend = findRequest(requestId);

        if (!friend.getUser2().getUsername().equals(username) || friend.getStatus() != FriendStatus.PENDING) {
            throw new FriendActionNotAllowedException("This friend request cannot be declined");
        }

        friendRepository.delete(friend);
        log.info("Friend request {} declined by {}", requestId, username);
    }

    public List<FriendResponse> listFriends(String username) {
        User user = resolveUser(username);
        return friendRepository.findAcceptedByUser(user).stream()
                .map(friend -> {
                    User other = friend.getUser1().getId().equals(user.getId()) ? friend.getUser2() : friend.getUser1();
                    return new FriendResponse(friend.getId(), other.getUsername());
                })
                .toList();
    }

    public void unfriend(String username, Long friendshipId) {
        Friend friend = friendRepository.findById(friendshipId)
                .orElseThrow(() -> new FriendRequestNotFoundException("Friendship not found: " + friendshipId));

        boolean involvesUser = friend.getUser1().getUsername().equals(username)
                || friend.getUser2().getUsername().equals(username);
        if (friend.getStatus() != FriendStatus.ACCEPTED || !involvesUser) {
            throw new FriendActionNotAllowedException("This friendship cannot be removed");
        }

        friendRepository.delete(friend);
        log.info("Friendship {} removed by {}", friendshipId, username);
    }

    // Used by the call feature to gate direct call invites on an accepted friendship.
    public boolean areFriends(String usernameA, String usernameB) {
        User userA = userRepository.findByUsername(usernameA)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + usernameA));
        User userB = userRepository.findByUsername(usernameB)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + usernameB));

        return friendRepository.existsAcceptedBetween(userA, userB);
    }

    private User resolveUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + username));
    }

    private Friend findRequest(Long requestId) {
        return friendRepository.findById(requestId)
                .orElseThrow(() -> new FriendRequestNotFoundException("Friend request not found: " + requestId));
    }
}
