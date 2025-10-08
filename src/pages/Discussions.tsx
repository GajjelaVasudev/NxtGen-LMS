import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, Edit2, Send, X, Check, Smile } from "lucide-react";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

type DiscussionMessage = {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  message: string;
  createdAt: number;
  editedAt?: number;
};

const DISCUSSIONS_KEY = "nxtgen_discussions";

function loadDiscussions(): DiscussionMessage[] {
  try {
    const raw = localStorage.getItem(DISCUSSIONS_KEY);
    return raw ? (JSON.parse(raw) as DiscussionMessage[]) : [];
  } catch {
    return [];
  }
}

function saveDiscussions(discussions: DiscussionMessage[]) {
  localStorage.setItem(DISCUSSIONS_KEY, JSON.stringify(discussions));
  window.dispatchEvent(new CustomEvent("discussions:updated"));
}

export default function Discussions() {
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState<DiscussionMessage[]>(() => loadDiscussions());
  const [newMessage, setNewMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [discussions]);

  // Real-time updates
  useEffect(() => {
    const handler = () => {
      const updated = loadDiscussions();
      setDiscussions(updated);
    };
    window.addEventListener("discussions:updated", handler);
    
    // Poll for updates every 2 seconds
    const interval = setInterval(() => {
      const updated = loadDiscussions();
      setDiscussions(updated);
    }, 2000);

    return () => {
      window.removeEventListener("discussions:updated", handler);
      clearInterval(interval);
    };
  }, []);

  const canEdit = (message: DiscussionMessage) => {
    if (message.userId !== user?.id) return false;
    const twoMinutes = 2 * 60 * 1000;
    const timeSinceCreation = Date.now() - message.createdAt;
    return timeSinceCreation < twoMinutes;
  };

  const canDelete = (message: DiscussionMessage) => {
    if (user?.role === 'admin') return true;
    return message.userId === user?.id;
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !user) return;

    const message: DiscussionMessage = {
      id: String(Date.now()),
      userId: user.id,
      userName: user.name || user.email,
      userRole: user.role,
      message: newMessage.trim(),
      createdAt: Date.now()
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500 text-white';
      case 'instructor':
        return 'bg-blue-500 text-white';
      case 'contentCreator':
        return 'bg-green-500 text-white';
      default:
        return 'bg-purple-500 text-white';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'instructor':
        return 'Instructor';
      case 'contentCreator':
        return 'Creator';
      default:
        return 'Student';
    }
  };

  const getAvatarColor = (userId: string) => {
    const colors = [
      'from-purple-400 to-pink-600',
      'from-blue-400 to-cyan-600',
      'from-green-400 to-emerald-600',
      'from-yellow-400 to-orange-600',
      'from-red-400 to-rose-600',
      'from-indigo-400 to-purple-600',
    ];
    const index = parseInt(userId, 36) % colors.length;
    return colors[index];
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            # discussions
          </h1>
          <p className="text-sm text-gray-600">
            Community chat • {discussions.length} messages
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live</span>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {discussions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Send className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-600">No messages yet</h3>
            <p className="text-sm">Be the first to start the conversation!</p>
          </div>
        ) : (
          discussions.map((message, index) => {
            const showHeader = index === 0 || 
              discussions[index - 1].userId !== message.userId ||
              message.createdAt - discussions[index - 1].createdAt > 300000; // 5 minutes

            return (
              <div key={message.id} className="group">
                {showHeader ? (
                  // Message with header
                  <div className="flex gap-3 hover:bg-white px-3 py-2 rounded-lg transition-colors">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(message.userId)} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                      {message.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {message.userName}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${getRoleBadgeColor(message.userRole)}`}>
                          {getRoleLabel(message.userRole)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        {message.editedAt && (
                          <span className="text-xs text-gray-400">(edited)</span>
                        )}
                      </div>
                      
                      {editingMessageId === message.id ? (
                        <div className="space-y-2">
                          <div className="relative">
                            <textarea
                              ref={editTextareaRef}
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#515DEF] focus:border-transparent"
                              rows={2}
                              autoFocus
                            />
                            {showEditEmojiPicker && (
                              <div className="absolute bottom-full mb-2 z-50">
                                <EmojiPicker onEmojiClick={handleEditEmojiClick} />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setShowEditEmojiPicker(!showEditEmojiPicker)}
                              className="p-1.5 text-gray-500 hover:text-gray-700 rounded"
                            >
                              <Smile size={18} />
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              disabled={!editingText.trim()}
                              className="px-3 py-1.5 bg-[#515DEF] text-white text-sm rounded-lg hover:bg-[#515DEF]/90 disabled:opacity-50 flex items-center gap-1"
                            >
                              <Check size={14} />
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1.5 text-gray-600 hover:text-gray-800 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-gray-700 whitespace-pre-wrap break-words flex-1">
                            {message.message}
                          </p>
                          <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                            {canEdit(message) && (
                              <button
                                onClick={() => handleEditMessage(message.id)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                            {canDelete(message) && (
                              <button
                                onClick={() => handleDeleteMessage(message.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Compact message
                  <div className="flex gap-3 hover:bg-white px-3 py-1 rounded-lg group transition-colors">
                    <div className="w-10 flex-shrink-0 flex items-center justify-center">
                      <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100">
                        {new Date(message.createdAt).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingMessageId === message.id ? (
                        <div className="space-y-2">
                          <div className="relative">
                            <textarea
                              ref={editTextareaRef}
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#515DEF] focus:border-transparent"
                              rows={2}
                              autoFocus
                            />
                            {showEditEmojiPicker && (
                              <div className="absolute bottom-full mb-2 z-50">
                                <EmojiPicker onEmojiClick={handleEditEmojiClick} />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setShowEditEmojiPicker(!showEditEmojiPicker)}
                              className="p-1.5 text-gray-500 hover:text-gray-700 rounded"
                            >
                              <Smile size={18} />
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              disabled={!editingText.trim()}
                              className="px-3 py-1.5 bg-[#515DEF] text-white text-sm rounded-lg hover:bg-[#515DEF]/90 disabled:opacity-50 flex items-center gap-1"
                            >
                              <Check size={14} />
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1.5 text-gray-600 hover:text-gray-800 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-gray-700 whitespace-pre-wrap break-words flex-1">
                            {message.message}
                          </p>
                          <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                            {canEdit(message) && (
                              <button
                                onClick={() => handleEditMessage(message.id)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                            {canDelete(message) && (
                              <button
                                onClick={() => handleDeleteMessage(message.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Bottom */}
      <div className="px-4 pb-6 bg-white border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="relative pt-4">
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
                maxHeight: '200px',
                height: 'auto'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
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
                      height={400}
                      width={350}
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
        
        {/* Helper text */}
        <p className="text-xs text-gray-500 mt-2 px-1">
          Press Enter to send • Shift+Enter for new line • Edit within 2 minutes
        </p>
      </div>
    </div>
  );
}
