import React, { useState, useEffect } from "react";
import { Calendar, CheckCircle, AlertCircle, BookOpen, Users, FileText, GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type InboxMessage = {
  id: string;
  type: 'assignment-due' | 'assignment-graded' | 'assignment-overdue' | 'new-submission' | 'course-enrollment' | 'system-notification';
  title: string;
  message: string;
  assignmentId?: string;
  courseId?: string;
  recipientRole?: string; // Target role for this message
  createdAt: number;
  read: boolean;
};

const INBOX_KEY = "nxtgen_inbox";

function loadInboxMessages(): InboxMessage[] {
  try {
    const raw = localStorage.getItem(INBOX_KEY);
    return raw ? (JSON.parse(raw) as InboxMessage[]) : [];
  } catch {
    return [];
  }
}

function saveInboxMessages(messages: InboxMessage[]) {
  localStorage.setItem(INBOX_KEY, JSON.stringify(messages));
  window.dispatchEvent(new CustomEvent("inbox:updated"));
}

export default function Inbox() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<InboxMessage[]>(() => loadInboxMessages());

  // Filter messages based on user role
  const filteredMessages = messages.filter(message => {
    // If no specific role is set, show to everyone
    if (!message.recipientRole) return true;
    
    // Show messages targeted to this user's role
    if (message.recipientRole === user?.role) return true;
    
    // Show messages targeted to "all"
    if (message.recipientRole === "all") return true;
    
    return false;
  });

  useEffect(() => {
    // Mark all messages as read when inbox is opened
    const hasUnread = filteredMessages.some(msg => !msg.read);
    if (hasUnread) {
      const updated = messages.map(msg => 
        filteredMessages.some(fm => fm.id === msg.id) ? { ...msg, read: true } : msg
      );
      setMessages(updated);
      saveInboxMessages(updated);
    }
  }, []);

  const deleteMessage = (messageId: string) => {
    const updated = messages.filter(msg => msg.id !== messageId);
    setMessages(updated);
    saveInboxMessages(updated);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'assignment-due':
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'assignment-graded':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'assignment-overdue':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'new-submission':
        return <FileText className="w-5 h-5 text-purple-500" />;
      case 'course-enrollment':
        return <GraduationCap className="w-5 h-5 text-indigo-500" />;
      case 'system-notification':
        return <Users className="w-5 h-5 text-gray-500" />;
      default:
        return <BookOpen className="w-5 h-5 text-gray-500" />;
    }
  };

  const getMessagePriority = (type: string) => {
    const priorities = {
      'assignment-overdue': 'high',
      'new-submission': 'high',
      'assignment-due': 'medium',
      'assignment-graded': 'medium',
      'course-enrollment': 'low',
      'system-notification': 'low'
    };
    return priorities[type as keyof typeof priorities] || 'low';
  };

  const sortedMessages = filteredMessages.sort((a, b) => {
    // Sort by priority first, then by date
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[getMessagePriority(a.type) as keyof typeof priorityOrder];
    const bPriority = priorityOrder[getMessagePriority(b.type) as keyof typeof priorityOrder];
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    return b.createdAt - a.createdAt;
  });

  const unreadCount = filteredMessages.filter(msg => !msg.read).length;

  return (
    <main className="flex-1 p-6 overflow-y-auto bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-nxtgen-text-primary">Inbox</h1>
            <p className="text-sm text-gray-600">
              {user?.role === 'instructor' && 'Assignment submissions and grading notifications'}
              {user?.role === 'user' && 'Assignment deadlines and grade notifications'}
              {user?.role === 'contentCreator' && 'Course enrollments and content updates'}
              {user?.role === 'admin' && 'System notifications and platform updates'}
            </p>
          </div>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-sm px-2 py-1 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>

        <div className="space-y-3">
          {sortedMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-lg mb-2">No messages in your inbox</div>
              <p className="text-sm">
                {user?.role === 'instructor' && 'You\'ll receive notifications when students submit assignments'}
                {user?.role === 'user' && 'You\'ll receive notifications about assignment deadlines and grades'}
                {user?.role === 'contentCreator' && 'You\'ll receive notifications about course activities'}
                {user?.role === 'admin' && 'You\'ll receive system notifications and updates'}
              </p>
            </div>
          ) : (
            sortedMessages.map((message) => {
              const priority = getMessagePriority(message.type);
              return (
                <div 
                  key={message.id} 
                  className={`border rounded-lg p-4 ${
                    message.read ? 'bg-white' : 'bg-blue-50 border-blue-200'
                  } ${
                    priority === 'high' ? 'border-l-4 border-l-red-500' :
                    priority === 'medium' ? 'border-l-4 border-l-yellow-500' :
                    'border-l-4 border-l-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getIcon(message.type)}
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`font-medium ${!message.read ? 'font-bold' : ''}`}>
                          {message.title}
                          {priority === 'high' && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              High Priority
                            </span>
                          )}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 text-sm mb-3">
                        {message.message}
                      </p>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => deleteMessage(message.id)}
                          className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
