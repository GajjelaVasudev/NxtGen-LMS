export type InboxMessageType =
  | 'assignment-due'
  | 'assignment-graded'
  | 'assignment-overdue'
  | 'new-submission'
  | 'course-enrollment'
  | 'system-notification'
  | 'custom';

export interface InboxMessage {
  id: string;
  type: InboxMessageType;
  title: string;
  message: string;
  assignmentId?: string | null;
  courseId?: string | null;
  recipientRole?: string | null;
  createdAt: number;
  read: boolean;
}

const API = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_URL as string) || '/api';
import { createClient } from '@supabase/supabase-js';

async function getSupabaseToken() {
  const supUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!supUrl || !supKey) return null;
  try {
    const sup = createClient(supUrl, supKey);
    const resp: any = await sup.auth.getSession?.();
    return resp?.data?.session?.access_token || null;
  } catch (e) {
    return null;
  }
}

function mapServerRowToInbox(row: any): InboxMessage {
  return {
    id: String(row.id),
    type: (row.type as InboxMessageType) || 'custom',
    title: row.subject || row.title || 'Message',
    message: row.body || row.content || row.message || '',
    assignmentId: row.assignment_id || row.assignmentId || null,
    courseId: row.course_id || row.courseId || null,
    recipientRole: row.to_role || row.recipientRole || null,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    read: !!row.is_read,
  };
}

export async function loadInboxMessages(userId?: string, role?: string): Promise<InboxMessage[]> {
  try {
    const token = await getSupabaseToken();
    const q = (!token && userId) ? `?userId=${encodeURIComponent(userId)}&role=${encodeURIComponent(role || '')}` : (role ? `?role=${encodeURIComponent(role)}` : '');
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const res = await fetch(`${API}/inbox${q}`, { headers });
    if (!res.ok) return [];
    const body = await res.json();
    const rows = body.data || body.messages || [];
    return (rows || []).map(mapServerRowToInbox);
  } catch (err) {
    console.warn('Failed to load inbox messages', err);
    return [];
  }
}

export async function sendInboxMessage(payload: any, fromUserId?: string) {
  try {
    const token = await getSupabaseToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    else if (fromUserId) headers['x-user-id'] = String(fromUserId);
    const res = await fetch(`${API}/inbox/send`, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Failed to send inbox message: ${res.status} ${txt}`);
    }
    const body = await res.json();
    // notify UI listeners that inbox changed
    try { window.dispatchEvent(new CustomEvent('inbox:updated')); } catch {}
    return body;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function markRead(ids: string[]) {
  const res = await fetch(`${API}/inbox/mark-read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
  const ok = res.ok;
  if (ok) {
    try { window.dispatchEvent(new CustomEvent('inbox:updated')); } catch {}
  }
  return ok;
}

export async function deleteMessages(ids: string[]) {
  const res = await fetch(`${API}/inbox/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
  const ok = res.ok;
  if (ok) {
    try { window.dispatchEvent(new CustomEvent('inbox:updated')); } catch {}
  }
  return ok;
}

export async function starMessage(id: string, starred: boolean) {
  const res = await fetch(`${API}/inbox/star`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, starred }) });
  const ok = res.ok;
  if (ok) {
    try { window.dispatchEvent(new CustomEvent('inbox:updated')); } catch {}
  }
  return ok;
}

// Role-specific helpers that call the server-side inbox API
export const InboxHelpers = {
  notifyStudentAssignmentDue: (assignmentTitle: string, courseName: string, assignmentId: string, fromUserId?: string) =>
    sendInboxMessage({ subject: 'Assignment Due Soon', content: `Assignment "${assignmentTitle}" is due tomorrow in ${courseName}`, assignmentId, recipientRole: 'user' }, fromUserId),

  notifyStudentGraded: (assignmentTitle: string, grade: number, feedback?: string, fromUserId?: string) =>
    sendInboxMessage({ subject: 'Assignment Graded', content: `Your assignment "${assignmentTitle}" has been graded: ${grade}/100. ${feedback || 'No feedback provided.'}`, recipientRole: 'user' }, fromUserId),

  notifyInstructorSubmission: (studentName: string, assignmentTitle: string, assignmentId: string, fromUserId?: string) =>
    sendInboxMessage({ subject: 'New Assignment Submission', content: `${studentName} submitted assignment "${assignmentTitle}"`, assignmentId, recipientRole: 'instructor' }, fromUserId),

  notifyCreatorEnrollment: (studentName: string, courseName: string, courseId: string, fromUserId?: string) =>
    sendInboxMessage({ subject: 'New Course Enrollment', content: `${studentName} enrolled in your course "${courseName}"`, course_id: courseId, recipientRole: 'contentCreator' }, fromUserId),

  notifyAdminSystemUpdate: (title: string, message: string, fromUserId?: string) =>
    sendInboxMessage({ subject: title, content: message, recipientRole: 'admin' }, fromUserId),
};