import { request } from "./api.ts";
import { query } from "./query.ts";

export const reportService = {
  getDashboardStats: () => request("/api/reports/dashboard-overview"),
  getTrainingStats: (period?: string) =>
    request("/api/reports/training-stats?" + query({ period })),
};
