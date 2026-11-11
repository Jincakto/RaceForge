package com.raceforge.backend.training.service;

import com.raceforge.backend.training.entity.TrainingCertificate;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class TrainingCertificatePdfTest {
    @Test
    void rendersPersistedUnicodeNameNumberAndIssueDate() throws Exception {
        String name = "Ngựa Ánh Dương Vượt Sóng ".repeat(4).strip();
        var certificate = new TrainingCertificate("HPG-010", name, LocalDate.of(2026, 1, 13));
        byte[] pdf = new TrainingCertificatePdf().render(certificate);
        try (var document = Loader.loadPDF(pdf)) {
            assertEquals(1, document.getNumberOfPages());
            assertEquals(768, document.getPage(0).getMediaBox().getWidth());
            assertEquals(512, document.getPage(0).getMediaBox().getHeight());
            String text = new PDFTextStripper().getText(document);
            assertTrue(text.contains(name), text);
            assertTrue(text.contains("RF-HPG-010"), text);
            assertTrue(text.contains("January 13th, 2026"), text);
        }
    }

    @Test
    void formatsOrdinalSuffixesIncludingTeenExceptions() {
        Map<Integer, String> suffixes = Map.of(1, "st", 2, "nd", 3, "rd", 5, "th", 11, "th",
                12, "th", 13, "th", 21, "st", 22, "nd", 23, "rd");
        suffixes.forEach((day, suffix) -> assertEquals("January " + day + suffix + ", 2026",
                TrainingCertificatePdf.formatIssueDate(LocalDate.of(2026, 1, day))));
    }
}
