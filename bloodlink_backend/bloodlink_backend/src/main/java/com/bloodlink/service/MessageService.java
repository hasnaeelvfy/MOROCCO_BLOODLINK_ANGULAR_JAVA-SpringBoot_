package com.bloodlink.service;

import com.bloodlink.common.enums.MatchStatus;
import com.bloodlink.common.enums.MessageFrom;
import com.bloodlink.common.enums.NotificationKind;
import com.bloodlink.common.enums.Role;
import com.bloodlink.domain.DateTimes;
import com.bloodlink.domain.InputRules;
import com.bloodlink.dto.request.SendMessageRequest;
import com.bloodlink.dto.response.MessageResponse;
import com.bloodlink.entity.BloodRequest;
import com.bloodlink.entity.Donor;
import com.bloodlink.entity.Hospital;
import com.bloodlink.entity.RequestMessage;
import com.bloodlink.entity.User;
import com.bloodlink.exception.BusinessRuleException;
import com.bloodlink.exception.ResourceNotFoundException;
import com.bloodlink.repository.BloodMatchRepository;
import com.bloodlink.repository.BloodRequestRepository;
import com.bloodlink.repository.RequestMessageRepository;
import com.bloodlink.repository.UserRepository;
import com.bloodlink.security.CurrentAccess;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class MessageService {

    private final CurrentAccess currentAccess;
    private final BloodRequestRepository requestRepository;
    private final BloodMatchRepository matchRepository;
    private final RequestMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public MessageService(
            CurrentAccess currentAccess,
            BloodRequestRepository requestRepository,
            BloodMatchRepository matchRepository,
            RequestMessageRepository messageRepository,
            UserRepository userRepository,
            NotificationService notificationService
    ) {
        this.currentAccess = currentAccess;
        this.requestRepository = requestRepository;
        this.matchRepository = matchRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> list(Long requestId) {
        AccessContext access = requireAccessible(requestId);
        return messageRepository.findByBloodRequest_IdOrderByCreatedAtAsc(access.request().getId()).stream()
                .filter(item -> visibleTo(item, access))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public MessageResponse send(Long requestId, SendMessageRequest input) {
        AccessContext access = requireAccessible(requestId);
        BloodRequest request = access.request();
        String text = InputRules.required(input.text(), "Message content");
        if (text.length() > InputRules.MAX_NOTES) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.MESSAGE_TOO_LONG, "Message content is too long");
        }
        User author = userRepository.findById(currentAccess.requireAuth().userId())
                .orElseThrow(() -> new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.USER_NOT_FOUND, "User was not found"));
        RequestMessage message = new RequestMessage();
        message.setBloodRequest(request);
        message.setAuthor(author);
        message.setSenderRole(author.getRole() == Role.DONOR ? MessageFrom.DONOR : MessageFrom.HOSPITAL);
        message.setText(text);
        message.setBloodMatch(resolveMatch(access, author.getRole()));
        RequestMessage saved = messageRepository.save(message);
        if (author.getRole() == Role.DONOR) {
            notificationService.notifyHospitalStaff(
                    request.getHospital().getId(),
                    NotificationKind.STATUS,
                    "New message from donor",
                    "A donor sent a message about " + MatchingService.publicCode(request.getId()) + ".",
                    request.getId(),
                    saved.getBloodMatch() == null ? null : saved.getBloodMatch().getId()
            );
        } else {
            List<com.bloodlink.entity.BloodMatch> targets = access.matches();
            if (saved.getBloodMatch() != null) {
                targets = List.of(saved.getBloodMatch());
            }
            for (var match : targets) {
                notificationService.notifyUser(
                        match.getDonor().getUser(),
                        NotificationKind.STATUS,
                        "New message from hospital",
                        request.getHospital().getHospitalName() + " replied about "
                                + MatchingService.publicCode(request.getId()) + ".",
                        request.getId(),
                        match.getId()
                );
            }
        }
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public boolean canCommunicate(Long requestId) {
        try {
            requireAccessible(requestId);
            return true;
        } catch (RuntimeException ex) {
            return false;
        }
    }

    private AccessContext requireAccessible(Long requestId) {
        User user = currentAccess.requireUser();
        if (user.getRole() == Role.HOSPITAL) {
            Hospital hospital = currentAccess.requireHospital();
            BloodRequest request = requestRepository.findByIdAndHospitalId(requestId, hospital.getId())
                    .orElseThrow(() -> new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.BLOOD_REQUEST_NOT_FOUND, "Blood request was not found"));
            List<com.bloodlink.entity.BloodMatch> related = relatedMatches(requestId);
            if (related.isEmpty()) {
                throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.MESSAGING_REQUIRES_ACCEPTANCE, "Messaging opens after a donor accepts this request");
            }
            return new AccessContext(request, related, null);
        }
        if (user.getRole() == Role.DONOR) {
            Donor donor = currentAccess.requireDonor();
            BloodRequest request = requestRepository.findWithHospitalById(requestId)
                    .orElseThrow(() -> new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.BLOOD_REQUEST_NOT_FOUND, "Blood request was not found"));
            List<com.bloodlink.entity.BloodMatch> related = relatedMatches(requestId).stream()
                    .filter(match -> match.getDonor().getId().equals(donor.getId()))
                    .collect(Collectors.toList());
            if (related.isEmpty()) {
                throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.MESSAGING_REQUIRES_ACCEPTANCE, "Messaging opens after you accept this invitation");
            }
            return new AccessContext(request, related, donor.getId());
        }
        throw new AccessDeniedException("Not allowed");
    }

    private List<com.bloodlink.entity.BloodMatch> relatedMatches(Long requestId) {
        return matchRepository.findByRequestId(requestId).stream()
                .filter(match -> MatchingService.hasRelationship(match.getStatus()))
                .toList();
    }

    private com.bloodlink.entity.BloodMatch resolveMatch(AccessContext access, Role role) {
        if (role == Role.DONOR) {
            return access.matches().isEmpty() ? null : access.matches().get(0);
        }
        if (access.matches().size() == 1) {
            return access.matches().get(0);
        }
        return null;
    }

    private boolean visibleTo(RequestMessage message, AccessContext access) {
        if (access.donorId() == null) {
            return true;
        }
        if (message.getBloodMatch() == null) {
            return true;
        }
        return message.getBloodMatch().getDonor() != null
                && access.donorId().equals(message.getBloodMatch().getDonor().getId());
    }

    private record AccessContext(BloodRequest request, List<com.bloodlink.entity.BloodMatch> matches, Long donorId) {
    }

    private MessageResponse toResponse(RequestMessage message) {
        return new MessageResponse(
                message.getId(),
                message.getBloodRequest().getId(),
                message.getSenderRole(),
                message.getAuthor().getId(),
                message.getText(),
                DateTimes.iso(message.getCreatedAt())
        );
    }
}
