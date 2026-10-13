import api from "./api";

export const trainingService = {
  // Gói tập: tạo, sửa, bật/tắt
  getPackages: (params?: any) => api.get("/training-packages", { params }),
  createPackage: (data: any) => api.post("/training-packages", data),
  updatePackage: (id: string | number, data: any) =>
    api.put(`/training-packages/${id}`, data),
  togglePackageStatus: (id: string | number, isActive: boolean) =>
    api.patch(`/training-packages/${id}/status`, { isActive }),

  // Lịch tập: đơn và định kỳ
  getSchedules: (params?: any) => api.get("/training-schedules", { params }),
  createSingleSchedule: (data: any) =>
    api.post("/training-schedules/single", data),
  createRecurringSchedule: (data: any) =>
    api.post("/training-schedules/recurring", data),
};
