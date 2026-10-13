import api from "./api";

export const reportService = {
  getDashboardStats: () => api.get("/reports/dashboard-overview"),
  getTrainingStats: (period?: string) =>
    api.get("/reports/training-stats", { params: { period } }),
};
