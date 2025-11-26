import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, PlayCircle, FileText, ClipboardList, CheckCircle, Lock, Clock, Award } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type VideoItem = { 
  id: string; 
  title: string; 
  fileName?: string; 
  url?: string; // Changed from dataUrl to url
  duration?: string;
};

type QuizItem =
  | { id: string; type: "mcq"; questions: { id: string; q: string; opts: string[]; answer: number }[] }
  | { id: string; type: "written" }
  | { id: string; type: "file-upload" };

type AssignmentItem = { 
  id: string; 
  title: string; 
  files: { fileName: string; dataUrl?: string }[];
};

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

type Progress = {
  userId: string;
  courseId: string;
  completedVideos: string[];
  completedQuizzes: { quizId: string; score: number; answers: any }[];
  completedAssignments: string[];
  lastAccessed: number;
};

const COURSES_KEY = "nxtgen_courses";
const PROGRESS_KEY = "nxtgen_course_progress";

function loadCourses(): Course[] {
  try {
    const raw = localStorage.getItem(COURSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadProgress(userId: string, courseId: string): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const allProgress = raw ? JSON.parse(raw) : [];
    return allProgress.find((p: Progress) => p.userId === userId && p.courseId === courseId) || {
      userId,
      courseId,
      completedVideos: [],
      completedQuizzes: [],
      completedAssignments: [],
      lastAccessed: Date.now()
    };
  } catch {
    return {
      userId,
      courseId,
      completedVideos: [],
      completedQuizzes: [],
      completedAssignments: [],
      lastAccessed: Date.now()
    };
  }
}

function saveProgress(progress: Progress) {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    let allProgress = raw ? JSON.parse(raw) : [];
    const index = allProgress.findIndex((p: Progress) => p.userId === progress.userId && p.courseId === progress.courseId);
    
    if (index >= 0) {
      allProgress[index] = { ...progress, lastAccessed: Date.now() };
    } else {
      allProgress.push({ ...progress, lastAccessed: Date.now() });
    }
    
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(allProgress));
    window.dispatchEvent(new CustomEvent("progress:updated"));
  } catch (err) {
    console.error("Error saving progress:", err);
  }
}

export default function CourseView() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [activeContentTab, setActiveContentTab] = useState<'learn' | 'practice' | 'submit'>('learn');
  const [loadingServer, setLoadingServer] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState<boolean>(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [activeSection, setActiveSection] = useState<'overview' | 'content'>('overview');
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizItem | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<any>({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function loadCourse() {
      if (!courseId || !user) return;
      try {
        setLoadingServer(true);
        setServerError(null);

        // Try cache first
        try {
          const cached = loadCourses().find((c) => c.id === courseId);
          if (cached && mounted) {
            const normalized = normalizeCourse(cached);
            setCourse(normalized);
            setProgress(loadProgress(user.id, courseId));
            if (normalized.videos && normalized.videos.length > 0) setSelectedVideo(normalized.videos[0]);
          }
        } catch (_) {}

        const API = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_URL as string) || '/api';
        const res = await fetch(`${API}/courses/${courseId}`);
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Failed to load course: ${res.status} ${res.statusText} ${text}`);
        }
        const body = await res.json().catch(() => null);
        const serverCourse = body?.course || body || null;
        if (serverCourse && mounted) {
          const normalized = normalizeCourse(serverCourse);
          setCourse(normalized);
          try {
            const all = loadCourses();
            const others = all.filter((c: any) => c.id !== normalized.id);
            localStorage.setItem(COURSES_KEY, JSON.stringify([normalized, ...others]));
          } catch (_) {}

          setProgress(loadProgress(user.id, courseId));
          if (normalized.videos && normalized.videos.length > 0) setSelectedVideo(normalized.videos[0]);

          // fetch assignments scoped to this course
          (async () => {
            try {
              const aRes = await fetch(`${API}/assignments?courseId=${encodeURIComponent(courseId)}`);
              if (aRes.ok) {
                const aBody = await aRes.json().catch(() => null);
                const list = (aBody && aBody.data) || aBody || [];
                const updated = { ...normalized, assignments: list.map((a: any) => ({ id: a.id, title: a.title || a.name, files: a.files || [], courseId: a.course_id || a.courseId })) };
                setCourse(updated);
                try {
                  const all2 = loadCourses();
                  const others2 = all2.filter((c: any) => c.id !== updated.id);
                  localStorage.setItem(COURSES_KEY, JSON.stringify([updated, ...others2]));
                } catch (_) {}
              }
            } catch (ae) {
              console.warn('[CourseView] failed to fetch assignments for course', ae);
            }
          })();

          // fetch user's submissions once to compute assignment submission status
          (async () => {
            try {
              const sRes = await fetch(`${API}/submissions?userId=${encodeURIComponent(user.id)}`);
              if (sRes.ok) {
                const sBody = await sRes.json().catch(() => null);
                const subs = (sBody && sBody.data) || sBody || [];
                const subMap: Record<string, any> = {};
                subs.forEach((s: any) => { if (s.assignment_id) subMap[String(s.assignment_id)] = s; });
                const completed = Object.keys(subMap);
                if (completed.length > 0) {
                  const userProgress = loadProgress(user.id, courseId);
                  const newProgress = { ...userProgress, completedAssignments: completed };
                  setProgress(newProgress);
                  saveProgress(newProgress);
                }
              }
            } catch (se) {
              console.warn('[CourseView] failed to fetch user submissions', se);
            }
          })();

          // verify enrollment
          (async () => {
            try {
              const eRes = await fetch(`${API}/enrollments?userId=${encodeURIComponent(user.id)}`);
              if (eRes.ok) {
                const eBody = await eRes.json().catch(() => null);
                const enrolls = (eBody && (eBody.enrollments || eBody.data)) || [];
                const found = enrolls.some((en: any) => String(en.course_id || en.courseId) === String(courseId));
                setEnrolled(found || String(user.id) === String((normalized as any).creator) || String(user.id) === String((normalized as any).owner_id));
              }
            } catch (ee) {
              console.warn('[CourseView] failed to verify enrollment', ee);
            }
          })();
        }
      } catch (err: any) {
        console.error('[CourseView] load error', err);
        setServerError(String(err?.message || err));
      } finally {
        if (mounted) setLoadingServer(false);
      }
    }

    loadCourse();
    return () => { mounted = false; };
  }, [courseId, user]);

  // helpers
  function isVideoCompleted(id: string) {
    return !!progress && progress.completedVideos.includes(String(id));
  }

  function markVideoComplete(id: string) {
    if (!progress || !course) return;
    if (!progress.completedVideos.includes(String(id))) {
      const updated = { ...progress, completedVideos: [...progress.completedVideos, String(id)] };
      setProgress(updated);
      saveProgress(updated);
    }
  }

  function isQuizUnlocked(idx: number) {
    const vid = course?.videos?.[idx];
    if (!vid) return true;
    return isVideoCompleted(vid.id);
  }

  function isQuizCompleted(quizId: string) {
    if (!progress) return false;
    return progress.completedQuizzes.some((q) => String((q as any).quizId) === String(quizId));
  }

  function getQuizScore(quizId: string) {
    if (!progress) return undefined;
    const q = progress.completedQuizzes.find((x) => String((x as any).quizId) === String(quizId));
    return q ? (q as any).score : undefined;
  }

  function handleQuizSubmit() {
    if (!selectedQuiz || selectedQuiz.type !== 'mcq' || !progress || !course) return;
    const questions = (selectedQuiz as any).questions || [];
    let correct = 0;
    questions.forEach((q: any, idx: number) => {
      if (typeof quizAnswers[idx] !== 'undefined' && quizAnswers[idx] === q.answer) correct += 1;
    });
    const score = Math.round((correct / questions.length) * 100);
    const updated = { ...progress, completedQuizzes: [...progress.completedQuizzes, { quizId: selectedQuiz.id, score, answers: quizAnswers }] };
    setProgress(updated);
    saveProgress(updated);
    setQuizScore(score);
    setShowQuizResults(true);
  }

  const courseProgress = () => {
    if (!course || !progress) return 0;
    const totalItems = (course.videos?.length || 0) + (course.quizzes?.length || 0) + (course.assignments?.length || 0);
    const completedItems = (progress.completedVideos?.length || 0) + (progress.completedQuizzes?.length || 0) + (progress.completedAssignments?.length || 0);
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  // Early/guard returns
  if (loadingServer) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-white">
        <div className="max-w-7xl mx-auto p-6 text-center">
          <p className="text-gray-500">Loading course...</p>
        </div>
      </div>
    );
  }

  if (serverError) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-white">
        <div className="max-w-7xl mx-auto p-6 text-center">
          <p className="text-red-600 mb-4">{serverError}</p>
          <Link to="/app/courses" className="text-blue-600 hover:underline">Back to My Courses</Link>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-white">
        <div className="max-w-7xl mx-auto p-6 text-center">
          <p className="text-gray-500 mb-4">Course not found</p>
          <Link to="/app/courses" className="text-blue-600 hover:underline">Back to My Courses</Link>
        </div>
      </div>
    );
  }

  // Access control: students must be enrolled to view purchased course
  const userRole = (user as any)?.role || 'student';
  if (userRole === 'student' && !enrolled) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-white">
        <div className="max-w-7xl mx-auto p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">You do not own this course. Purchase or enroll to access the content.</p>
          <Link to="/app/courses" className="px-4 py-2 bg-blue-600 text-white rounded">Back to Courses</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-800">
                <ArrowLeft />
              </button>
              <div>
                <h1 className="text-2xl font-bold">{course.title}</h1>
                <p className="text-sm text-gray-500">{course.description}</p>
              </div>
            </div>
            <div className="w-64">
              <div className="text-xs text-gray-500 mb-1">Progress</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${courseProgress()}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveSection('overview')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeSection === 'overview' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveSection('content')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeSection === 'content' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Course Content
          </button>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeSection === 'overview' ? (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h2 className="text-2xl font-bold mb-4">About This Course</h2>
                <p className="text-gray-700 mb-6">{course.description || 'No description available.'}</p>

                <h3 className="text-xl font-semibold mb-3">Course Structure</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <PlayCircle className="w-8 h-8 text-blue-600 mb-2" />
                    <div className="text-2xl font-bold text-blue-600">{course.videos?.length || 0}</div>
                    <div className="text-sm text-gray-600">Video Lessons</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <ClipboardList className="w-8 h-8 text-purple-600 mb-2" />
                    <div className="text-2xl font-bold text-purple-600">{course.quizzes?.length || 0}</div>
                    <div className="text-sm text-gray-600">Quizzes</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <FileText className="w-8 h-8 text-green-600 mb-2" />
                    <div className="text-2xl font-bold text-green-600">{course.assignments?.length || 0}</div>
                    <div className="text-sm text-gray-600">Assignments</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Video Player */}
                {selectedVideo && (
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h3 className="text-xl font-bold mb-4">{selectedVideo.title}</h3>
                    <div className="bg-gray-900 rounded-lg aspect-video flex items-center justify-center mb-4">
                      {selectedVideo.url ? (
                        <iframe
                          src={selectedVideo.url}
                          className="w-full h-full rounded-lg"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div className="text-white text-center">
                          <PlayCircle size={64} className="mx-auto mb-4 opacity-50" />
                          <p>Video not available</p>
                        </div>
                      )}
                    </div>

                    {!isVideoCompleted(selectedVideo.id) && (
                      <button onClick={() => markVideoComplete(selectedVideo.id)} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Mark as Complete</button>
                    )}
                  </div>
                )}

                {/* Quiz View */}
                {selectedQuiz && (
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h3 className="text-xl font-bold mb-4">Quiz: {selectedQuiz.type.toUpperCase()}</h3>
                    {selectedQuiz.type === 'mcq' && !showQuizResults ? (
                      <div className="space-y-6">
                        {(selectedQuiz as any).questions.map((question: any, qIdx: number) => (
                          <div key={question.id} className="border-b pb-4">
                            <p className="font-medium mb-3">{qIdx + 1}. {question.q}</p>
                            <div className="space-y-2">
                              {question.opts.map((opt: string, optIdx: number) => (
                                <label key={optIdx} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                  <input type="radio" name={`question-${qIdx}`} value={optIdx} checked={quizAnswers[qIdx] === optIdx} onChange={() => setQuizAnswers({ ...quizAnswers, [qIdx]: optIdx })} className="w-4 h-4" />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}

                        <button onClick={handleQuizSubmit} disabled={Object.keys(quizAnswers).length < ((selectedQuiz as any).questions || []).length} className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium">Submit Quiz</button>
                      </div>
                    ) : selectedQuiz.type === 'mcq' && showQuizResults ? (
                      <div className="text-center">
                        <div className="mb-6">
                          <Award className={`w-20 h-20 mx-auto mb-4 ${quizScore >= 70 ? 'text-green-500' : 'text-orange-500'}`} />
                          <h4 className="text-3xl font-bold mb-2">{quizScore}%</h4>
                          <p className="text-gray-600">{quizScore >= 90 ? 'Excellent!' : quizScore >= 70 ? 'Good job!' : 'Keep practicing!'}</p>
                        </div>

                        <button onClick={() => { setSelectedQuiz(null); setShowQuizResults(false); setQuizAnswers({}); }} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Back to Course</button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-600 mb-4">This quiz requires written submission or file upload.</p>
                        <button onClick={() => setSelectedQuiz(null)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Back to Course</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar - Course Curriculum */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 shadow-sm sticky top-6">
              <h3 className="text-lg font-bold mb-4">Course Curriculum</h3>

              {/* Videos */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><PlayCircle size={16} />Video Lessons</h4>
                {course.videos && course.videos.length > 0 ? (
                  <div className="space-y-2">
                    {course.videos.map((video, idx) => (
                      <button key={video.id} onClick={() => { setSelectedVideo(video); setSelectedQuiz(null); setShowQuizResults(false); setActiveContentTab('learn'); }} className={`w-full text-left p-3 rounded-lg border transition-all ${selectedVideo?.id === video.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`flex-shrink-0 ${isVideoCompleted(video.id) ? 'text-green-500' : 'text-gray-400'}`}>{isVideoCompleted(video.id) ? <CheckCircle size={20} /> : <PlayCircle size={20} />}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{idx + 1}. {video.title}</div>
                            {video.duration && <div className="text-xs text-gray-500 flex items-center gap-1"><Clock size={12} />{video.duration}</div>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Nothing to complete here yet 👀</div>
                )}
              </div>

              {/* Quizzes */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><ClipboardList size={16} />Quizzes</h4>
                {course.quizzes && course.quizzes.length > 0 ? (
                  <div className="space-y-2">
                    {course.quizzes.map((quiz, idx) => {
                      const unlocked = isQuizUnlocked(idx);
                      const completed = isQuizCompleted((quiz as any).id);
                      const score = getQuizScore((quiz as any).id);
                      return (
                        <button key={(quiz as any).id} onClick={() => { if (unlocked) { setSelectedQuiz(quiz); setSelectedVideo(null); setShowQuizResults(false); setQuizAnswers({}); setActiveContentTab('practice'); } }} disabled={!unlocked} className={`w-full text-left p-3 rounded-lg border transition-all ${!unlocked ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' : selectedQuiz?.id === (quiz as any).id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`flex-shrink-0 ${!unlocked ? 'text-gray-400' : completed ? 'text-green-500' : 'text-purple-500'}`}>{!unlocked ? <Lock size={20} /> : completed ? <CheckCircle size={20} /> : <ClipboardList size={20} />}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">Quiz {idx + 1}: {(quiz as any).type?.toUpperCase?.() || 'QUIZ'}</div>
                              {!unlocked && <div className="text-xs text-gray-500">Complete video {idx + 1} to unlock</div>}
                              {completed && score !== undefined && <div className="text-xs text-green-600 font-medium">Score: {score}%</div>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Nothing to complete here yet 👀</div>
                )}
              </div>

              {/* Assignments */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><FileText size={16} />Assignments</h4>
                {course.assignments && course.assignments.length > 0 ? (
                  <div className="space-y-2">
                    {course.assignments.map((assignment) => {
                      const submitted = progress?.completedAssignments.includes(String(assignment.id));
                      return (
                        <div key={assignment.id} className="p-3 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText size={20} className="text-gray-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{assignment.title}</div>
                              <div className="text-xs text-gray-500">{(assignment.files || []).length} file(s)</div>
                            </div>
                          </div>
                          <div>{submitted ? <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">Submitted</span> : <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Not submitted</span>}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Nothing to complete here yet 👀</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
}

// Normalize course object to support legacy field names and ensure arrays exist
function normalizeCourse(raw: any): Course {
  if (!raw) return raw;
  const out: any = { ...raw };

  // Videos: new key `videos`, legacy `contents`
  if (!Array.isArray(out.videos) && Array.isArray(out.contents)) {
    out.videos = out.contents.map((c: any, idx: number) => ({ id: c.id || `v-${idx}`, title: c.title || c.name || `Video ${idx+1}`, url: c.url || c.dataUrl || c.videoUrl, duration: c.duration }));
  }
  out.videos = Array.isArray(out.videos) ? out.videos.map((v: any, i: number) => ({ id: String(v.id || `v-${i}`), title: v.title || v.name || `Video ${i+1}`, url: v.url || v.dataUrl || v.videoUrl || undefined, duration: v.duration })) : [];

  // Quizzes: new key `quizzes`, legacy `assessments`
  if (!Array.isArray(out.quizzes) && Array.isArray(out.assessments)) {
    out.quizzes = out.assessments.map((q: any, idx: number) => ({ id: q.id || `q-${idx}`, type: q.type || 'mcq', questions: q.questions || [] }));
  }
  out.quizzes = Array.isArray(out.quizzes) ? out.quizzes.map((q: any, i: number) => ({ id: String(q.id || `q-${i}`), type: q.type || 'mcq', questions: q.questions || [] })) : [];

  // Assignments: new key `assignments`, legacy `homeworks` or `assessments` with assignment flag
  if (!Array.isArray(out.assignments) && Array.isArray(out.homeworks)) {
    out.assignments = out.homeworks.map((a: any, idx: number) => ({ id: a.id || `a-${idx}`, title: a.title || a.name || `Assignment ${idx+1}`, files: a.files || [] }));
  }
  // Some legacy courses used `assessments` containing mixed items; extract assignments where type === 'assignment' or has files
  if (!Array.isArray(out.assignments) && Array.isArray(out.assessments)) {
    out.assignments = out.assessments.filter((x: any) => x.type === 'assignment' || (x.files && x.files.length)).map((a: any, idx: number) => ({ id: a.id || `a-${idx}`, title: a.title || a.name || `Assignment ${idx+1}`, files: a.files || [] }));
  }
  out.assignments = Array.isArray(out.assignments) ? out.assignments.map((a: any, i: number) => ({ id: String(a.id || `a-${i}`), title: a.title || a.name || `Assignment ${i+1}`, files: Array.isArray(a.files) ? a.files : [] })) : [];

  return out as Course;
}