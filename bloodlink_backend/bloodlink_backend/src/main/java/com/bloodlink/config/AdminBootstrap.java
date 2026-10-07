package com.bloodlink.config;

import com.bloodlink.common.enums.Role;
import com.bloodlink.common.enums.UserStatus;
import com.bloodlink.entity.User;
import com.bloodlink.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;
    private final boolean enabled;

    public AdminBootstrap(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${bloodlink.admin.email:admin@bloodlink.ma}") String email,
            @Value("${bloodlink.admin.password:AdminBloodLink1}") String password,
            @Value("${bloodlink.admin.bootstrap:true}") boolean enabled
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.email = email;
        this.password = password;
        this.enabled = enabled;
    }

    @Override
    public void run(String... args) {
        if (!enabled || email == null || email.isBlank()) {
            return;
        }
        if (userRepository.existsByEmail(email)) {
            return;
        }
        User user = new User();
        user.setEmail(email.trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(Role.ADMIN);
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
        log.info("Created BloodLink administrator account for {}", user.getEmail());
    }
}
