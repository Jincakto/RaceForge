package com.raceforge.backend.horse.service;

import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.storage.StorageService;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.Optional;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.encryption.AccessPermission;
import org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class HorseDocumentReviewTest {
    private static final String PATH = "rf/9acf1249-0735-42d8-bdfa-0e26527840db.pdf";
    private final HorseRepository horses = mock(HorseRepository.class);
    private final StorageService storage = mock(StorageService.class);
    private final HorseDocumentReviewService service = new HorseDocumentReviewService(horses, storage);

    private Horse horse() {
        Horse horse = new Horse(); horse.setHorseId("HOR-001"); horse.setHorseName("Thunder");
        horse.setRegistrationNumber("036001123456789"); horse.setDateOfBirth(LocalDate.of(2021, 4, 12));
        horse.setGender("STALLION"); horse.setDocumentUrl(PATH);
        when(horses.findById("HOR-001")).thenReturn(Optional.of(horse));
        return horse;
    }

    private byte[] pdf(String... lines) throws Exception {
        try (var document = new PDDocument(); var output = new ByteArrayOutputStream()) {
            var page = new PDPage(); document.addPage(page);
            try (var content = new PDPageContentStream(document, page)) {
                content.beginText(); content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                content.newLineAtOffset(50, 700);
                for (String line : lines) { content.showText(line); content.newLineAtOffset(0, -20); }
                content.endText();
            }
            document.save(output); return output.toByteArray();
        }
    }

    @Test void matchesLabeledTextButNeverAuthenticatesIssuerOrOwnership() throws Exception {
        horse(); when(storage.readDocument(PATH)).thenReturn(pdf("UELN: 036001123456789", "Horse name: Thunder",
                "Date of birth: 12/04/2021", "Sex: Stallion"));
        var report = service.review("HOR-001");
        assertEquals("MATCHED", report.status()); assertEquals(4, report.fields().size());
        assertEquals("UNVERIFIED", report.documentAuthenticity()); assertEquals("UNVERIFIED", report.ownershipStatus());
        assertEquals(64, report.documentSha256().length()); assertNotNull(report.checkedAt());
    }

    @Test void recomputesAgainstCurrentProfileInsteadOfReusingOldMatch() throws Exception {
        var horse = horse(); when(storage.readDocument(PATH)).thenReturn(pdf("UELN: 036001123456789", "Name: Thunder",
                "DOB: 2021-04-12", "Gender: STALLION"));
        assertEquals("MATCHED", service.review("HOR-001").status());
        horse.setHorseName("Different horse");
        assertEquals("MISMATCH", service.review("HOR-001").status());
    }

    @Test void missingAmbiguousAndUnrecognizedValuesRequireManualReview() throws Exception {
        horse(); when(storage.readDocument(PATH)).thenReturn(pdf("036001123456789 Thunder", "Gender: male"));
        var incomplete = service.review("HOR-001");
        assertEquals("INCOMPLETE", incomplete.status());
        assertEquals("MISSING", incomplete.fields().get(0).status());
        assertEquals("UNSUPPORTED_VALUE", incomplete.fields().get(3).status());
        when(storage.readDocument(PATH)).thenReturn(pdf("Name: Thunder", "Name: Another horse"));
        assertEquals("AMBIGUOUS", service.review("HOR-001").fields().get(1).status());
    }

    @Test void scannedPdfIsAcceptedAsUploadButRequiresManualReview() throws Exception {
        byte[] blank = pdf();
        assertDoesNotThrow(() -> HorseDocumentTextReader.validatePdfUpload(blank));
        assertEquals("UNREADABLE", HorseDocumentTextReader.read(blank).status());
        horse(); when(storage.readDocument(PATH)).thenReturn(blank);
        assertTrue(service.review("HOR-001").fields().isEmpty());
    }

    @Test void rejectsCorruptAndPasswordProtectedUploadsWithOnlyTechnicalErrors() throws Exception {
        var actualStorage = new StorageService("https://example.invalid", "");
        var corrupt = new MockMultipartFile("document", "a.pdf", "application/pdf", "%PDF-corrupt".getBytes());
        var error = assertThrows(ApiException.class, () -> actualStorage.validate(corrupt, true));
        assertEquals("UNREADABLE_DOCUMENT", error.getCode());
        try (var document = new PDDocument(); var output = new ByteArrayOutputStream()) {
            document.addPage(new PDPage());
            document.protect(new StandardProtectionPolicy("owner-password", "user-password", new AccessPermission()));
            document.save(output);
            assertThrows(ApiException.class, () -> HorseDocumentTextReader.validatePdfUpload(output.toByteArray()));
        }
    }

    @Test void legacyUrlsAndTxtNeverTriggerNetworkRetrieval() {
        var horse = horse();
        for (String path : new String[]{"http://127.0.0.1/private", "file:///etc/passwd", PATH.replace(".pdf", ".txt"), null}) {
            horse.setDocumentUrl(path);
            assertEquals("MANUAL_REVIEW", service.review("HOR-001").status());
        }
        verifyNoInteractions(storage);
    }

    @Test void storageFailureIsNotTreatedAsFalseDeclaration() {
        horse(); when(storage.readDocument(PATH)).thenThrow(new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_UNAVAILABLE", "unavailable"));
        var report = service.review("HOR-001");
        assertEquals("SOURCE_UNAVAILABLE", report.status()); assertTrue(report.fields().isEmpty());
    }

    @Test void excessivePageCountRequiresManualReview() throws Exception {
        try (var document = new PDDocument(); var output = new ByteArrayOutputStream()) {
            for (int i = 0; i < 21; i++) document.addPage(new PDPage());
            document.save(output);
            assertEquals("LIMIT_EXCEEDED", HorseDocumentTextReader.read(output.toByteArray()).status());
        }
    }
}
