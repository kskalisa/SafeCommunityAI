package com.SafeCommunityAI.backend.repository;

import com.SafeCommunityAI.backend.entity.Notification;
import com.SafeCommunityAI.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientOrBroadcastOrderByCreatedAtDesc(User recipient, boolean broadcast);
    long countByRecipientAndReadFalse(User recipient);
}
