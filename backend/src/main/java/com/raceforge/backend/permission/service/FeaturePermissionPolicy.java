package com.raceforge.backend.permission.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * Permissions for existing business roles. A grant never replaces the role,
 * horse ownership, or assignment checks already enforced by controllers.
 * Endpoint rules below cover only unambiguous API actions. Other grants are
 * currently UI visibility controls and are labelled as such in the matrix.
 */
@Component
public class FeaturePermissionPolicy {
    public static final Map<String, List<String>> DEFAULT_GRANTS = defaults();

    private static Map<String, List<String>> defaults() {
        Map<String, List<String>> values = new LinkedHashMap<>();
        values.put("VIEW_CLUB_HORSES", List.of("CLUB_MANAGER", "HEAD_TRAINER", "VETERINARIAN"));
        values.put("VIEW_MY_HORSES", List.of("HORSE_OWNER"));
        values.put("REGISTER_HORSE", List.of("HORSE_OWNER"));
        values.put("MANAGE_HORSE_INTAKE", List.of("CLUB_MANAGER"));
        values.put("VIEW_MEDICAL_RECORDS", List.of("CLUB_MANAGER", "VETERINARIAN", "HORSE_OWNER"));
        values.put("WRITE_MEDICAL_RECORD", List.of("VETERINARIAN"));
        values.put("ACCESS_VET_ASSIGNMENTS", List.of("VETERINARIAN"));
        values.put("MANAGE_VET_ASSIGNMENTS", List.of("CLUB_MANAGER"));
        values.put("REGISTER_TRAINING_PACKAGE", List.of("HORSE_OWNER"));
        values.put("MANAGE_PACKAGE_CATALOG", List.of("CLUB_MANAGER"));
        values.put("VIEW_PERFORMANCE", List.of("HORSE_OWNER"));
        values.put("CARE_TASKS", List.of("GROOM"));
        values.put("VIEW_INVENTORY", List.of("GROOM"));
        values.put("VIEW_STAFF", List.of("CLUB_MANAGER"));
        return Map.copyOf(values);
    }

    public boolean mayGrant(String role, String code) {
        List<String> roles = DEFAULT_GRANTS.get(code);
        if (roles != null) return roles.contains(role);
        return switch (code) {
            case "ASSIGN_TRAINER", "VIEW_REPORTS" -> "CLUB_MANAGER".equals(role);
            case "MANAGE_TRAINING" -> "HEAD_TRAINER".equals(role);
            case "VIEW_TRAINING" -> Set.of("CLUB_MANAGER", "HEAD_TRAINER", "HORSE_OWNER").contains(role);
            case "MANAGE_PERMISSION", "MANAGE_ACCOUNTS" -> "ADMIN".equals(role);
            default -> true; // Other historical administrative permissions keep their current checks.
        };
    }

    /** Return null when an action has no separate matrix grant. */
    public String requiredFor(String role, String method, String path) {
        if (role == null || method == null || path == null) return null;
        boolean get = "GET".equals(method);
        boolean post = "POST".equals(method);
        boolean edit = post || "PUT".equals(method) || "PATCH".equals(method) || "DELETE".equals(method);
        if (get && path.matches("/api/horses(?:/[^/]+)?")) {
            if ("HORSE_OWNER".equals(role)) return "VIEW_MY_HORSES";
            if (Set.of("CLUB_MANAGER", "HEAD_TRAINER", "VETERINARIAN").contains(role)) return "VIEW_CLUB_HORSES";
        }
        if ("HORSE_OWNER".equals(role) && post
                && (path.equals("/api/horses") || path.matches("/api/horses/[^/]+/admission")))
            return "REGISTER_HORSE";
        if ("CLUB_MANAGER".equals(role)
                && ((post && path.matches("/api/horses/[^/]+/admission/(approve|reject)"))
                    || ("PATCH".equals(method) && path.matches("/api/horses/[^/]+/(activate|deactivate)"))))
            return "MANAGE_HORSE_INTAKE";
        if ("CLUB_MANAGER".equals(role) && edit
                && (path.matches("/api/horses/[^/]+/trainers(?:/[^/]+)?")
                    || path.matches("/api/horses/[^/]+/trainer")))
            return "ASSIGN_TRAINER";
        if (get && Set.of("CLUB_MANAGER", "VETERINARIAN", "HORSE_OWNER").contains(role)
                && (path.matches("/api/medical/records/[^/]+")
                    || path.matches("/api/medical/horses/[^/]+/(records|previous-examination|training-lock/history)")))
            return "VIEW_MEDICAL_RECORDS";
        if ("VETERINARIAN".equals(role) && edit
                && (path.equals("/api/medical/records") || path.startsWith("/api/medical/records/")
                    || path.matches("/api/medical/horses/[^/]+/(evaluation|training-lock/unlock)")))
            return "WRITE_MEDICAL_RECORD";
        if ("VETERINARIAN".equals(role)
                && ((get && path.startsWith("/api/medical/assignments/mine"))
                    || (post && path.matches("/api/medical/assignments/[^/]+/(accept|decline)"))))
            return "ACCESS_VET_ASSIGNMENTS";
        if ("CLUB_MANAGER".equals(role) && post && path.matches("/api/medical/assignments/horses/[^/]+"))
            return "MANAGE_VET_ASSIGNMENTS";
        if ("HORSE_OWNER".equals(role) && post && path.equals("/api/horse-packages/register"))
            return "REGISTER_TRAINING_PACKAGE";
        if ((get || post) && (path.equals("/api/training-packages") || path.startsWith("/api/training-packages/"))) {
            if ("CLUB_MANAGER".equals(role)) return "MANAGE_PACKAGE_CATALOG";
            if (get && "HORSE_OWNER".equals(role)) return "REGISTER_TRAINING_PACKAGE";
        }
        // CARE_TASKS, VIEW_INVENTORY, VIEW_PERFORMANCE and VIEW_STAFF
        // affect UI visibility only: their current APIs do not provide a distinct
        // independent operation that can safely be protected without refactoring.
        return null;
    }
}
