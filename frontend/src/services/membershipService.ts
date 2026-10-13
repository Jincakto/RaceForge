import { request, json } from "./api.ts";
import { numericId, type UserDto } from "../types/api.ts";
export interface PageDto<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
export interface RegistrationDto {
  requestId: number;
  user: UserDto;
  requestedRole: { roleId: number; roleName: string };
  status: string;
  reviewNote: string | null;
  createdAt: string;
}
export const membershipService = {
  mine: () => request<RegistrationDto>("/api/users/me/registration-request"),
  list: (page = 0, status = "PENDING", search = "") =>
    request<PageDto<RegistrationDto>>(
      "/api/registration-requests?" +
        new URLSearchParams({ page: String(page), size: "20", status, search }),
    ),
  approve: (id: number, note: string) =>
    request<RegistrationDto>(
      "/api/registration-requests/" + numericId(id) + "/approve",
      json("POST", { note }),
    ),
  reject: (id: number, reason: string) =>
    request<RegistrationDto>(
      "/api/registration-requests/" + numericId(id) + "/reject",
      json("POST", { reason }),
    ),
};
