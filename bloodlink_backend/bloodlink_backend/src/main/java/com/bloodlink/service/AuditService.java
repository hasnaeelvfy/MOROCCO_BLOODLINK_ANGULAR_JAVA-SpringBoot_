package com.bloodlink.service;

import com.bloodlink.domain.DateTimes;
import com.bloodlink.dto.response.AuditLogResponse;
import com.bloodlink.entity.AuditLog;
import com.bloodlink.repository.AuditLogRepository;
import com.bloodlink.security.AuthUser;
import com.bloodlink.security.CurrentAccess;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final CurrentAccess currentAccess;

    public AuditService(AuditLogRepository auditLogRepository, CurrentAccess currentAccess) {
        this.auditLogRepository = auditLogRepository;
        this.currentAccess = currentAccess;
    }

    @Transactional
    public void record(String action, String targetType, Long targetId, String details) {
        AuditLog log = new AuditLog();
        try {
            AuthUser actor = currentAccess.requireAuth();
            log.setActorUserId(actor.userId());
            log.setActorEmail(actor.email());
        } catch (RuntimeException ignored) {
            log.setActorEmail("system");
        }
        log.setAction(action);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        log.setDetails(details);
        auditLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> recent() {
        currentAccess.requireAdmin();
        return auditLogRepository.findTop200ByOrderByCreatedAtDesc().stream()
                .map(item -> new AuditLogResponse(
                        item.getId(),
                        item.getActorUserId(),
                        item.getActorEmail(),
                        item.getAction(),
                        item.getTargetType(),
                        item.getTargetId(),
                        item.getDetails(),
                        DateTimes.iso(item.getCreatedAt())
                ))
                .toList();
    }
}
