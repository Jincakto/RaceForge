import { request, json } from "./api.ts";
import { query } from "./query.ts";

export const plansService = {
  getPlans: (params?: any) => request("/api/training-plans" + (params ? `?${query(params)}` : "")),
  getPlanById: (id: string | number) => request(`/api/training-plans/${id}`),
  createPlan: (data: any) => request("/api/training-plans", json("POST", data)),
  updatePlan: (id: string | number, data: any) =>
    request(`/api/training-plans/${id}`, json("PUT", data)),
};
