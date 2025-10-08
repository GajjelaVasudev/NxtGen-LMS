export type InboxMessageType = 'assignment-due' | 'assignment-graded' | 'assignment-overdue' | 'new-submission' | 'course-enrollment' | 'system-notification';

export interface InboxMessage {
  id: string;
  type: InboxMessageType;
  title: string;
  message: string;
  assignmentId?: string;
  courseId?: string;
  recipientRole?: string;
  createdAt: number;
  read: boolean;
}

const INBOX_KEY = "nxtgen_inbox";

export function addInboxMessage(message: Omit<InboxMessage, 'id' | 'createdAt' | 'read'>) {
  try {
    const messages = loadInboxMessages();
    const newMessage: InboxMessage = {
      ...message,
      id: String(Date.now()),
      createdAt: Date.now(),
      read: false
    };
    saveInboxMessages([newMessage, ...messages]);
  } catch (error) {
    console.error("Failed to add inbox message:", error);
  }
}

export function loadInboxMessages(): InboxMessage[] {
  try {
    const raw = localStorage.getItem(INBOX_KEY);
    return raw ? (JSON.parse(raw) as InboxMessage[]) : [];
  } catch {
    return [];
  }
}

export function saveInboxMessages(messages: InboxMessage[]) {
  localStorage.setItem(INBOX_KEY, JSON.stringify(messages));
  window.dispatchEvent(new CustomEvent("inbox:updated"));
}

// Role-specific message creators
export const InboxHelpers = {
  notifyStudentAssignmentDue: (assignmentTitle: string, courseName: string, assignmentId: string) =>
    addInboxMessage({
      type: 'assignment-due',
      title: 'Assignment Due Soon',
      message: `Assignment "${assignmentTitle}" is due tomorrow in ${courseName}`,
      assignmentId,
      recipientRole: 'user'
    }),

  notifyStudentGraded: (assignmentTitle: string, grade: number, feedback?: string) =>
    addInboxMessage({
      type: 'assignment-graded',
      title: 'Assignment Graded',
      message: `Your assignment "${assignmentTitle}" has been graded: ${grade}/100. ${feedback || 'No feedback provided.'}`,
      recipientRole: 'user'
    }),

  notifyInstructorSubmission: (studentName: string, assignmentTitle: string, assignmentId: string) =>
    addInboxMessage({
      type: 'new-submission',
      title: 'New Assignment Submission',
      message: `${studentName} submitted assignment "${assignmentTitle}"`,
      assignmentId,
      recipientRole: 'instructor'
    }),

  notifyCreatorEnrollment: (studentName: string, courseName: string, courseId: string) =>
    addInboxMessage({
      type: 'course-enrollment',
      title: 'New Course Enrollment',
      message: `${studentName} enrolled in your course "${courseName}"`,
      courseId,
      recipientRole: 'contentCreator'
    }),

  notifyAdminSystemUpdate: (title: string, message: string) =>
    addInboxMessage({
      type: 'system-notification',
      title,
      message,
      recipientRole: 'admin'
    })
};