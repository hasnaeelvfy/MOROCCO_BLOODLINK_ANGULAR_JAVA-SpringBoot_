package com.bloodlink.repository;

import com.bloodlink.entity.AppNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<AppNotification, Long> {

    List<AppNotification> findByUser_IdOrderByCreatedAtDesc(Long userId);

    long countByUser_IdAndReadFalse(Long userId);

    Optional<AppNotification> findByIdAndUser_Id(Long id, Long userId);

    @Modifying
    @Query("update AppNotification n set n.read = true where n.user.id = :userId and n.read = false")
    int markAllRead(@Param("userId") Long userId);

    @Query("""
            select n from AppNotification n
            join fetch n.user
            order by n.createdAt desc
            """)
    List<AppNotification> findAllFetched();
}
