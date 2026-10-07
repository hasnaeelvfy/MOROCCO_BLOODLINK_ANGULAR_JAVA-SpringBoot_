package com.bloodlink.repository;

import com.bloodlink.entity.RequestMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RequestMessageRepository extends JpaRepository<RequestMessage, Long> {

    @Query("""
            select m from RequestMessage m
            join fetch m.author
            left join fetch m.bloodMatch bm
            left join fetch bm.donor
            where m.bloodRequest.id = :requestId
            order by m.createdAt asc
            """)
    List<RequestMessage> findByBloodRequest_IdOrderByCreatedAtAsc(@Param("requestId") Long requestId);

    long countByBloodRequest_Id(Long requestId);
}
