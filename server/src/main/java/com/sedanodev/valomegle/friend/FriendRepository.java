package com.sedanodev.valomegle.friend;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.sedanodev.valomegle.user.User;

@Repository
public interface FriendRepository extends JpaRepository<Friend, Long> {

    @Query("SELECT COUNT(f) > 0 FROM Friend f WHERE (f.user1 = :a AND f.user2 = :b) OR (f.user1 = :b AND f.user2 = :a)")
    boolean existsBetween(@Param("a") User a, @Param("b") User b);

    @Query("SELECT COUNT(f) > 0 FROM Friend f WHERE f.status = com.sedanodev.valomegle.friend.FriendStatus.ACCEPTED "
            + "AND ((f.user1 = :a AND f.user2 = :b) OR (f.user1 = :b AND f.user2 = :a))")
    boolean existsAcceptedBetween(@Param("a") User a, @Param("b") User b);

    List<Friend> findByUser1AndStatus(User user1, FriendStatus status);

    List<Friend> findByUser2AndStatus(User user2, FriendStatus status);

    @Query("SELECT f FROM Friend f WHERE f.status = com.sedanodev.valomegle.friend.FriendStatus.ACCEPTED AND (f.user1 = :user OR f.user2 = :user)")
    List<Friend> findAcceptedByUser(@Param("user") User user);
}
