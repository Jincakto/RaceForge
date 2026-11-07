package com.raceforge.backend.storage;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.security.AuthenticatedUser;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class FileController {
    private final ProfileFiles files;

    public FileController(ProfileFiles files) { this.files = files; }

    @PutMapping("/users/me/avatar")
    public ApiResponse<Void> avatar(@AuthenticationPrincipal AuthenticatedUser actor, @RequestPart MultipartFile file) {
        files.avatar(actor.userId(), file);
        return ApiResponse.success("Avatar saved", null);
    }

    @PutMapping("/horses/{horseId}/{kind:image|document}")
    @PreAuthorize("@horseAccess.owns(authentication, #horseId)")
    public ApiResponse<Void> horseFile(@PathVariable String horseId, @PathVariable String kind,
                                      @AuthenticationPrincipal AuthenticatedUser actor, @RequestPart MultipartFile file) {
        files.horseFile(horseId, actor.userId(), file, kind.equals("document"));
        return ApiResponse.success("File saved", null);
    }
}
