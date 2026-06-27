package com.SafeCommunityAI.backend.service.impl;

import com.SafeCommunityAI.backend.dto.NotificationResponse;
import com.SafeCommunityAI.backend.entity.Notification;
import com.SafeCommunityAI.backend.entity.User;
import com.SafeCommunityAI.backend.exception.ResourceNotFoundException;
import com.SafeCommunityAI.backend.mapper.AppMapper;
import com.SafeCommunityAI.backend.repository.NotificationRepository;
import com.SafeCommunityAI.backend.repository.UserRepository;
import com.SafeCommunityAI.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final AppMapper mapper;

    @Override
    public void notify(User recipient, String title, String message) {
        notificationRepository.save(Notification.builder().recipient(recipient).title(title).message(message).broadcast(false).read(false).build());
    }

    @Override
    public void broadcast(String title, String message) {
        notificationRepository.save(Notification.builder().title(title).message(message).broadcast(true).read(false).build());
    }

    @Override
    public List<NotificationResponse> list(String actorEmail) {
        User user = userRepository.findByEmail(actorEmail).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return notificationRepository.findByRecipientOrBroadcastOrderByCreatedAtDesc(user, true).stream().map(mapper::toNotificationResponse).toList();
    }
}
