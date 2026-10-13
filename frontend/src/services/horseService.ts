import api from './api'; // hoặc apiClient

export const horseService = {
  // Lấy danh sách ngựa
  getHorses: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    api.get('/horses', { params }),

  // Chi tiết ngựa
  getHorseById: (id: string | number) => 
    api.get(`/horses/${id}`),

  // Cập nhật thông tin ngựa
  updateHorse: (id: string | number, data: any) => 
    api.put(`/horses/${id}`, data),
};