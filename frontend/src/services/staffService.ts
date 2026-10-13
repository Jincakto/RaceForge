import { request, json } from "./api.ts";
import { numericId, type UserDto } from "../types/api.ts";
import type { PageDto } from "./membershipService.ts";
export const staffService = {
  list: (page = 0, search = "", status = "", roleId = "") =>
    request<PageDto<UserDto>>(
      "/api/users?" +
        new URLSearchParams({
          page: String(page),
          size: "20",
          search,
          status,
          roleId,
        }),
    ),
  get: (id: number) => request<UserDto>("/api/users/" + numericId(id)),
  status: (id: number, status: "ACTIVE" | "INACTIVE") =>
    request<UserDto>(
      "/api/users/" + numericId(id) + "/status",
      json("PATCH", { status }),
    ),
  permissions: (roleName: string) =>
    request<string[]>("/api/admin/permissions/" + encodeURIComponent(roleName)),
  grant: (roleName: string, permissionCode: string) =>
    request(
      "/api/admin/permissions/grant",
      json("POST", { roleName, permissionCode }),
    ),
  revoke: (roleName: string, permissionCode: string) =>
    request(
      "/api/admin/permissions/revoke?" +
        new URLSearchParams({ roleName, permissionCode }),
      json("DELETE"),
    ),
  catalog: () =>
    request<{ permissionName: string; description: string }[]>(
      "/api/admin/permissions/catalog",
    ),
};
