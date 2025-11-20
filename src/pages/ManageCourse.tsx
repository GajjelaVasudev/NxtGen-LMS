import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Search, ArrowLeft, Edit2, Trash2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type VideoItem = { 
  id: string; 
  title: string; 
  fileName?: string; 
  url?: string; // Changed from dataUrl to url
  fileSize?: number;
};

type AssignmentItem = { id: string; title: string; files: { fileName: string; dataUrl?: string }[] };
type QuizItem =
  | { id: string; type: "mcq"; questions: { id: string; q: string; opts: string[]; answer: number }[] }
  | { id: string; type: "written" }
  | { id: string; type: "file-upload" };

type Course = {
  id: string;
  title: string;
  thumbnail?: string;
  videos?: VideoItem[];
  quizzes?: QuizItem[];
  assignments?: AssignmentItem[];
  description?: string;
  price?: number;
  createdAt: number;
  creator?: string;
};

const STORAGE_KEY = "nxtgen_courses";

function loadCourses(): Course[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Course[]) : [];
  } catch {
    return [];
  }
}

function saveCourses(courses: Course[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
    window.dispatchEvent(new CustomEvent("courses:updated"));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      alert('Storage quota exceeded. Please use video URLs instead of uploading large files.');
      throw error;
    }
    throw error;
  }
}

/**
 * ManageCourse page - list, search, sort, edit link
 */
export default function ManageCourse() {
  const { hasRole } = useAuth();
  const [courses, setCourses] = useState<Course[]>(() => loadCourses());
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"latest" | "oldest">("latest");

  useEffect(() => {
    const handler = () => setCourses(loadCourses());
    window.addEventListener("courses:updated", handler);
    return () => window.removeEventListener("courses:updated", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = courses.filter((c) => !q || c.title.toLowerCase().includes(q));
    arr.sort((a, b) => (sort === "latest" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt));
    return arr;
  }, [courses, query, sort]);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold text-nxtgen-text-primary">Manage Courses</h1>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center border rounded overflow-hidden">
              <div className="px-3">
                <Search size={18} />
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses..."
                className="px-3 py-2 outline-none"
              />
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="px-3 py-2 border rounded"
              aria-label="Sort by"
            >
              <option value="latest">Latest added</option>
              <option value="oldest">Oldest</option>
            </select>

            {hasRole && hasRole(["instructor", "admin", "contentCreator"]) ? (
              <Link to="/app/managecourse/add" className="px-4 py-2 bg-[#515DEF] text-white rounded hover:bg-[#414BCF] transition-colors">
                Add Course
              </Link>
            ) : null}
          </div>
        </div>

        {/* Course cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center text-gray-500 py-12">
              <p className="text-lg mb-2">No courses found</p>
              {hasRole && hasRole(["instructor", "admin", "contentCreator"]) && (
                <Link to="/app/managecourse/add" className="text-blue-600 hover:underline">
                  Create your first course
                </Link>
              )}
            </div>
          ) : (
            filtered.map((c) => (
              <div key={c.id} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="h-40 bg-gray-100 rounded-md mb-4 overflow-hidden">
                  {c.thumbnail ? (
                    <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No thumbnail
                    </div>
                  )}
                </div>
                <h3 className="font-semibold mb-2">{c.title}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-3">{c.description || "No description"}</p>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">Price: ₹{c.price ?? 0}</div>
                  <div className="flex items-center gap-2">
                    {hasRole && hasRole(["instructor", "admin", "contentCreator"]) && (
                      <Link
                        to={`/app/managecourse/edit/${c.id}`}
                        className="text-sm px-3 py-1 border rounded hover:bg-gray-50"
                      >
                        Edit
                      </Link>
                    )}
                    <div className="text-xs text-gray-400">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * AddCourse page (also handles edit when :id param present)
 * exported named so route can import { AddCourse }
 */
export function AddCourse() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEditing = !!id;
  
  const [form, setForm] = useState<Partial<Course>>({
    title: "",
    thumbnail: "",
    videos: [],
    quizzes: [],
    assignments: [],
    description: "",
    price: 0,
  });

  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editingVideoTitle, setEditingVideoTitle] = useState("");

  useEffect(() => {
    if (id) {
      const c = loadCourses().find((x) => x.id === id);
      if (c) setForm(c);
    }
  }, [id]);

  function updateField<K extends keyof Course>(k: K, v: Course[K] | any) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  // Video handlers - Now uses URL instead of file upload
  function addVideoByUrl(url: string, title?: string) {
    const vid: VideoItem = { 
      id: String(Date.now()), 
      title: title || "Video Lesson",
      url: url,
      fileName: url.split('/').pop() || 'video'
    };
    const next = [...(form.videos ?? []), vid];
    updateField("videos", next);
  }

  function startEditingVideo(video: VideoItem) {
    setEditingVideoId(video.id);
    setEditingVideoTitle(video.title);
  }

  function saveVideoTitle(videoId: string) {
    const updated = (form.videos ?? []).map(v => 
      v.id === videoId ? { ...v, title: editingVideoTitle } : v
    );
    updateField("videos", updated);
    setEditingVideoId(null);
    setEditingVideoTitle("");
  }

  function removeVideo(id: string) {
    updateField("videos", (form.videos ?? []).filter((v) => v.id !== id));
  }

  // Quiz handlers - Only MCQ
  function addMcqQuiz() {
    const q: QuizItem = { id: String(Date.now()), type: "mcq", questions: [] };
    updateField("quizzes", [...(form.quizzes ?? []), q]);
  }

  function removeQuiz(id: string) {
    updateField("quizzes", (form.quizzes ?? []).filter((q) => (q as any).id !== id));
  }

  function addMcqQuestion(quizId: string) {
    const quizzes = (form.quizzes ?? []).map((q) => {
      if (q.type === "mcq" && q.id === quizId) {
        const questions = q.questions || [];
        questions.push({ id: String(Date.now()), q: "New question", opts: ["Option 1", "Option 2", "Option 3", "Option 4"], answer: 0 });
        return { ...q, questions };
      }
      return q;
    });
    updateField("quizzes", quizzes);
  }

  function removeMcqQuestion(quizId: string, questionId: string) {
    const quizzes = (form.quizzes ?? []).map((q) => {
      if (q.type === "mcq" && q.id === quizId) {
        return {
          ...q,
          questions: q.questions.filter(qq => qq.id !== questionId)
        };
      }
      return q;
    });
    updateField("quizzes", quizzes);
  }

  function updateMcqQuestion(quizId: string, questionId: string, updater: (q: any) => any) {
    const quizzes = (form.quizzes ?? []).map((q) => {
      if (q.type === "mcq" && q.id === quizId) {
        return {
          ...q,
          questions: q.questions.map((qq) => (qq.id === questionId ? updater(qq) : qq)),
        };
      }
      return q;
    });
    updateField("quizzes", quizzes);
  }

  function ensureNumber(x: any) {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    
    if (!form.title || form.title.trim() === "") {
      alert("Course title is required");
      return;
    }

    const now = Date.now();
    const existing = loadCourses();
    
    try {
      if (isEditing && id) {
        const updated = existing.map((c) => 
          c.id === id 
            ? { 
                ...c, 
                ...form,
                title: form.title!.trim(),
                price: ensureNumber(form.price)
              } as Course
            : c
        );
        saveCourses(updated);
      } else {
        const newCourse: Course = {
          id: String(now),
          title: form.title.trim(),
          thumbnail: form.thumbnail || "",
          videos: form.videos ?? [],
          quizzes: form.quizzes ?? [],
          assignments: form.assignments ?? [],
          description: form.description || "",
          price: ensureNumber(form.price),
          createdAt: now,
          creator: user?.id || "unknown"
        };
        saveCourses([newCourse, ...existing]);
      }
      
      navigate("/app/managecourse");
    } catch (error) {
      console.error("Failed to save course:", error);
    }
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-white">
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

          <div className="flex items-center gap-3 pt-4 border-t">
            <button 
              type="submit" 
              className="px-6 py-3 bg-[#515DEF] text-white rounded hover:bg-[#414BCF] transition-colors font-medium"
            >
              {isEditing ? "Update Course" : "Create Course"}
            </button>
            <button 
              type="button" 
              onClick={() => navigate("/app/managecourse")} 
              className="px-6 py-3 border rounded hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
