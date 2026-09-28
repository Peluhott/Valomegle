package com.sedanodev.valomegle.connection;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.sedanodev.valomegle.user.User;

@Repository
public interface ConnectionRepository extends JpaRepository<Connection, Long> {

    @Query("SELECT c FROM Connection c WHERE c.user1 = :user OR c.user2 = :user ORDER BY c.connectedAt DESC")
    List<Connection> findRecentByUser(@Param("user") User user, Pageable pageable);

    @Query("SELECT COUNT(c) > 0 FROM Connection c WHERE (c.user1 = :a AND c.user2 = :b) OR (c.user1 = :b AND c.user2 = :a)")
    boolean existsMatchBetween(@Param("a") User a, @Param("b") User b);
}
