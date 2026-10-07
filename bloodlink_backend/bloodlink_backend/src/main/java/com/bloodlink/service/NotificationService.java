package com.bloodlink.service;

import com.bloodlink.common.enums.NotificationKind;
import com.bloodlink.domain.DateTimes;
import com.bloodlink.dto.response.NotificationResponse;
import com.bloodlink.entity.AppNotification;
import com.bloodlink.entity.User;
import com.bloodlink.exception.ResourceNotFoundException;
import com.bloodlink.repository.NotificationRepository;
import com.bloodlink.repository.UserRepository;
import com.bloodlink.security.CurrentAccess;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final CurrentAccess currentAccess;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            CurrentAccess currentAccess
    ) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.currentAccess = currentAccess;
    }

    @Transactional
    public void notifyUser(User user, NotificationKind kind, String title, String body, Long requestId, Long matchId) {
        if (user == null || !allowed(user, kind)) {
            return;
        }
        AppNotification notification = new AppNotification();
        notification.setUser(user);
        notification.setKind(kind);
        notification.setTitle(title);
        notification.setBody(body);
        notification.setRequestId(requestId);
        notification.setMatchId(matchId);
        notificationRepository.save(notification);
    }

    @Transactional
    public void notifyHospitalStaff(Long hospitalId, NotificationKind kind, String title, String body, Long requestId, Long matchId) {
        for (User user : userRepository.findByHospital_Id(hospitalId)) {
            notifyUser(user, kind, title, body, requestId, matchId);
        }
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> mine() {
        Long userId = currentAccess.requireAuth().userId();
        return notificationRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount() {
        return notificationRepository.countByUser_IdAndReadFalse(currentAccess.requireAuth().userId());
    }

    @Transactional
    public void markRead(Long id) {
        Long userId = currentAccess.requireAuth().userId();
        AppNotification notification = notificationRepository.findByIdAndUser_Id(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.NOTIFICATION_NOT_FOUND, "Notification was not found"));
        notification.setRead(true);
    }

    @Transactional
    public void markAllRead() {
        notificationRepository.markAllRead(currentAccess.requireAuth().userId());
    }

    private boolean allowed(User user, NotificationKind kind) {
        return switch (kind) {
            case INVITATION -> user.isNotifyInvitations();
            case REMINDER -> user.isNotifyReminders();
            default -> user.isNotifyStatus();
        };
    }

    public NotificationResponse toResponse(AppNotification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getKind(),
                notification.getTitle(),
                notification.getBody(),
                DateTimes.iso(notification.getCreatedAt()),
                notification.isRead(),
                notification.getRequestId(),
                notification.getMatchId()
        );
    }
}
