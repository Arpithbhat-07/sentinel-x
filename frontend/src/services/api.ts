import {
  User,
  Scenario,
  Exercise,
  Participant,
  CommunicationMessage,
  InformationReport,
  Decision,
  AARReport,
  ExerciseLogItem
} from '../types';

const rawBase = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'http://localhost:8000'
).trim().replace(/\/+$/, '');

const API_BASE = rawBase.endsWith('/api') ? rawBase.slice(0, -4) : rawBase;

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options?.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export const api = {
  // Auth & Roles
  demoLogin: (role: string, displayName?: string) =>
    request<User>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ role, display_name: displayName })
    }),
  getUsers: () => request<User[]>('/api/auth/users'),

  // Scenarios
  getScenarios: () => request<Scenario[]>('/api/scenarios'),
  getScenario: (id: string) => request<Scenario>(`/api/scenarios/${id}`),
  createScenario: (data: Partial<Scenario>) =>
    request<Scenario>('/api/scenarios', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  deleteScenario: (id: string) =>
    request<{ status: string; id: string }>(`/api/scenarios/${id}`, { method: 'DELETE' }),

  // Exercises
  getExercises: () => request<Exercise[]>('/api/exercises'),
  getExerciseCounts: () =>
    request<{ active_exercises: number; completed_exercises: number; total_scenarios: number; total_trainees: number }>(
      '/api/exercises/active-count'
    ),
  getExercise: (idOrCode: string) => request<Exercise>(`/api/exercises/${idOrCode}`),
  createExercise: (scenarioId: string, isDemo = false, customCode?: string) =>
    request<Exercise>('/api/exercises', {
      method: 'POST',
      body: JSON.stringify({ scenario_id: scenarioId, is_demo: isDemo, custom_code: customCode })
    }),
  startDemoExercise: () => request<Exercise>('/api/exercises/demo', { method: 'POST' }),
  startExercise: (id: string) => request<{ status: string }>(`/api/exercises/${id}/start`, { method: 'POST' }),
  pauseExercise: (id: string) => request<{ status: string }>(`/api/exercises/${id}/pause`, { method: 'POST' }),
  resumeExercise: (id: string) => request<{ status: string }>(`/api/exercises/${id}/resume`, { method: 'POST' }),
  endExercise: (id: string) => request<{ status: string }>(`/api/exercises/${id}/end`, { method: 'POST' }),
  joinExercise: (exerciseId: string, role: string, displayName: string, userId?: string) =>
    request<Participant>(`/api/exercises/${exerciseId}/join?role=${encodeURIComponent(role)}&display_name=${encodeURIComponent(displayName)}${userId ? `&user_id=${userId}` : ''}`, {
      method: 'POST'
    }),

  // Trainee Communication
  getMessages: (exerciseId: string, role?: string) =>
    request<CommunicationMessage[]>(`/api/exercises/${exerciseId}/messages${role ? `?role=${encodeURIComponent(role)}` : ''}`),
  sendMessage: (exerciseId: string, recipientRole: string, content: string, senderRole: string, senderName: string) =>
    request<CommunicationMessage>(
      `/api/exercises/${exerciseId}/messages?sender_role=${encodeURIComponent(senderRole)}&sender_name=${encodeURIComponent(senderName)}`,
      {
        method: 'POST',
        body: JSON.stringify({ recipient_role: recipientRole, content })
      }
    ),

  // Information Reports
  getReports: (exerciseId: string, role?: string) =>
    request<InformationReport[]>(`/api/exercises/${exerciseId}/reports${role ? `?role=${encodeURIComponent(role)}` : ''}`),
  createReport: (exerciseId: string, data: Partial<InformationReport>, creatorRole: string) =>
    request<InformationReport>(`/api/exercises/${exerciseId}/reports?creator_role=${encodeURIComponent(creatorRole)}`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Decisions
  getDecisions: (exerciseId: string) => request<Decision[]>(`/api/exercises/${exerciseId}/decisions`),
  submitDecision: (exerciseId: string, data: { decision_type: string; action_target: string; rationale: string; confidence_score: number }, role: string) =>
    request<Decision>(`/api/exercises/${exerciseId}/decisions?participant_role=${encodeURIComponent(role)}`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Instructor Event Injection & Logs
  injectEvent: (exerciseId: string, eventData: any) =>
    request<any>(`/api/exercises/${exerciseId}/events/inject`, {
      method: 'POST',
      body: JSON.stringify(eventData)
    }),
  getExerciseEvents: (exerciseId: string) => request<any[]>(`/api/exercises/${exerciseId}/events`),
  getExerciseLogs: (exerciseId: string) => request<ExerciseLogItem[]>(`/api/exercises/${exerciseId}/events/logs`),

  // After Action Review
  getAAR: (exerciseId: string) => request<AARReport>(`/api/exercises/${exerciseId}/aar`),
  generateAAR: (exerciseId: string) => request<AARReport>(`/api/exercises/${exerciseId}/aar/generate`, { method: 'POST' }),
  downloadAARPDF: async (exerciseId: string): Promise<Blob> => {
    const url = `${API_BASE}/api/exercises/${exerciseId}/aar/pdf`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download AAR PDF: ${response.statusText}`);
    }
    return response.blob();
  },

  // AI Services
  generateAIScenario: (objective: string, difficulty: string, durationMinutes: number, disruptions: string[]) =>
    request<Scenario>('/api/ai/scenario/generate', {
      method: 'POST',
      body: JSON.stringify({
        objective,
        difficulty,
        duration_minutes: durationMinutes,
        desired_disruptions: disruptions
      })
    }),
  analyzeAARWithAI: (exerciseId: string) =>
    request<any>('/api/ai/aar/analyze', {
      method: 'POST',
      body: JSON.stringify({ exercise_id: exerciseId })
    })
};
