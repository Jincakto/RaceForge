package com.raceforge.backend.horse.repository;

import com.raceforge.backend.horse.entity.Horse;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HorseRepository extends JpaRepository<Horse, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT h FROM Horse h WHERE h.horseId = :horseId")
<<<<<<< HEAD
    Optional<Horse> findByIdForUpdate(@Param("horseId") String horseId);

    @Query("""
            SELECT h FROM Horse h
            WHERE LOWER(h.horseName) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(h.registrationNumber) LIKE LOWER(CONCAT('%', :keyword, '%'))
            """)
    List<Horse> searchByNameOrRegistrationNumber(@Param("keyword") String keyword);

    boolean existsByRegistrationNumberIgnoreCase(String registrationNumber);

    boolean existsByRegistrationNumberIgnoreCaseAndHorseIdNot(String registrationNumber, String horseId);

    @Query(value = "SELECT NEXT VALUE FOR dbo.Horse_Id_Sequence", nativeQuery = true)
    Long nextHorseNumber();
=======
    Optional<Horse> findByIdForUpdate(
            @Param("horseId") String horseId
    );
>>>>>>> 76de6e5 (luu code)
}
