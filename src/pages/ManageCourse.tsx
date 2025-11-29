import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, AlertCircle, Edit2, Trash2 } from "lucide-react";

const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";
import { getAccessToken } from "@/utils/supabaseBrowser";

async function getSupabaseToken() {
  return await getAccessToken();
}

async function apiFetchCourse(id: string) {
  return fetch(`${API}/courses/${id}`).then(r => r.json()).catch(() => ({ course: null }));
}
async function apiCreateCourse(course: any, userId?: string) {
  const token = await getSupabaseToken();
  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  else if (userId) headers['x-user-id'] = userId;
  return fetch(`${API}/courses`, { method: 'POST', headers, body: JSON.stringify(course) }).then(r => r.json());
}
async function apiUpdateCourse(id: string, course: any) {
  const token = await getSupabaseToken();
  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API}/courses/${id}`, { method: 'PUT', headers, body: JSON.stringify(course) }).then(r => r.json());
}

// --- Additional API helpers used by the Manage list ---
async function apiFetchAllCourses() {
  const token = await getSupabaseToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  return fetch(`${API}/courses`, { headers }).then(r => r.json()).catch(() => ({ courses: [] }));
}
async function apiDeleteCourse(id: string, userId?: string) {
  try {
    const token = await getSupabaseToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    else if (userId) headers['x-user-id'] = userId;
    const res = await fetch(`${API}/courses/${id}`, { method: 'DELETE', headers: Object.keys(headers).length ? headers : undefined });
    const json = await res.json().catch(() => ({}));
    if (json && typeof json === 'object') {
      return { success: Boolean((json as any).success === true), error: (json as any).error || undefined };
    }
    return { success: res.ok };
  } catch (err: any) {
    return { success: false, error: String(err) };
  }
}

export default function ManageCourse() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const res = await apiFetchAllCourses();
      if (mounted) setCourses(res.courses || []);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  async function onDelete(id: string) {
    if (!confirm("Delete this course?")) return;
    const res = await apiDeleteCourse(id, user?.id);
    // apiDeleteCourse returns the parsed JSON from the server, e.g. { success: true }
    if (res && res.success === true) {
      setCourses((c) => c.filter((x: any) => x.id !== id));
      setToast({ type: 'success', message: 'Course deleted' });
      setTimeout(() => setToast(null), 3000);
    } else {
      console.error('Delete failed response', res);
      setToast({ type: 'error', message: 'Failed to delete course' });
      setTimeout(() => setToast(null), 4000);
    }
  }

  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto bg-white">
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Manage Courses</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/app/managecourse/add')} className="btn-primary px-4 py-2 rounded">Create Course</button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No courses yet.</p>
              <button onClick={() => navigate('/app/managecourse/add')} className="btn-primary px-4 py-2 rounded">Add your first course</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map((c) => (
                <div key={c.id} className="card p-4 flex items-start gap-4">
                  {c.thumbnail && <img src={c.thumbnail} alt={c.title} className="w-28 h-20 object-cover rounded" />}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{c.title}</div>
                        <div className="text-xs text-gray-500">{c.description}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link to={`/app/managecourse/edit/${c.id}`} className="text-brand">Edit</Link>
                        <button onClick={() => onDelete(c.id)} className="text-red-600">Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
        {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`px-4 py-2 rounded shadow-lg ${toast.type === 'success' ? 'bg-brand text-white' : 'bg-red-600 text-white'}`}>
            {toast.message}
          </div>
        </div>
      )}
    </>
  );
}

export function AddCourse() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEditing = !!id;

  const [form, setForm] = useState<any>({ title: "", thumbnail: "", videos: [], quizzes: [], assignments: [], description: "", price: 0 });

  // video editing helpers (used by the UI below)
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editingVideoTitle, setEditingVideoTitle] = useState("");

  function startEditingVideo(v: any) {
    setEditingVideoId(v.id);
    setEditingVideoTitle(v.title || "");
  }
  function saveVideoTitle(id: string) {
    setForm((s: any) => ({ ...s, videos: (s.videos || []).map((vv: any) => (vv.id === id ? { ...vv, title: editingVideoTitle } : vv)) }));
    setEditingVideoId(null);
    setEditingVideoTitle("");
  }
  function removeVideo(id: string) {
    setForm((s: any) => ({ ...s, videos: (s.videos || []).filter((v: any) => v.id !== id) }));
  }
  function addVideoByUrl(url: string, title: string) {
    const id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    setForm((s: any) => ({ ...s, videos: [...(s.videos || []), { id, title, url }] }));
  }

  // Quizzes helpers (basic MCQ support)
  function addMcqQuiz() {
    const qId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    setForm((s: any) => ({ ...s, quizzes: [...(s.quizzes || []), { id: qId, type: "mcq", questions: [] }] }));
  }
  function removeQuiz(id: string) {
    setForm((s: any) => ({ ...s, quizzes: (s.quizzes || []).filter((q: any) => q.id !== id) }));
  }
  function addMcqQuestion(quizId: string) {
    const qnId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    setForm((s: any) => ({
      ...s,
      quizzes: (s.quizzes || []).map((q: any) => (q.id === quizId ? { ...q, questions: [...(q.questions || []), { id: qnId, q: "", opts: ["", "", "", ""], answer: 0 }] } : q)),
    }));
  }
  function removeMcqQuestion(quizId: string, questionId: string) {
    setForm((s: any) => ({
      ...s,
      quizzes: (s.quizzes || []).map((q: any) => (q.id === quizId ? { ...q, questions: (q.questions || []).filter((qq: any) => qq.id !== questionId) } : q)),
    }));
  }
  function updateMcqQuestion(quizId: string, questionId: string, fn: (old: any) => any) {
    setForm((s: any) => ({
      ...s,
      quizzes: (s.quizzes || []).map((q: any) => (q.id === quizId ? { ...q, questions: (q.questions || []).map((qq: any) => (qq.id === questionId ? fn(qq) : qq)) } : q)),
    }));
  }

  useEffect(() => {
    if (id) {
      (async () => {
        const res = await apiFetchCourse(id);
        if (res?.course) setForm(res.course);
      })();
    }
  }, [id]);

  function updateField(k: string, v: any) { setForm((s: any) => ({ ...s, [k]: v })); }

  // helper to convert an uploaded image file to a data URL for thumbnail preview/storage
  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // helper: convert a data URL string to a File-like Blob object
  function dataUrlToBlob(dataUrl: string): { blob: Blob; name: string } | null {
    try {
      const matches = dataUrl.match(/^data:(.+?);base64,(.+)$/);
      if (!matches) return null;
      const mime = matches[1];
      const b64 = matches[2];
      const binary = atob(b64);
      const len = binary.length;
      const u8 = new Uint8Array(len);
      for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
      const blob = new Blob([u8], { type: mime });
      const ext = mime.split('/')[1] || 'bin';
      const name = `upload-${Date.now()}.${ext}`;
      return { blob, name };
    } catch (e) {
      return null;
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || form.title.trim() === "") { alert("Course title is required"); return; }
    try {
      // Before sending, upload any embedded data: URLs (videos or assignment files)
      const prepared = { ...form } as any;

      // If thumbnail is still an embedded data URL (e.g., user pasted a data: URL), upload it first
      if (typeof prepared.thumbnail === 'string' && prepared.thumbnail.startsWith('data:')) {
        const convThumb = dataUrlToBlob(prepared.thumbnail);
        if (!convThumb) throw new Error('Failed to parse embedded thumbnail data URL');
        const thumbFd = new FormData();
        thumbFd.append('file', convThumb.blob, convThumb.name);
        const thumbUp = await fetch(`${API}/upload`, { method: 'POST', body: thumbFd });
        if (!thumbUp.ok) throw new Error('Failed to upload embedded thumbnail');
        const thumbBody = await thumbUp.json().catch(() => null);
        if (!thumbBody || !thumbBody.success || !thumbBody.url) throw new Error('Thumbnail upload returned invalid response');
        prepared.thumbnail = thumbBody.url;
      }

      // process videos: if url is a data: URL, upload it and replace
      if (Array.isArray(prepared.videos)) {
        for (let i = 0; i < prepared.videos.length; i++) {
          const v = prepared.videos[i];
          if (v && typeof v.url === 'string' && v.url.startsWith('data:')) {
            const conv = dataUrlToBlob(v.url);
            if (!conv) throw new Error('Failed to parse embedded video data URL');
            const fd = new FormData();
            fd.append('file', conv.blob, conv.name);
            const up = await fetch(`${API}/upload`, { method: 'POST', body: fd });
            if (!up.ok) throw new Error('Failed to upload embedded video');
            const upb = await up.json().catch(() => null);
            if (!upb || !upb.success || !upb.url) throw new Error('Upload returned invalid response');
            prepared.videos[i] = { ...v, url: upb.url };
          }
        }
      }

      // process assignments files: if files contain dataUrl, upload and replace with url
      if (Array.isArray(prepared.assignments)) {
        for (let ai = 0; ai < prepared.assignments.length; ai++) {
          const a = prepared.assignments[ai];
          if (a && Array.isArray(a.files)) {
            for (let fi = 0; fi < a.files.length; fi++) {
              const fileObj = a.files[fi];
              const dataUrl = fileObj?.dataUrl || fileObj?.url;
              if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
                const conv = dataUrlToBlob(dataUrl);
                if (!conv) throw new Error('Failed to parse embedded assignment file data URL');
                const fd = new FormData();
                fd.append('file', conv.blob, conv.name);
                const up = await fetch(`${API}/upload`, { method: 'POST', body: fd });
                if (!up.ok) throw new Error('Failed to upload embedded assignment file');
                const upb = await up.json().catch(() => null);
                if (!upb || !upb.success || !upb.url) throw new Error('Upload returned invalid response');
                // replace file object with normalized { fileName, url }
                prepared.assignments[ai].files[fi] = { fileName: fileObj.fileName || conv.name, url: upb.url };
              }
            }
          }
        }
      }

      let res: any = null;
      if (isEditing && id) {
        res = await apiUpdateCourse(id, { ...prepared, title: prepared.title.trim(), price: Number(prepared.price || 0) });
      } else {
        // In development, allow a demo fallback owner so local testing can create courses
        const devFallbackOwner = import.meta.env.DEV ? 'instructor@gmail.com' : undefined;
        const ownerArg = (user && user.id) ? user.id : devFallbackOwner;
        res = await apiCreateCourse({ ...prepared, title: prepared.title.trim(), price: Number(prepared.price || 0) }, ownerArg);
      }
      // Show server-side errors when present
      if (!res || (res.error && res.error.length !== 0) || res.success === false) {
        console.error('Course save failed', res);
        const msg = res?.error || res?.message || (res && JSON.stringify(res)) || 'Unknown server error';
        alert('Failed to save course: ' + String(msg));
        return;
      }
      // If server accepted the course but metadata wasn't persisted (older DB schema), warn the user
      if (res.hadMetadata && res.metadataSaved === false) {
        alert('Course saved, but media (videos/quizzes) could not be persisted to the database on this deployment. Please run the latest migrations to add the `metadata` column, or contact the site administrator.');
      }
      navigate("/app/managecourse");
    } catch (err) {
      console.error("Failed to save course:", err);
      alert("Failed to save course");
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-white">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/app/managecourse")}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Course Title *</label>
            <input 
              value={form.title || ""} 
              onChange={(e) => updateField("title", e.target.value)} 
              className="w-full border px-3 py-2 rounded" 
              required 
              placeholder="Enter course title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Thumbnail (choose file)</label>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const MAX_THUMB_BYTES = 5 * 1024 * 1024; // 5MB
                if (f.size > MAX_THUMB_BYTES) {
                  alert('Selected image is too large. Please choose an image smaller than 5MB or optimize it before uploading.');
                  return;
                }
                try {
                  // Upload to server which stores in Supabase Storage and returns a public URL
                  const formData = new FormData();
                  formData.append('file', f, f.name);
                  const uploadRes = await fetch(`${API}/upload`, { method: 'POST', body: formData });
                  if (!uploadRes.ok) {
                    const txt = await uploadRes.text().catch(() => '');
                    console.error('Upload failed', uploadRes.status, txt);
                    alert('Failed to upload image');
                    return;
                  }
                  const body = await uploadRes.json().catch(() => null);
                  if (!body || !body.success || !body.url) {
                    console.error('Upload response invalid', body);
                    alert('Failed to upload image');
                    return;
                  }
                  updateField('thumbnail', body.url);
                } catch (err) {
                  console.error('Failed to upload thumbnail', err);
                  alert('Failed to upload image');
                }
              }}
              className="w-full"
            />
            {form.thumbnail && (
              <div className="mt-2">
                <img src={form.thumbnail} alt="Thumbnail preview" className="w-full max-w-sm h-40 object-cover rounded" />
                <div className="mt-2">
                  <button type="button" onClick={() => updateField('thumbnail', '')} className="px-3 py-1 text-sm border rounded">Clear</button>
                </div>
              </div>
            )}
          </div>

          {/* Videos Section - URL Based */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Videos</label>
              <div className="text-sm text-gray-500">Add video URLs (YouTube, Vimeo, etc.)</div>
            </div>
            <div className="space-y-2 mb-3">
              {(form.videos ?? []).map((v) => (
                <div key={v.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded border">
                  <div className="flex-1">
                    {editingVideoId === v.id ? (
                      <input
                        type="text"
                        value={editingVideoTitle}
                        onChange={(e) => setEditingVideoTitle(e.target.value)}
                        className="w-full px-2 py-1 border rounded"
                        autoFocus
                        onBlur={() => saveVideoTitle(v.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveVideoTitle(v.id);
                          if (e.key === 'Escape') {
                            setEditingVideoId(null);
                            setEditingVideoTitle("");
                          }
                        }}
                      />
                    ) : (
                      <>
                        <div className="font-medium">{v.title}</div>
                        {v.url && <div className="text-xs text-gray-500 truncate">{v.url}</div>}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingVideoId !== v.id && (
                      <button 
                        type="button" 
                        onClick={() => startEditingVideo(v)} 
                        className="p-2 text-brand hover:bg-gray-50 rounded"
                        title="Edit video name"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    <button 
                      type="button" 
                      onClick={() => removeVideo(v.id)} 
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Remove video"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input 
                id="video-url" 
                type="url" 
                placeholder="Enter video URL (e.g., https://youtube.com/watch?v=...)"
                className="flex-1 border px-3 py-2 rounded"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const input = e.target as HTMLInputElement;
                    if (input.value.trim()) {
                      const title = prompt("Enter video title:", `Video ${(form.videos?.length || 0) + 1}`);
                      if (title) {
                        addVideoByUrl(input.value.trim(), title);
                        input.value = "";
                      }
                    }
                  }
                }}
              />
              <button 
                type="button"
                onClick={() => {
                  const input = document.getElementById('video-url') as HTMLInputElement;
                  if (input.value.trim()) {
                    const title = prompt("Enter video title:", `Video ${(form.videos?.length || 0) + 1}`);
                    if (title) {
                      addVideoByUrl(input.value.trim(), title);
                      input.value = "";
                    }
                  }
                }}
                className="btn-primary px-4 py-2 rounded cursor-pointer"
              >
                Add Video
              </button>
            </div>
          </div>

          {/* Quizzes Section - MCQ Only */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Quizzes (MCQ)</label>
              <div className="text-sm text-gray-500">Add multiple choice quizzes</div>
            </div>

            <div className="space-y-4 mb-3">
              {(form.quizzes ?? []).map((q) => {
                if (q.type !== "mcq") return null;
                
                return (
                  <div key={(q as any).id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-lg">MCQ Quiz</div>
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => removeQuiz((q as any).id)} 
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded border border-red-200"
                        >
                          Remove Quiz
                        </button>
                        <button 
                          type="button" 
                          onClick={() => addMcqQuestion((q as any).id)} 
                          className="btn-primary px-3 py-1 rounded text-sm"
                        >
                          Add Question
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {q.questions.map((qq, qIdx) => (
                        <div key={qq.id} className="p-3 border rounded bg-white">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Question {qIdx + 1}</span>
                            <button
                              type="button"
                              onClick={() => removeMcqQuestion((q as any).id, qq.id)}
                              className="text-red-600 hover:bg-red-50 p-1 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          
                          <input 
                            value={qq.q} 
                            onChange={(e) => updateMcqQuestion((q as any).id, qq.id, (old) => ({ ...old, q: e.target.value }))} 
                            className="w-full mb-3 border px-3 py-2 rounded" 
                            placeholder="Enter question"
                          />
                          
                          <div className="space-y-2 mb-3">
                            <label className="text-xs font-medium text-gray-600">Options:</label>
                            {qq.opts.map((opt, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-500 w-6">{i + 1}.</span>
                                <input 
                                  value={opt} 
                                  onChange={(e) => updateMcqQuestion((q as any).id, qq.id, (old) => ({ 
                                    ...old, 
                                    opts: old.opts.map((o, idx) => (idx === i ? e.target.value : o)) 
                                  }))} 
                                  className="flex-1 border px-3 py-2 rounded" 
                                  placeholder={`Option ${i + 1}`}
                                />
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">Correct Answer:</label>
                            <select
                              value={qq.answer}
                              onChange={(e) => updateMcqQuestion((q as any).id, qq.id, (old) => ({ 
                                ...old, 
                                answer: Number(e.target.value) 
                              }))}
                              className="border px-3 py-2 rounded"
                            >
                              {qq.opts.map((opt, i) => (
                                <option key={i} value={i}>Option {i + 1}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <button 
              type="button" 
              onClick={addMcqQuiz} 
              className="btn-primary px-4 py-2 rounded"
            >
              Add MCQ Quiz
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea 
              value={form.description || ""} 
              onChange={(e) => updateField("description", e.target.value)} 
              className="w-full border px-3 py-2 rounded" 
              rows={5} 
              placeholder="Describe your course..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Price (INR)</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">₹</span>
              <input 
                type="number" 
                min="0"
                step="1"
                value={form.price ?? 0} 
                onChange={(e) => updateField("price", Number(e.target.value))} 
                className="w-48 border px-3 py-2 rounded" 
                placeholder="0"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button type="submit" className="btn-primary px-6 py-3 rounded">{isEditing ? "Update Course" : "Create Course"}</button>
            <button type="button" onClick={() => navigate("/app/managecourse")} className="px-6 py-3 border rounded">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
