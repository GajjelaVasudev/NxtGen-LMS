import React, { useState, useEffect } from "react";
import {
  Mail,
  Search,
  Filter,
  MoreVertical,
  Star,
  Archive,
  Trash2,
  Reply,
  Forward,
  Bell,
  User,
  AlertTriangle
} from "lucide-react";

type InboxMessage = {
  id: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  timestamp: string;
  read: boolean;
  type: "direct_message" | "notification" | "system";
  starred?: boolean;
};

const INBOX_STORAGE = "nxtgen_inbox";

const initialMessages: InboxMessage[] = [
  {
    id: "1",
    from: "Sarah Johnson",
    to: "current_user",
    subject: "Assignment Feedback",
    content: "Great work on your React assignment! I've left some detailed feedback on your code structure.",
    timestamp: "2024-01-28 10:30 AM",
    read: false,
    type: "direct_message"
  },
  {
    id: "2",
    from: "system",
    to: "current_user",
    subject: "New Course Available",
    content: "A new advanced JavaScript course has been added to your learning path.",
    timestamp: "2024-01-28 09:15 AM",
    read: true,
    type: "system"
  }
];

export default function Inbox() {
  const [messages, setMessages] = useState<InboxMessage[]>(() => {
    const stored = localStorage.getItem(INBOX_STORAGE);
    return stored ? JSON.parse(stored) : initialMessages;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);

  // Filter messages
  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         message.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         message.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || message.type === filterType;
    return matchesSearch && matchesType;
  });

  const unreadCount = messages.filter(m => !m.read).length;

  const markAsRead = (messageId: string) => {
    setMessages(prev => 
      prev.map(m => 
        m.id === messageId ? { ...m, read: true } : m
      )
    );
  };

  const toggleStar = (messageId: string) => {
    setMessages(prev => 
      prev.map(m => 
        m.id === messageId ? { ...m, starred: !m.starred } : m
      )
    );
  };

  const deleteMessage = (messageId: string) => {
    if (window.confirm("Delete this message?")) {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setSelectedMessage(null);
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "direct_message": return <Mail size={16} className="text-blue-500" />;
      case "notification": return <Bell size={16} className="text-yellow-500" />;
      case "system": return <AlertTriangle size={16} className="text-green-500" />;
      default: return <Mail size={16} className="text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "direct_message": return "Message";
      case "notification": return "Notification";
      case "system": return "System";
      default: return "Unknown";
    }
  };

  // Save messages when they change
  useEffect(() => {
    localStorage.setItem(INBOX_STORAGE, JSON.stringify(messages));
  }, [messages]);

  return (
    <main className="flex-1 h-full overflow-hidden bg-gray-50">
      <div className="h-full flex">
        {/* Message List */}
        <div className="w-1/3 bg-white border-r flex flex-col">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-900">Inbox</h1>
              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount} unread
              </span>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Messages</option>
              <option value="direct_message">Direct Messages</option>
              <option value="notification">Notifications</option>
              <option value="system">System Messages</option>
            </select>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto">
            {filteredMessages.map((message) => (
              <div
                key={message.id}
                onClick={() => {
                  setSelectedMessage(message);
                  if (!message.read) markAsRead(message.id);
                }}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                  selectedMessage?.id === message.id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
                } ${!message.read ? "bg-blue-25" : ""}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getMessageIcon(message.type)}
                    <span className={`font-medium text-sm ${!message.read ? "text-gray-900" : "text-gray-700"}`}>
                      {message.from}
                    </span>
                    {!message.read && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {getTypeLabel(message.type)}
                    </span>
                    {message.starred && (
                      <Star size={14} className="text-yellow-500 fill-current" />
                    )}
                  </div>
                </div>
                <h3 className={`text-sm mb-1 ${!message.read ? "font-semibold" : ""}`}>
                  {message.subject}
                </h3>
                <p className="text-xs text-gray-600 truncate mb-2">
                  {message.content}
                </p>
                <p className="text-xs text-gray-500">{message.timestamp}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Message Detail */}
        <div className="flex-1 flex flex-col">
          {selectedMessage ? (
            <>
              {/* Message Header */}
              <div className="p-4 border-b bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold">
                      {selectedMessage.from.charAt(0)}
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">{selectedMessage.from}</h2>
                      <p className="text-sm text-gray-500">{selectedMessage.timestamp}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleStar(selectedMessage.id)}
                      className="p-2 hover:bg-gray-100 rounded"
                    >
                      <Star size={16} className={selectedMessage.starred ? "text-yellow-500 fill-current" : "text-gray-400"} />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded">
                      <Archive size={16} className="text-gray-400" />
                    </button>
                    <button 
                      onClick={() => deleteMessage(selectedMessage.id)}
                      className="p-2 hover:bg-gray-100 rounded"
                    >
                      <Trash2 size={16} className="text-gray-400" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded">
                      <MoreVertical size={16} className="text-gray-400" />
                    </button>
                  </div>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">{selectedMessage.subject}</h1>
                <div className="flex items-center gap-2">
                  {getMessageIcon(selectedMessage.type)}
                  <span className="text-sm text-gray-600">{getTypeLabel(selectedMessage.type)}</span>
                </div>
              </div>

              {/* Message Content */}
              <div className="flex-1 p-4 bg-white overflow-y-auto">
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedMessage.content}
                  </p>
                </div>
              </div>

              {/* Message Actions */}
              {selectedMessage.type === "direct_message" && (
                <div className="p-4 border-t bg-white">
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                      <Reply size={16} />
                      Reply
                    </button>
                    <button className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
                      <Forward size={16} />
                      Forward
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <Mail size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No message selected</h3>
                <p className="text-gray-500">Select a message to view its contents</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
