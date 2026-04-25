import type { InterviewSession, FullReport } from './types';

const SESSION_KEY = 'ai_interview_session';
const REPORT_KEY = 'ai_interview_report';

export function saveSession(session: InterviewSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): InterviewSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as InterviewSession) : null;
  } catch {
    return null;
  }
}

export function saveReport(report: FullReport): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REPORT_KEY, JSON.stringify(report));
}

export function loadReport(): FullReport | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(REPORT_KEY);
    return raw ? (JSON.parse(raw) as FullReport) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(REPORT_KEY);
}
