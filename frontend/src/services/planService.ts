import api from "./api";

export const plansService = {
  getPlans: (params?: any) => api.get("/training-plans", { params }),
  getPlanById: (id: string | number) => api.get(`/training-plans/${id}`),
  createPlan: (data: any) => api.post("/training-plans", data),
  updatePlan: (id: string | number, data: any) =>
    api.put(`/training-plans/${id}`, data),
};
