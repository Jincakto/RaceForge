import api from "./api";

export const sessionService = {
  getSessionById: (id: string | number) => api.get(`/training-sessions/${id}`),

  // 1. Điểm danh
  checkIn: (sessionId: string | number, payload?: any) =>
    api.post(`/training-sessions/${sessionId}/check-in`, payload),

  // 2. Bắt đầu
  startSession: (sessionId: string | number) =>
    api.post(`/training-sessions/${sessionId}/start`),

  // 3. Hoàn thành
  completeSession: (
    sessionId: string | number,
    payload?: { summary?: string; notes?: string },
  ) => api.post(`/training-sessions/${sessionId}/complete`, payload),

  // 4. Ghi chỉ số
  recordMetrics: (
    sessionId: string | number,
    metrics: {
      heartRate?: number;
      speedMax?: number;
      distanceMeters?: number;
      recoveryTimeMinutes?: number;
      notes?: string;
    },
  ) => api.post(`/training-sessions/${sessionId}/metrics`, metrics),
};
