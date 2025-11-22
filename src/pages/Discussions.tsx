import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Heart,
  MessageCircle,
  Share,
  Flag,
  User,
  Mail,
  UserX,
  Bell,
  Smile,
  Check,
  Edit2,
  Trash2,
  Send,
  X,
  ArrowLeft
} from "lucide-react";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useAuth } from "@/contexts/AuthContext";

type DiscussionMessage = {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  message: string;
  createdAt: number;
  editedAt?: number;
  topic?: string;
  isLiked?: boolean;
  likes?: number;
};

type DirectMessage = {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  message: string;
  timestamp: number;
  read: boolean;
};

type Conversation = {
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
};

type User = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
};

const DISCUSSIONS_KEY = "nxtgen_discussions";
const DIRECT_MESSAGES_KEY = "nxtgen_direct_messages";
const BLOCKED_USERS_STORAGE = "nxtgen_blocked_users";

function loadDiscussions(): DiscussionMessage[] {
  try {
    const raw = localStorage.getItem(DISCUSSIONS_KEY);
    return raw ? (JSON.parse(raw) as DiscussionMessage[]) : [];
  } catch {
    return [];
  }
}

function saveDiscussions(updated: DiscussionMessage[]) {
  try {
    localStorage.setItem(DISCUSSIONS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("discussions:updated"));
  } catch {
    // ignore storage errors
  }
}

function loadDirectMessages(): DirectMessage[] {
  try {
    const raw = localStorage.getItem(DIRECT_MESSAGES_KEY);
    return raw ? (JSON.parse(raw) as DirectMessage[]) : [];
  } catch {
    return [];
  }
}

function saveDirectMessages(messages: DirectMessage[]) {
  try {
    localStorage.setItem(DIRECT_MESSAGES_KEY, JSON.stringify(messages));
    window.dispatchEvent(new CustomEvent("directMessages:updated"));
  } catch {
    // ignore
  }
}

type CanonicalRole = "admin" | "instructor" | "contentCreator" | "user";

function normalizeRole(role?: string): CanonicalRole {
  const v = (role || "").toLowerCase();
  if (v === "admin" || v === "administrator") return "admin";
  if (v === "instructor" || v === "teacher") return "instructor";
  if (v === "contentcreator" || v === "creator") return "contentCreator";
  return "user";
}

function roleLabel(role: CanonicalRole) {
  switch (role) {
    case "admin": return "Admin";
    case "instructor": return "Instructor";
    case "contentCreator": return "Creator";
    case "user": default: return "Student";
  }
}

function roleBadgeClass(role: CanonicalRole) {
  switch (role) {
    case "admin": return "bg-red-100 text-red-700";
    case "instructor": return "bg-blue-100 text-blue-700";
    case "contentCreator": return "bg-green-100 text-green-700";
    case "user": default: return "bg-purple-100 text-purple-700";
  }
}

function hashToColorPair(input: string) {
  const colors = [
    "from-blue-400 to-cyan-600",
    "from-purple-400 to-pink-600",
    "from-green-400 to-emerald-600",
    "from-yellow-400 to-orange-600",
    "from-red-400 to-rose-600",
    "from-indigo-400 to-purple-600",
  ];
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  return colors[hash % colors.length];
}

export default function Discussions() {
  const [discussions, setDiscussions] = useState<DiscussionMessage[]>(() => loadDiscussions());
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>(() => loadDirectMessages());
  const [newMessage, setNewMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [showProfileMenu, setShowProfileMenu] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<string[]>(() => {
    const stored = localStorage.getItem(BLOCKED_USERS_STORAGE);
    return stored ? JSON.parse(stored) : [];
  });

  // Direct messaging state
  const [showInbox, setShowInbox] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [dmMessage, setDmMessage] = useState("");
  const [showDmEmojiPicker, setShowDmEmojiPicker] = useState(false);

  const { user: authUser } = useAuth() as { user?: { id?: string; name?: string; email?: string; role?: string } };

  const currentUser: User = {
    id: authUser?.id || authUser?.email || "current_user",
    name: authUser?.name || authUser?.email || "You",
    email: authUser?.email,
    role: normalizeRole(authUser?.role),
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const dmTextareaRef = useRef<HTMLTextAreaElement>(null);
  const dmMessagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollDmToBottom = () => {
    dmMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [discussions]);

  useEffect(() => {
    scrollDmToBottom();
  }, [directMessages, selectedConversation]);

  // Real-time updates
  useEffect(() => {
    const handler = () => {
      const updated = loadDiscussions();
      setDiscussions(updated);
    };
    const dmHandler = () => {
      const updated = loadDirectMessages();
      setDirectMessages(updated);
    };
    window.addEventListener("discussions:updated", handler);
    window.addEventListener("directMessages:updated", dmHandler);
    
    const interval = setInterval(() => {
      const updated = loadDiscussions();
      setDiscussions(updated);
      const dmUpdated = loadDirectMessages();
      setDirectMessages(dmUpdated);
    }, 2000);

    return () => {
      window.removeEventListener("discussions:updated", handler);
      window.removeEventListener("directMessages:updated", dmHandler);
      clearInterval(interval);
    };
  }, []);

  const canEdit = (message: DiscussionMessage) => {
    if (message.userId !== currentUser?.id) return false;
    const twoMinutes = 2 * 60 * 1000;
    const timeSinceCreation = Date.now() - message.createdAt;
    return timeSinceCreation < twoMinutes;
  };

  const canDelete = (message: DiscussionMessage) => {
    if (currentUser?.role === "admin") return true;
    return message.userId === currentUser?.id;
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    const message: DiscussionMessage = {
      id: String(Date.now()),
      userId: currentUser.id!,
      userName: currentUser.name || currentUser.email || "You",
      userRole: normalizeRole(currentUser.role) as CanonicalRole,
      message: newMessage.trim(),
      createdAt: Date.now(),
      topic: "General"
    };

    const updated = [...discussions, message];
    setDiscussions(updated);
    saveDiscussions(updated);
    setNewMessage("");
    setShowEmojiPicker(false);
  };

  const handleEditMessage = (messageId: string) => {
    const message = discussions.find(m => m.id === messageId);
    if (message && canEdit(message)) {
      setEditingMessageId(messageId);
      setEditingText(message.message);
    }
  };

  const handleSaveEdit = () => {
    if (!editingText.trim() || !editingMessageId) return;

    const updated = discussions.map(msg => {
      if (msg.id === editingMessageId) {
        return {
          ...msg,
          message: editingText.trim(),
          editedAt: Date.now()
        };
      }
      return msg;
    });

    setDiscussions(updated);
    saveDiscussions(updated);
    setEditingMessageId(null);
    setEditingText("");
    setShowEditEmojiPicker(false);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
    setShowEditEmojiPicker(false);
  };

  const handleDeleteMessage = (messageId: string) => {
    const message = discussions.find(m => m.id === messageId);
    if (!message || !canDelete(message)) return;

    if (window.confirm("Are you sure you want to delete this message?")) {
      const updated = discussions.filter(m => m.id !== messageId);
      setDiscussions(updated);
      saveDiscussions(updated);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleEditEmojiClick = (emojiData: EmojiClickData) => {
    setEditingText(prev => prev + emojiData.emoji);
    setShowEditEmojiPicker(false);
    editTextareaRef.current?.focus();
  };

  const handleDmEmojiClick = (emojiData: EmojiClickData) => {
    setDmMessage(prev => prev + emojiData.emoji);
    setShowDmEmojiPicker(false);
    dmTextareaRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDmKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendDirectMessage();
    }
  };

  // Direct Messaging Functions
  const openDirectMessage = (userId: string, userName: string) => {
    setShowInbox(true);
    setSelectedConversation(userId);
    setShowProfileMenu(null);
    
    // Mark messages as read
    const updated = directMessages.map(msg => {
      if ((msg.fromUserId === userId && msg.toUserId === currentUser.id) && !msg.read) {
        return { ...msg, read: true };
      }
      return msg;
    });
    setDirectMessages(updated);
    saveDirectMessages(updated);
  };

  const handleSendDirectMessage = () => {
    if (!dmMessage.trim() || !selectedConversation) return;

    const conversationUser = getConversations().find(c => c.userId === selectedConversation);
    if (!conversationUser) return;

    const message: DirectMessage = {
      id: String(Date.now()),
      fromUserId: currentUser.id,
      fromUserName: currentUser.name || currentUser.email || "You",
      toUserId: selectedConversation,
      toUserName: conversationUser.userName,
      message: dmMessage.trim(),
      timestamp: Date.now(),
      read: false
    };

    const updated = [...directMessages, message];
    setDirectMessages(updated);
    saveDirectMessages(updated);
    setDmMessage("");
    setShowDmEmojiPicker(false);
  };

  const getConversations = (): Conversation[] => {
    const convMap = new Map<string, Conversation>();

    directMessages.forEach(msg => {
      const isFromMe = msg.fromUserId === currentUser.id;
      const otherUserId = isFromMe ? msg.toUserId : msg.fromUserId;
      const otherUserName = isFromMe ? msg.toUserName : msg.fromUserName;

      if (!convMap.has(otherUserId)) {
        convMap.set(otherUserId, {
          userId: otherUserId,
          userName: otherUserName,
          lastMessage: msg.message,
          lastMessageTime: msg.timestamp,
          unreadCount: 0
        });
      }

      const conv = convMap.get(otherUserId)!;
      if (msg.timestamp > conv.lastMessageTime) {
        conv.lastMessage = msg.message;
        conv.lastMessageTime = msg.timestamp;
      }

      if (!isFromMe && !msg.read) {
        conv.unreadCount++;
      }
    });

    return Array.from(convMap.values()).sort((a, b) => b.lastMessageTime - a.lastMessageTime);
  };

  const getConversationMessages = (userId: string): DirectMessage[] => {
    return directMessages
      .filter(msg => 
        (msg.fromUserId === currentUser.id && msg.toUserId === userId) ||
        (msg.fromUserId === userId && msg.toUserId === currentUser.id)
      )
      .sort((a, b) => a.timestamp - b.timestamp);
  };

  const getTotalUnreadCount = (): number => {
    return directMessages.filter(msg => 
      msg.toUserId === currentUser.id && !msg.read
    ).length;
  };

  const topics = ["all", ...Array.from(new Set(discussions.map(d => d.topic).filter(Boolean))) as string[]];

  const filteredDiscussions = discussions.filter(discussion => {
    const matchesSearch =
      discussion.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      discussion.userName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = selectedTopic === "all" || discussion.topic === selectedTopic;
    const notBlocked = !blockedUsers.includes(discussion.userId);
    return matchesSearch && matchesTopic && notBlocked;
  });

  const blockUser = (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to block ${userName}?`)) {
      const newBlockedUsers = [...blockedUsers, userId];
      setBlockedUsers(newBlockedUsers);
      localStorage.setItem(BLOCKED_USERS_STORAGE, JSON.stringify(newBlockedUsers));
      setShowProfileMenu(null);
      alert(`${userName} has been blocked.`);
    }
  };

  const reportUser = (userId: string, userName: string) => {
    if (window.confirm(`Report ${userName} for inappropriate behavior?`)) {
      setShowProfileMenu(null);
      alert(`${userName} has been reported to administrators.`);
    }
  };

  const getRoleBadgeColor = (role: string) => roleBadgeClass(normalizeRole(role));
  const getRoleLabel = (role: string) => roleLabel(normalizeRole(role));
  const getAvatarColor = (userId: string) => hashToColorPair(userId);

  const conversations = getConversations();
  const selectedConvUser = conversations.find(c => c.userId === selectedConversation);
  const conversationMessages = selectedConversation ? getConversationMessages(selectedConversation) : [];
  const totalUnread = getTotalUnreadCount();

  if (showInbox) {
    return (
      <main className="flex-1 min-h-0 flex bg-white">
        {/* Conversations List */}
        <div className="w-80 border-r flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowInbox(false);
                  setSelectedConversation(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-lg font-bold">Direct Messages</h2>
            </div>
            {totalUnread > 0 && (
              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                {totalUnread}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Mail size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-2">Start a conversation from the discussions</p>
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.userId}
                  onClick={() => openDirectMessage(conv.userId, conv.userName)}
                  className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 border-b transition-colors ${
                    selectedConversation === conv.userId ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(conv.userId)} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                    {conv.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 truncate">{conv.userName}</span>
                      {conv.unreadCount > 0 && (
                        <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full ml-2">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConvUser ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(selectedConvUser.userId)} flex items-center justify-center text-white font-bold`}>
                  {selectedConvUser.userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedConvUser.userName}</h3>
                  <p className="text-xs text-green-600">● Online</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {conversationMessages.map(msg => {
                  const isMine = msg.fromUserId === currentUser.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] ${isMine ? 'order-2' : 'order-1'}`}>
                        <div className={`rounded-2xl px-4 py-2 ${
                          isMine 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white border border-gray-200 text-gray-900'
                        }`}>
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        </div>
                        <p className={`text-xs text-gray-500 mt-1 ${isMine ? 'text-right' : 'text-left'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={dmMessagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t bg-white">
                <div className="bg-gray-50 border border-gray-300 rounded-lg focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
                  <textarea
                    ref={dmTextareaRef}
                    value={dmMessage}
                    onChange={(e) => setDmMessage(e.target.value)}
                    onKeyPress={handleDmKeyPress}
                    placeholder={`Message ${selectedConvUser.userName}...`}
                    className="w-full bg-transparent px-4 py-3 pr-24 rounded-lg resize-none focus:outline-none"
                    rows={1}
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                    }}
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowDmEmojiPicker(!showDmEmojiPicker)}
                        className="p-2 text-gray-500 hover:text-gray-700 rounded"
                      >
                        <Smile size={20} />
                      </button>
                      {showDmEmojiPicker && (
                        <div className="absolute bottom-full right-0 mb-2 z-50">
                          <EmojiPicker 
                            onEmojiClick={handleDmEmojiClick}
                            searchDisabled
                            skinTonesDisabled
                            height={350}
                            width={300}
                          />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleSendDirectMessage}
                      disabled={!dmMessage.trim()}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageCircle size={64} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">Select a conversation</h3>
                <p className="text-sm">Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 min-h-0 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">Discussions</h1>
          <p className="text-sm text-gray-600">
            Community chat • {discussions.length} messages • {new Set(discussions.map(d => d.userId)).size} participants
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowInbox(true)}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Direct Messages"
          >
            <Mail size={24} className="text-gray-700" />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {totalUnread}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live</span>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50 min-h-0">
        {filteredDiscussions.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-0 text-gray-400 py-20">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Send className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-600">No messages yet</h3>
            <p className="text-sm">Be the first to start the conversation!</p>
          </div>
        ) : (
          filteredDiscussions.map((message, index) => {
            const showHeader =
              index === 0 ||
              filteredDiscussions[index - 1].userId !== message.userId ||
              message.createdAt - filteredDiscussions[index - 1].createdAt > 5 * 60 * 1000;

            const isMine = message.userId === currentUser.id;

            return (
              <div key={message.id} className="group">
                {showHeader ? (
                  <div className="flex gap-3 hover:bg-white px-3 py-2 rounded-lg transition-colors">
                    <div className="relative">
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(
                          message.userId
                        )} flex items-center justify-center text-white font-bold flex-shrink-0 cursor-pointer hover:shadow`}
                        onClick={() =>
                          setShowProfileMenu((prev) => (prev === message.id ? null : message.id))
                        }
                        title="Profile actions"
                      >
                        {message.userName.charAt(0).toUpperCase()}
                      </div>

                      {/* Profile Menu */}
                      {showProfileMenu === message.id && message.userId !== currentUser?.id && (
                        <div className="absolute z-50 mt-2 w-56 bg-white border rounded-lg shadow-lg">
                          <div className="p-3 border-b">
                            <p className="font-medium text-gray-900 truncate">{message.userName}</p>
                            <span
                              className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${getRoleBadgeColor(
                                message.userRole
                              )}`}
                            >
                              {getRoleLabel(message.userRole)}
                            </span>
                          </div>
                          <div className="p-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDirectMessage(message.userId, message.userName);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-50 text-gray-700 transition-colors"
                            >
                              <Mail size={16} /> Send Message
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                blockUser(message.userId, message.userName);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-50 text-red-600 transition-colors"
                            >
                              <UserX size={16} /> Block User
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                reportUser(message.userId, message.userName);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-50 text-red-600 transition-colors"
                            >
                              <Flag size={16} /> Report User
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{message.userName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${getRoleBadgeColor(message.userRole)}`}>
                          {getRoleLabel(message.userRole)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {message.editedAt && <span className="text-xs text-gray-400">(edited)</span>}
                      </div>

                      {/* Message bubble */}
                      <div
                        className={`rounded-2xl px-4 py-2 border ${
                          isMine ? "bg-blue-50 border-blue-100" : "bg-white border-gray-200"
                        }`}
                      >
                        <p className="text-gray-800 whitespace-pre-wrap break-words">{message.message}</p>
                      </div>

                      {/* Inline actions on hover (edit/delete for mine or admin) */}
                      <div className="hidden group-hover:flex items-center gap-1 mt-1">
                        {canEdit(message) && (
                          <button
                            onClick={() => handleEditMessage(message.id)}
                            className="px-2 py-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded text-xs transition-colors"
                          >
                            Edit
                          </button>
                        )}
                        {canDelete(message) && (
                          <button
                            onClick={() => handleDeleteMessage(message.id)}
                            className="px-2 py-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded text-xs transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Compact bubble when same author/time range
                  <div className="pl-16 pr-4">
                    <div
                      className={`inline-block rounded-2xl px-4 py-2 mt-1 border ${
                        isMine ? "bg-blue-50 border-blue-100" : "bg-white border-gray-200"
                      }`}
                    >
                      <p className="text-gray-800 whitespace-pre-wrap break-words">{message.message}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Click outside to close profile menu */}
      {showProfileMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(null)} />
      )}

      {/* Fixed Composer at Bottom */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2 bg-white border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="relative">
          <div className="bg-gray-50 border border-gray-300 rounded-lg focus-within:border-[#515DEF] focus-within:ring-2 focus-within:ring-[#515DEF]/20 transition-all">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message #discussions`}
              className="w-full bg-transparent text-gray-900 px-4 py-3 pr-24 rounded-lg resize-none focus:outline-none placeholder-gray-400"
              rows={1}
              style={{
                minHeight: '44px',
                maxHeight: '120px',
                height: 'auto'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
            />
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded transition-colors"
                >
                  <Smile size={20} />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-full right-0 mb-2 z-50">
                    <EmojiPicker 
                      onEmojiClick={handleEmojiClick} 
                      searchDisabled
                      skinTonesDisabled
                      height={350}
                      width={300}
                    />
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="p-2 bg-[#515DEF] text-white rounded-lg hover:bg-[#515DEF]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </form>
        <p className="text-xs text-gray-500 mt-2 px-1">Press Enter to send • Shift+Enter for new line • Edit within 2 minutes</p>
      </div>
    </main>
  );
}
