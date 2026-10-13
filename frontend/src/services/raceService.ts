import api from "./api";

export const raceService = {
  getResults: (params?: any) => api.get("/race-results", { params }),
  createResult: (data: any) => api.post("/race-results", data),
  updateResult: (id: string | number, data: any) =>
    api.put(`/race-results/${id}`, data),
  deleteResult: (id: string | number) => api.delete(`/race-results/${id}`),
};
