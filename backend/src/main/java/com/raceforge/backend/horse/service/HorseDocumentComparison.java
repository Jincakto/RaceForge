package com.raceforge.backend.horse.service;

import com.raceforge.backend.horse.dto.HorseDocumentReport.Field;
import com.raceforge.backend.horse.entity.Horse;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.function.Function;
import java.util.regex.Pattern;

/** Conservative label-based extraction. Unlabelled/ambiguous values require manual review. */
public final class HorseDocumentComparison {
    private HorseDocumentComparison() {}

    public static List<Field> compare(Horse horse, String text) {
        var fields = new ArrayList<Field>();
        fields.add(field("UELN", horse.getRegistrationNumber(), text,
                "UELN|Universal Equine Life Number|Registration number", value -> {
                    String normalized = normalize(value);
                    return normalized.matches("[0-9]{3}[A-Z0-9]{12}") ? normalized : null;
                }));
        fields.add(field("Horse name", horse.getHorseName(), text, "Horse name|Name", HorseDocumentComparison::normalize));
        fields.add(field("Date of birth", horse.getDateOfBirth() == null ? null : horse.getDateOfBirth().toString(),
                text, "Date of birth|DOB|Birth date", HorseDocumentComparison::date));
        fields.add(field("Gender", horse.getGender(), text, "Gender|Sex", value -> {
            String normalized = normalize(value);
            return List.of("STALLION", "MARE", "GELDING").contains(normalized) ? normalized : null;
        }));
        return List.copyOf(fields);
    }

    private static Field field(String name, String expected, String text, String labels, Function<String, String> normalize) {
        var matcher = Pattern.compile("^[\\t ]*(?:" + labels.replace(" ", "[\\t ]+")
                + ")[\\t ]*[:：][\\t ]*([^\\r\\n]{1,160})[\\t ]*$",
                Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.UNICODE_CASE).matcher(text);
        var values = new LinkedHashMap<String, String>();
        while (matcher.find()) values.putIfAbsent(normalize(matcher.group(1)), matcher.group(1).strip());
        if (values.isEmpty()) return new Field(name, expected, null, "MISSING");
        if (values.size() != 1) return new Field(name, expected, null, "AMBIGUOUS");
        String raw = values.values().iterator().next();
        String extracted = normalize.apply(raw);
        String profile = expected == null ? null : normalize.apply(expected);
        if (profile == null || extracted == null) return new Field(name, expected, raw, "UNSUPPORTED_VALUE");
        return new Field(name, expected, raw, profile.equals(extracted) ? "MATCHED" : "MISMATCH");
    }

    private static String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFKC).strip().replaceAll("\\s+", " ").toUpperCase(Locale.ROOT);
    }

    private static String date(String value) {
        for (var format : List.of(DateTimeFormatter.ISO_LOCAL_DATE,
                DateTimeFormatter.ofPattern("d/M/uuuu").withResolverStyle(ResolverStyle.STRICT))) {
            try { return LocalDate.parse(value.strip(), format).toString(); }
            catch (DateTimeParseException ignored) { /* Unknown date formats require manual review. */ }
        }
        return null;
    }
}
