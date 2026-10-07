package com.bloodlink.repository;

import com.bloodlink.common.enums.EligibilityResult;
import com.bloodlink.common.enums.UserStatus;
import com.bloodlink.entity.Donor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DonorRepository extends JpaRepository<Donor, Long> {

    boolean existsByCin(String cin);

    boolean existsByCinAndIdNot(String cin, Long id);

    @Query("select d from Donor d join fetch d.user where d.user.id = :userId")
    Optional<Donor> findByUser_Id(@Param("userId") Long userId);

    @Query("""
            select d from Donor d
            join fetch d.user u
            where d.bloodType is not null
              and u.status = :status
            """)
    List<Donor> findMatchCandidates(@Param("status") UserStatus status);

    long countByEligibility(EligibilityResult eligibility);

    long countByUser_Status(UserStatus status);

    @Query("select d from Donor d join fetch d.user order by d.createdAt desc")
    List<Donor> findAllWithUser();
}
