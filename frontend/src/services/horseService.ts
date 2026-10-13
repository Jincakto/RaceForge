import api from "./api";

export const horseService = {
  getHorses: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) => api.get("/horses", { params }),

  getHorseById: (id: string | number) => api.get(`/horses/${id}`),

  updateHorse: (id: string | number, data: any) =>
    api.put(`/horses/${id}`, data),
};
