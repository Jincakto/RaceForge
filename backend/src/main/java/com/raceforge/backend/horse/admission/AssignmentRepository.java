package com.raceforge.backend.horse.admission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface AssignmentRepository extends JpaRepository<Assignment,Integer> {
    List<Assignment> findByHorseIdOrderByIdDesc(String horseId);
}
