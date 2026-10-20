ALTER TABLE dbo.Medical_Record ADD measured_weight decimal(8,2) NULL;
GO
ALTER TABLE dbo.Medical_Record ADD CONSTRAINT CK_Medical_MeasuredWeight CHECK(measured_weight IS NULL OR measured_weight>0);
ALTER TABLE dbo.Medical_Record ADD CONSTRAINT CK_Medical_ConfirmedFitness CHECK(
 status<>'CONFIRMED' OR (
  training_eligible IS NOT NULL AND NULLIF(LTRIM(RTRIM(fitness_conclusion)),N'') IS NOT NULL
  AND (training_eligible=0 OR (measured_weight IS NOT NULL AND measured_weight>0 AND health_status IS NOT NULL AND health_status='READY'))
 )
);
