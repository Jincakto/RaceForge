// Legacy import: import api from "./api";
import { api } from "./apiClient.js";

export const reportService = {
  getDashboardStats: () => api.get("/reports/dashboard-overview"),
  getTrainingStats: (period?: string) =>
    api.get("/reports/training-stats", { params: { period } }),
};
