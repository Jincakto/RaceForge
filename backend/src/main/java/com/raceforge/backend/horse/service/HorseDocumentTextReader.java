package com.raceforge.backend.horse.service;

import com.raceforge.backend.common.exception.ApiException;
import java.io.IOException;
import java.util.List;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;
import org.springframework.http.HttpStatus;

/** Bounded PDF text extraction only: no OCR, remote links, scripts or authenticity claims. */
public final class HorseDocumentTextReader {
    private static final int MAX_PAGES = 20;
    private static final int MAX_TEXT = 100_000;
    private HorseDocumentTextReader() {}

    public record TextResult(String status, String text, String message) {}

    public static void validatePdfUpload(byte[] bytes) {
        try (var pdf = Loader.loadPDF(bytes)) {
            if (pdf.isEncrypted() || pdf.getNumberOfPages() == 0) throw new IOException();
        } catch (IOException | RuntimeException invalid) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "UNREADABLE_DOCUMENT",
                    "The PDF cannot be read or is password protected. Please upload a readable PDF.");
        }
    }

    public static TextResult read(byte[] bytes) {
        if (bytes == null || bytes.length == 0 || bytes.length > 10 * 1024 * 1024) {
            return new TextResult("UNREADABLE", "", "The document is empty or exceeds the reading limit.");
        }
        try (var pdf = Loader.loadPDF(bytes)) {
            if (pdf.isEncrypted()) return new TextResult("UNREADABLE", "", "Encrypted PDF; manual review required.");
            if (pdf.getNumberOfPages() > MAX_PAGES) {
                return new TextResult("LIMIT_EXCEEDED", "", "More than 20 pages; review the document manually.");
            }
            var stripper = new PDFTextStripper() {
                private int characters;
                @Override protected void writeString(String text, List<TextPosition> positions) throws IOException {
                    characters += text.length();
                    if (characters > MAX_TEXT) throw new IOException("Text extraction limit");
                    super.writeString(text, positions);
                }
            };
            stripper.setSortByPosition(true);
            String text = stripper.getText(pdf);
            if (text.isBlank()) return new TextResult("UNREADABLE", "",
                    "No selectable text found. This may be a scanned PDF; review manually. OCR is not available.");
            return new TextResult("READABLE", text, "Text extracted; compare the original document manually as needed.");
        } catch (IOException | RuntimeException unreadable) {
            return new TextResult("UNREADABLE", "", "PDF text could not be extracted; manual review required.");
        }
    }
}
