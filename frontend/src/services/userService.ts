import { request, json } from "./api.ts";
import type { UserDto } from "../types/api.ts";
export const userService = {
  me: () => request<UserDto>("/api/users/me"),
  update: (body: { fullName: string; phone: string; avatarUrl: string }) =>
    request<UserDto>("/api/users/me", json("PUT", body)),
  password: (currentPassword: string, newPassword: string) =>
    request(
      "/api/users/me/password",
      json("PUT", { currentPassword, newPassword }),
    ),
};
