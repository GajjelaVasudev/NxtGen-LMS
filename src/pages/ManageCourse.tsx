import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, AlertCircle, Edit2, Trash2 } from "lucide-react";

const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";

async function apiFetchCourse(id: string) {
  return fetch(`${API}/courses/${id}`).then(r => r.json()).catch(() => ({ course: null }));
}
async function apiCreateCourse(course: any, userId?: string) {
  return fetch(`${API}/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(userId ? { "x-user-id": userId } : {}) },
    body: JSON.stringify(course),
  }).then(r => r.json());
}
async function apiUpdateCourse(id: string, course: any) {
  return fetch(`${API}/courses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(course),
  }).then(r => r.json());
}

// --- Additional API helpers used by the Manage list ---
async function apiFetchAllCourses() {
  return fetch(`${API}/courses`).then(r => r.json()).catch(() => ({ courses: [] }));
}
async function apiDeleteCourse(id: string) {
  return fetch(`${API}/courses/${id}`, { method: "DELETE" }).then(r => r.json()).catch(() => ({ ok: false }));
}

export default function ManageCourse() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    const res = await apiDeleteCourse(id);
    if (res.ok) {
      setCourses((c) => c.filter((x: any) => x.id !== id));
    } else {
      alert("Failed to delete course");
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-white">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Manage Courses</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/app/managecourse/add')} className="px-4 py-2 bg-blue-600 text-white rounded">Create Course</button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No courses yet.</p>
            <button onClick={() => navigate('/app/managecourse/add')} className="px-4 py-2 bg-blue-600 text-white rounded">Add your first course</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((c) => (
              <div key={c.id} className="p-4 border rounded bg-gray-50 flex items-start gap-4">
                {c.thumbnail && <img src={c.thumbnail} alt={c.title} className="w-28 h-20 object-cover rounded" />}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold">{c.title}</div>
                      <div className="text-xs text-gray-500">{c.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link to={`/app/managecourse/edit/${c.id}`} className="text-blue-600">Edit</Link>
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

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || form.title.trim() === "") { alert("Course title is required"); return; }
    try {
      if (isEditing && id) {
        await apiUpdateCourse(id, { ...form, title: form.title.trim(), price: Number(form.price || 0) });
      } else {
        await apiCreateCourse({ ...form, title: form.title.trim(), price: Number(form.price || 0) }, user?.id);
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
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">{isEditing ? "Edit Course" : "Add Course"}</h1>
        </div>

        {/* Warning Message */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Important: Use Video URLs</p>
            <p>Please provide URLs to videos hosted on platforms like YouTube, Vimeo, or your own server. Do not upload large video files directly as they exceed storage limits.</p>
          </div>
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
            <label className="block text-sm font-medium mb-1">Thumbnail URL</label>
            <input 
              value={form.thumbnail || ""} 
              onChange={(e) => updateField("thumbnail", e.target.value)} 
              className="w-full border px-3 py-2 rounded" 
              placeholder="https://example.com/image.jpg"
            />
            {form.thumbnail && (
              <div className="mt-2">
                <img src={form.thumbnail} alt="Thumbnail preview" className="w-full max-w-sm h-40 object-cover rounded" />
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
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
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
                className="px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 transition-colors"
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
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
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
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
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
            <button type="submit" className="px-6 py-3 bg-[#515DEF] text-white rounded">{isEditing ? "Update Course" : "Create Course"}</button>
            <button type="button" onClick={() => navigate("/app/managecourse")} className="px-6 py-3 border rounded">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
