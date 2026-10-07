package com.bloodlink.service;

import com.bloodlink.exception.BusinessRuleException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Set<String> ALLOWED = Set.of("image/jpeg", "image/png", "image/webp");
    private static final long MAX_BYTES = 2 * 1024 * 1024;

    private final Path root;

    public FileStorageService(@Value("${bloodlink.uploads-dir:uploads}") String uploadsDir) {
        this.root = Path.of(uploadsDir).toAbsolutePath().normalize();
    }

    public String store(String folder, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.IMAGE_REQUIRED, "An image file is required");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.IMAGE_TOO_LARGE, "Image must be 2 MB or smaller");
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!ALLOWED.contains(contentType)) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.IMAGE_TYPE_INVALID, "Only JPEG, PNG, or WebP images are allowed");
        }
        String extension = extensionOf(contentType);
        String fileName = UUID.randomUUID().toString().replace("-", "") + extension;
        Path directory = root.resolve(folder).normalize();
        try {
            Files.createDirectories(directory);
            Path target = directory.resolve(fileName);
            try (InputStream input = file.getInputStream()) {
                Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
            }
            return folder + "/" + fileName;
        } catch (IOException ex) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.IMAGE_STORE_FAILED, "The image could not be stored");
        }
    }

    public Path resolve(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            return null;
        }
        Path path = root.resolve(relativePath).normalize();
        if (!path.startsWith(root) || !Files.exists(path)) {
            return null;
        }
        return path;
    }

    public void deleteQuietly(String relativePath) {
        Path path = resolve(relativePath);
        if (path == null) {
            return;
        }
        try {
            Files.deleteIfExists(path);
        } catch (IOException ignored) {
            // best-effort cleanup
        }
    }

    public String contentType(String relativePath) {
        if (relativePath == null) {
            return "application/octet-stream";
        }
        String lower = relativePath.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".png")) {
            return "image/png";
        }
        if (lower.endsWith(".webp")) {
            return "image/webp";
        }
        return "image/jpeg";
    }

    private static String extensionOf(String contentType) {
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }
}
