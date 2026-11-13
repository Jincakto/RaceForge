package com.raceforge.backend.training.service;

import com.raceforge.backend.training.entity.TrainingCertificate;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.Locale;

@Component
public class TrainingCertificatePdf {
    private static final String ASSETS = "certificates/";
    private static final float PAGE_WIDTH = 768;
    private static final float PAGE_HEIGHT = 512;

    public byte[] render(TrainingCertificate certificate) {
        try (PDDocument document = new PDDocument();
             InputStream background = asset("training-certificate.png");
             InputStream regular = asset("Tinos-Regular.ttf");
             InputStream boldItalic = asset("Tinos-BoldItalic.ttf")) {
            PDPage page = new PDPage(new PDRectangle(PAGE_WIDTH, PAGE_HEIGHT));
            document.addPage(page);
            PDImageXObject template = PDImageXObject.createFromByteArray(
                    document, background.readAllBytes(), "Training certificate");
            PDType0Font labelFont = PDType0Font.load(document, regular);
            PDType0Font nameFont = PDType0Font.load(document, boldItalic);
            String horseName = Normalizer.normalize(
                    certificate.getHorseNameAtIssue().replaceAll("\\s+", " ").strip(), Normalizer.Form.NFC);

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.drawImage(template, 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
                content.setNonStrokingColor(1f, 1f, 1f);
                write(content, nameFont, horseName, 384, 247, 37, 296, true);
                content.setNonStrokingColor(0.035f, 0.09f, 0.17f);
                write(content, labelFont, certificate.getCertificateNumber(), 414, 126, 19, 212, false);
                write(content, labelFont, formatIssueDate(certificate.getIssueDate()), 414, 98, 19, 212, false);
            }

            ByteArrayOutputStream pdf = new ByteArrayOutputStream();
            document.save(pdf);
            return pdf.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Could not generate training certificate PDF", e);
        }
    }

    private static InputStream asset(String fileName) throws IOException {
        return new ClassPathResource(ASSETS + fileName).getInputStream();
    }

    private static void write(PDPageContentStream content, PDType0Font font, String text,
                              float x, float y, float preferredSize, float maxWidth, boolean centered)
            throws IOException {
        float units = font.getStringWidth(text) / 1000;
        float size = units > 0 ? Math.min(preferredSize, maxWidth / units) : preferredSize;
        float baseline = centered ? y - font.getFontDescriptor().getCapHeight() * size / 2000 : y;
        content.beginText();
        content.setFont(font, size);
        content.newLineAtOffset(centered ? x - units * size / 2 : x, baseline);
        content.showText(text);
        content.endText();
    }

    static String formatIssueDate(LocalDate date) {
        int day = date.getDayOfMonth();
        String suffix = switch (day) {
            case 1, 21, 31 -> "st";
            case 2, 22 -> "nd";
            case 3, 23 -> "rd";
            default -> "th";
        };
        return date.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH)
                + " " + day + suffix + ", " + date.getYear();
    }
}
