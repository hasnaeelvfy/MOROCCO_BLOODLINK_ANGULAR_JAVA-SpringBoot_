package com.bloodlink.repository;

import com.bloodlink.common.enums.Role;
import com.bloodlink.common.enums.UserStatus;
import com.bloodlink.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    @Query("select u from User u left join fetch u.hospital where u.email = :email")
    Optional<User> findByEmail(@Param("email") String email);

    boolean existsByEmail(String email);

    List<User> findByHospital_Id(Long hospitalId);

    long countByRoleAndStatus(Role role, UserStatus status);

    @Query("select u from User u left join fetch u.hospital order by u.createdAt desc")
    List<User> findAllFetched();
}
