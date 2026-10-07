package com.bloodlink.repository;

import com.bloodlink.common.enums.MatchStatus;
import com.bloodlink.entity.BloodMatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BloodMatchRepository extends JpaRepository<BloodMatch, Long> {

    @Query("""
            select m from BloodMatch m
            join fetch m.donor d
            join fetch d.user
            join fetch m.bloodRequest r
            join fetch r.hospital
            where r.id = :requestId
            order by m.createdAt asc
            """)
    List<BloodMatch> findByRequestId(@Param("requestId") Long requestId);

    @Query("""
            select m from BloodMatch m
            join fetch m.donor d
            join fetch d.user
            join fetch m.bloodRequest r
            join fetch r.hospital
            where r.hospital.id = :hospitalId
            order by m.createdAt desc
            """)
    List<BloodMatch> findByHospitalId(@Param("hospitalId") Long hospitalId);

    @Query("""
            select m from BloodMatch m
            join fetch m.donor d
            join fetch d.user
            join fetch m.bloodRequest r
            join fetch r.hospital
            where d.id = :donorId
            order by m.createdAt desc
            """)
    List<BloodMatch> findByDonorId(@Param("donorId") Long donorId);

    @Query("""
            select m from BloodMatch m
            join fetch m.donor d
            join fetch d.user
            join fetch m.bloodRequest r
            join fetch r.hospital
            where m.id = :id and d.id = :donorId
            """)
    Optional<BloodMatch> findByIdAndDonorId(@Param("id") Long id, @Param("donorId") Long donorId);

    long countByBloodRequest_IdAndStatus(Long requestId, MatchStatus status);

    long countByBloodRequest_Hospital_IdAndStatusIn(Long hospitalId, Collection<MatchStatus> statuses);

    long countByDonor_IdAndStatus(Long donorId, MatchStatus status);

    long countByDonor_IdAndStatusIn(Long donorId, Collection<MatchStatus> statuses);

    boolean existsByBloodRequest_IdAndDonor_Id(Long requestId, Long donorId);

    boolean existsByBloodRequest_IdAndDonor_IdAndStatus(Long requestId, Long donorId, MatchStatus status);

    boolean existsByBloodRequest_Hospital_IdAndDonor_IdAndStatus(Long hospitalId, Long donorId, MatchStatus status);

    boolean existsByBloodRequest_Hospital_IdAndDonor_IdAndStatusIn(Long hospitalId, Long donorId, Collection<MatchStatus> statuses);

    long countByStatus(MatchStatus status);

    long countByStatusIn(Collection<MatchStatus> statuses);

    @Query("""
            select m from BloodMatch m
            join fetch m.donor d
            join fetch d.user
            join fetch m.bloodRequest r
            where r.id = :requestId and m.status = :status
            """)
    List<BloodMatch> findByBloodRequest_IdAndStatus(@Param("requestId") Long requestId, @Param("status") MatchStatus status);

    Optional<BloodMatch> findFirstByBloodRequest_Hospital_IdAndDonor_IdAndStatusOrderByRespondedAtDesc(
            Long hospitalId, Long donorId, MatchStatus status);

    Optional<BloodMatch> findFirstByBloodRequest_Hospital_IdAndDonor_IdAndStatusInOrderByRespondedAtDesc(
            Long hospitalId, Long donorId, Collection<MatchStatus> statuses);

    @Query("""
            select m from BloodMatch m
            join fetch m.donor d
            join fetch d.user
            join fetch m.bloodRequest r
            join fetch r.hospital
            order by m.createdAt desc
            """)
    List<BloodMatch> findAllFetched();

    @Query("""
            select m from BloodMatch m
            join fetch m.donor d
            join fetch d.user
            join fetch m.bloodRequest r
            join fetch r.hospital
            where r.id = :requestId and m.status in :statuses
            """)
    List<BloodMatch> findByBloodRequest_IdAndStatusIn(
            @Param("requestId") Long requestId,
            @Param("statuses") Collection<MatchStatus> statuses);
}
