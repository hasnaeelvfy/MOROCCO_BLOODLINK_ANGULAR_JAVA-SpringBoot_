package com.bloodlink.repository;

import com.bloodlink.common.enums.DonationStatus;
import com.bloodlink.entity.Donation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DonationRepository extends JpaRepository<Donation, Long> {

    @Query("""
            select d from Donation d
            join fetch d.hospital
            left join fetch d.bloodRequest
            where d.donor.id = :donorId
            order by d.donatedOn desc, d.id desc
            """)
    List<Donation> findByDonorId(@Param("donorId") Long donorId);

    long countByDonor_Id(Long donorId);

    long countByDonor_IdAndStatus(Long donorId, DonationStatus status);

    long countByHospital_Id(Long hospitalId);

    long countByHospital_IdAndStatus(Long hospitalId, DonationStatus status);

    long countByStatus(DonationStatus status);

    boolean existsByDonor_IdAndBloodRequest_Id(Long donorId, Long requestId);

    boolean existsByDonor_IdAndBloodRequest_IdAndStatus(Long donorId, Long requestId, DonationStatus status);

    @Query("""
            select d from Donation d
            join fetch d.hospital
            left join fetch d.bloodRequest
            where d.donor.id = :donorId and d.hospital.id = :hospitalId
            order by d.donatedOn desc, d.id desc
            """)
    List<Donation> findByDonorIdAndHospitalId(@Param("donorId") Long donorId, @Param("hospitalId") Long hospitalId);

    @Query("""
            select d from Donation d
            join fetch d.donor
            join fetch d.hospital
            left join fetch d.bloodRequest
            order by d.donatedOn desc, d.id desc
            """)
    List<Donation> findAllFetched();
}
