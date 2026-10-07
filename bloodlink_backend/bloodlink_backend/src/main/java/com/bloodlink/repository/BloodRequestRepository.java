package com.bloodlink.repository;

import com.bloodlink.common.enums.BloodRequestStatus;
import com.bloodlink.entity.BloodRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BloodRequestRepository extends JpaRepository<BloodRequest, Long> {

    @Query("select r from BloodRequest r join fetch r.hospital where r.hospital.id = :hospitalId order by r.createdAt desc")
    List<BloodRequest> findByHospitalId(@Param("hospitalId") Long hospitalId);

    @Query("select r from BloodRequest r join fetch r.hospital where r.id = :id and r.hospital.id = :hospitalId")
    Optional<BloodRequest> findByIdAndHospitalId(@Param("id") Long id, @Param("hospitalId") Long hospitalId);

    @Query("select r from BloodRequest r join fetch r.hospital where r.id = :id")
    Optional<BloodRequest> findWithHospitalById(@Param("id") Long id);

    @Query("""
            select r from BloodRequest r
            join fetch r.hospital
            where r.status in :statuses
            order by r.createdAt desc
            """)
    List<BloodRequest> findByStatusIn(@Param("statuses") Collection<BloodRequestStatus> statuses);

    long countByHospital_IdAndStatusIn(Long hospitalId, Collection<BloodRequestStatus> statuses);

    long countByHospital_IdAndStatus(Long hospitalId, BloodRequestStatus status);

    long countByHospital_Id(Long hospitalId);

    long countByStatusIn(Collection<BloodRequestStatus> statuses);

    long countByStatus(BloodRequestStatus status);

    @Query("select r from BloodRequest r join fetch r.hospital order by r.createdAt desc")
    List<BloodRequest> findAllWithHospital();
}
