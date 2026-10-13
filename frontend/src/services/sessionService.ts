import { request, json } from "./api.ts";

export const sessionService = {
  getSessionById: (id: string | number) => request(`/api/training-sessions/${id}`),

  // 1. Điểm danh
  checkIn: (sessionId: string | number, payload?: any) =>
    request(`/api/training-sessions/${sessionId}/check-in`, json("POST", payload)),

  // 2. Bắt đầu
  startSession: (sessionId: string | number) =>
    request(`/api/training-sessions/${sessionId}/start`, json("POST")),

  // 3. Hoàn thành
  completeSession: (
    sessionId: string | number,
    payload?: { summary?: string; notes?: string },
  ) => request(`/api/training-sessions/${sessionId}/complete`, json("POST", payload)),

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
  ) => request(`/api/training-sessions/${sessionId}/metrics`, json("POST", metrics)),
};
