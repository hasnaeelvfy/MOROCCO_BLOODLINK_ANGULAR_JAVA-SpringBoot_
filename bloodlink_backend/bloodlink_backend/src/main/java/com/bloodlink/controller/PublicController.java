package com.bloodlink.controller;

import com.bloodlink.dto.response.PublicBloodRequestResponse;
import com.bloodlink.service.PublicFeedService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/public")
public class PublicController {

    private final PublicFeedService publicFeedService;

    public PublicController(PublicFeedService publicFeedService) {
        this.publicFeedService = publicFeedService;
    }

    @GetMapping("/active-requests")
    public List<PublicBloodRequestResponse> activeRequests() {
        return publicFeedService.activeRequests();
    }
}
