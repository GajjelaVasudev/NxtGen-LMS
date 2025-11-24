import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Star, Trash2, Reply, Forward } from "lucide-react";
import { Link } from "react-router-dom";
import { loadInboxMessages, sendInboxMessage, markRead, deleteMessages, starMessage } from "@/utils/inboxHelpers";

const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";

export default function Inbox() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [form, setForm] = useState({ toUserId: "", toName: "", subject: "", content: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [studentSearchId, setStudentSearchId] = useState("");
  const [studentResult, setStudentResult] = useState<any | null>(null);
  const [searchingStudent, setSearchingStudent] = useState(false);
  const [popup, setPopup] = useState<{ type: 'error' | 'info' | 'success'; message: string } | null>(null);

  useEffect(() => {
    if (!popup) return;
    const t = setTimeout(() => setPopup(null), 4000);
    return () => clearTimeout(t);
  }, [popup]);

  const fetchMessages = async () => {
    try {
      const msgs = await loadInboxMessages(user?.id, user?.role);
      // map to the local message shape used by this page
      const mapped = msgs.map(m => ({
        id: m.id,
        fromUserId: (m as any).from_user_id || 'system',
        fromName: (m as any).from_name || 'System',
        subject: m.title,
        content: m.message,
        timestamp: m.createdAt,
        read: m.read,
        category: m.type,
        recipientRole: m.recipientRole || null,
        starred: (m as any).is_starred || false,
      }));
      setMessages(mapped.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    } catch (err) {
      console.warn("Inbox fetch error", err);
      setMessages([]);
    }
  };

  useEffect(() => {
    fetchMessages();
    const iv = setInterval(fetchMessages, 3000);
    return () => clearInterval(iv);
  }, [user]);

  const openMessage = (m: any) => {
    setSelectedMessage(m);
    if (!m.read) {
      markRead([m.id]);
      setMessages(prev => prev.map(x => x.id === m.id ? { ...x, read: true } : x));
    }
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user) {
      setPopup({ type: 'error', message: 'Sign in to send messages' });
      return;
    }
    // Only instructors and admins may send messages
    if (!(user.role === 'instructor' || user.role === 'admin')) {
      setPopup({ type: 'error', message: 'Only instructors and admins can send messages' });
      return;
    }
    const payload = {
      fromUserId: user.id,
      fromName: user.name || user.email,
      toUserId: form.toUserId || null,
      toName: form.toName || null,
      subject: form.subject,
      content: form.content
    };

    try {
      await sendInboxMessage(payload, user.id);
      setForm({ toUserId: "", toName: "", subject: "", content: "" });
      setComposeOpen(false);
      fetchMessages();
      setPopup({ type: 'success', message: 'Message sent' });
    } catch (err) {
      setPopup({ type: 'error', message: 'Failed to send message' });
    }
  };

  const deleteSelected = async (ids: string[]) => {
    if (!window.confirm("Delete selected message(s)?")) return;
    await deleteMessages(ids);
    fetchMessages();
    if (selectedMessage && ids.includes(selectedMessage.id)) setSelectedMessage(null);
  };

  const toggleStar = async (id: string, starred: boolean) => {
    await starMessage(id, starred);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, starred } : m));
  };

  const filtered = messages.filter(m => {
    const q = searchQuery.toLowerCase();
    return !q || (m.subject || "").toLowerCase().includes(q) || (m.fromName || "").toLowerCase().includes(q) || (m.content || "").toLowerCase().includes(q);
  });

  return (
    <main className="h-screen flex bg-gray-50">
      <div className="flex-1 min-h-0 flex">
        {/* Message List */}
        <div className="w-80 bg-white border-r flex flex-col min-h-0">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-bold">Inbox</h1>
              {(user && (user.role === 'instructor' || user.role === 'admin')) && (
                <button onClick={() => setComposeOpen(true)} className="px-3 py-1 bg-blue-600 text-white rounded">Compose</button>
              )}
            </div>

            <div className="relative mb-3">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search messages..." className="w-full pl-3 pr-3 py-2 border rounded text-sm" />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {filtered.map(m => (
              <div key={m.id} onClick={() => openMessage(m)} className={`p-3 border-b cursor-pointer ${selectedMessage?.id === m.id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-medium ${!m.read ? "text-gray-900" : "text-gray-700"}`}>{m.fromName}</div>
                    <div className="text-xs text-gray-500 truncate">{m.subject}</div>
                  </div>
                  <div className="text-xs text-gray-400">{new Date(m.timestamp).toLocaleDateString()}</div>
                </div>
                {m.starred && <div className="mt-2 text-yellow-500"><Star size={14} /></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Message Detail */}
        <div className="flex-1 min-h-0 flex flex-col">
          {selectedMessage ? (
            <>
              <div className="p-4 border-b bg-white flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedMessage.subject}</h2>
                  <div className="text-xs text-gray-500">{selectedMessage.fromName} • {new Date(selectedMessage.timestamp).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleStar(selectedMessage.id, !selectedMessage.starred)} className="p-2 hover:bg-gray-100 rounded">
                    <Star className={selectedMessage.starred ? "text-yellow-500" : "text-gray-400"} />
                  </button>
                  <button onClick={() => deleteSelected([selectedMessage.id])} className="p-2 hover:bg-gray-100 rounded">
                    <Trash2 className="text-gray-400" />
                  </button>
                  <button onClick={() => {
                    if (!(user && (user.role === 'instructor' || user.role === 'admin'))) {
                      setPopup({ type: 'error', message: 'Only instructors and admins can reply' });
                      return;
                    }
                    setForm(f => ({ ...f, toUserId: selectedMessage.fromUserId || '', toName: selectedMessage.fromName || '' }));
                    setStudentResult(selectedMessage.fromUserId ? { id: selectedMessage.fromUserId, name: selectedMessage.fromName } : null);
                    setComposeOpen(true);
                  }} className="p-2 hover:bg-gray-100 rounded">Reply</button>
                </div>
              </div>

              <div className="flex-1 p-4 bg-white overflow-auto min-h-0">
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedMessage.content}</p>
                </div>
              </div>
              <div className="p-4 border-t bg-white flex-shrink-0">
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
                  <div className="flex gap-2">
                    <input value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Reply subject" className="flex-1 border px-3 py-2 rounded" />
                    <button className="px-4 py-2 bg-blue-600 text-white rounded">Reply</button>
                  </div>
                </form>
              </div>
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

      {/* Compose modal (simple inline panel) */}
      {composeOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="bg-white w-full max-w-xl p-6 rounded shadow-lg">
            <h3 className="text-lg font-semibold mb-3">Compose Message</h3>
            <form onSubmit={sendMessage} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <input value={studentSearchId} onChange={(e) => setStudentSearchId(e.target.value)} placeholder="Search student by ID" className="col-span-2 border px-3 py-2 rounded" />
                <button type="button" onClick={async () => {
                  if (!studentSearchId) return;
                  setSearchingStudent(true);
                  try {
                    const r = await fetch(`${API}/users/${studentSearchId}`);
                    if (r.ok) {
                      const b = await r.json();
                      setStudentResult(b.user);
                      setForm(f => ({ ...f, toUserId: b.user.id, toName: b.user.name }));
                    } else {
                      setStudentResult(null);
                      setPopup({ type: 'error', message: 'Student ID not found' });
                    }
                  } catch (err) {
                    console.warn('Student lookup error', err);
                    setStudentResult(null);
                    setPopup({ type: 'error', message: 'Student lookup failed' });
                  } finally {
                    setSearchingStudent(false);
                  }
                }} className="col-span-1 px-3 py-2 bg-gray-100 border rounded">Find</button>
              </div>
              {studentResult && (
                <div className="p-2 bg-gray-50 rounded text-sm">
                  Found: <strong>{studentResult.name}</strong> (ID: {studentResult.id})
                </div>
              )}

              <input value={form.toName} onChange={(e) => setForm(f => ({ ...f, toName: e.target.value }))} placeholder="To (leave empty for role/system)" className="w-full border px-3 py-2 rounded" />
              <input value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Subject" className="w-full border px-3 py-2 rounded" />
              <textarea value={form.content} onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))} rows={6} className="w-full border px-3 py-2 rounded" placeholder="Write your message..." />
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">You are sending as: {user?.name || user?.email}</div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setComposeOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Send</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Popup (in-app) */}
      {popup && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pointer-events-none">
          <div className="mt-16 pointer-events-auto bg-white border rounded shadow-lg px-4 py-3 max-w-lg w-full mx-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className={`text-sm ${popup.type === 'error' ? 'text-red-700' : popup.type === 'success' ? 'text-green-700' : 'text-gray-800'}`}>{popup.message}</div>
                <div className="mt-3 text-right">
                  <button onClick={() => setPopup(null)} className="px-3 py-1 bg-gray-100 rounded">OK</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
