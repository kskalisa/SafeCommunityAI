package com.SafeCommunityAI.backend.service;

import com.SafeCommunityAI.backend.dto.NotificationResponse;
import com.SafeCommunityAI.backend.entity.User;
import java.util.List;

public interface NotificationService {
    void notify(User recipient, String title, String message);
    void broadcast(String title, String message);
    List<NotificationResponse> list(String actorEmail);
}
