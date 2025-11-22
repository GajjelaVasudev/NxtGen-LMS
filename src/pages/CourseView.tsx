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
  const [progress, setProgress] = useState<Progress | null>(null);
  const [activeSection, setActiveSection] = useState<"overview" | "content">("overview");
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizItem | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<any>({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  useEffect(() => {
    if (courseId && user) {
      const courses = loadCourses();
      const foundCourse = courses.find(c => c.id === courseId);
      setCourse(foundCourse || null);
      
      if (foundCourse) {
        const userProgress = loadProgress(user.id, courseId);
        setProgress(userProgress);
        
        // Auto-select first video if none selected
        if (foundCourse.videos && foundCourse.videos.length > 0 && !selectedVideo) {
          setSelectedVideo(foundCourse.videos[0]);
        }
      }
    }
  }, [courseId, user]);

  if (!course) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-white">
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Course not found</p>
            <Link to="/app/courses" className="text-blue-600 hover:underline">
              Back to My Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const markVideoComplete = (videoId: string) => {
    if (!progress || !user) return;
    
    if (!progress.completedVideos.includes(videoId)) {
      const updated = {
        ...progress,
        completedVideos: [...progress.completedVideos, videoId]
      };
      setProgress(updated);
      saveProgress(updated);
    }
  };

  const isVideoCompleted = (videoId: string) => {
    return progress?.completedVideos.includes(videoId) || false;
  };

  const isQuizUnlocked = (quizIndex: number) => {
    if (!course.videos || course.videos.length === 0) return true;
    const videoToComplete = course.videos[quizIndex];
    return videoToComplete ? isVideoCompleted(videoToComplete.id) : true;
  };

  const isQuizCompleted = (quizId: string) => {
    return progress?.completedQuizzes.some(q => q.quizId === quizId) || false;
  };

  const handleQuizSubmit = () => {
    if (!selectedQuiz || selectedQuiz.type !== "mcq" || !progress || !user) return;

    let correct = 0;
    selectedQuiz.questions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.answer) {
        correct++;
      }
    });

    const score = Math.round((correct / selectedQuiz.questions.length) * 100);
    setQuizScore(score);
    setShowQuizResults(true);

    const updated = {
      ...progress,
      completedQuizzes: [
        ...progress.completedQuizzes.filter(q => q.quizId !== selectedQuiz.id),
        { quizId: selectedQuiz.id, score, answers: quizAnswers }
      ]
    };
    setProgress(updated);
    saveProgress(updated);
  };

  const getQuizScore = (quizId: string) => {
    return progress?.completedQuizzes.find(q => q.quizId === quizId)?.score;
  };

  const courseProgress = () => {
    if (!course || !progress) return 0;
    
    const totalItems = (course.videos?.length || 0) + (course.quizzes?.length || 0) + (course.assignments?.length || 0);
    const completedItems = progress.completedVideos.length + progress.completedQuizzes.length + progress.completedAssignments.length;
    
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/app/courses")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            Back to My Courses
          </button>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-start gap-6">
              {course.thumbnail && (
                <img 
                  src={course.thumbnail} 
                  alt={course.title} 
                  className="w-48 h-32 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
                <p className="text-gray-600 mb-4">{course.description}</p>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Course Progress</span>
                    <span className="text-sm font-bold text-blue-600">{courseProgress()}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all"
                      style={{ width: `${courseProgress()}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <PlayCircle size={16} />
                    <span>{course.videos?.length || 0} Videos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClipboardList size={16} />
                    <span>{course.quizzes?.length || 0} Quizzes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText size={16} />
                    <span>{course.assignments?.length || 0} Assignments</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveSection("overview")}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeSection === "overview"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveSection("content")}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeSection === "content"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Course Content
          </button>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeSection === "overview" ? (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h2 className="text-2xl font-bold mb-4">About This Course</h2>
                <p className="text-gray-700 mb-6">{course.description || "No description available."}</p>
                
                <h3 className="text-xl font-semibold mb-3">What You'll Learn</h3>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Access to {course.videos?.length || 0} video lessons</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Complete {course.quizzes?.length || 0} quizzes to test your knowledge</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Submit {course.assignments?.length || 0} assignments for evaluation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Track your progress and earn certificates</span>
                  </li>
                </ul>

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
                      <button
                        onClick={() => markVideoComplete(selectedVideo.id)}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Mark as Complete
                      </button>
                    )}
                  </div>
                )}

                {/* Quiz View */}
                {selectedQuiz && (
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h3 className="text-xl font-bold mb-4">Quiz: {selectedQuiz.type.toUpperCase()}</h3>
                    
                    {selectedQuiz.type === "mcq" && !showQuizResults ? (
                      <div className="space-y-6">
                        {selectedQuiz.questions.map((question, qIdx) => (
                          <div key={question.id} className="border-b pb-4">
                            <p className="font-medium mb-3">{qIdx + 1}. {question.q}</p>
                            <div className="space-y-2">
                              {question.opts.map((opt, optIdx) => (
                                <label key={optIdx} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`question-${qIdx}`}
                                    value={optIdx}
                                    checked={quizAnswers[qIdx] === optIdx}
                                    onChange={() => setQuizAnswers({ ...quizAnswers, [qIdx]: optIdx })}
                                    className="w-4 h-4"
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                        
                        <button
                          onClick={handleQuizSubmit}
                          disabled={Object.keys(quizAnswers).length < selectedQuiz.questions.length}
                          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                          Submit Quiz
                        </button>
                      </div>
                    ) : selectedQuiz.type === "mcq" && showQuizResults ? (
                      <div className="text-center">
                        <div className="mb-6">
                          <Award className={`w-20 h-20 mx-auto mb-4 ${quizScore >= 70 ? 'text-green-500' : 'text-orange-500'}`} />
                          <h4 className="text-3xl font-bold mb-2">{quizScore}%</h4>
                          <p className="text-gray-600">
                            {quizScore >= 90 ? "Excellent!" : quizScore >= 70 ? "Good job!" : "Keep practicing!"}
                          </p>
                        </div>
                        
                        <button
                          onClick={() => {
                            setSelectedQuiz(null);
                            setShowQuizResults(false);
                            setQuizAnswers({});
                          }}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Back to Course
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-600 mb-4">This quiz requires written submission or file upload.</p>
                        <button
                          onClick={() => setSelectedQuiz(null)}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Back to Course
                        </button>
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
              {course.videos && course.videos.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <PlayCircle size={16} />
                    Video Lessons
                  </h4>
                  <div className="space-y-2">
                    {course.videos.map((video, idx) => (
                      <button
                        key={video.id}
                        onClick={() => {
                          setSelectedVideo(video);
                          setSelectedQuiz(null);
                          setShowQuizResults(false);
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedVideo?.id === video.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex-shrink-0 ${isVideoCompleted(video.id) ? 'text-green-500' : 'text-gray-400'}`}>
                            {isVideoCompleted(video.id) ? <CheckCircle size={20} /> : <PlayCircle size={20} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{idx + 1}. {video.title}</div>
                            {video.duration && (
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock size={12} />
                                {video.duration}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quizzes */}
              {course.quizzes && course.quizzes.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <ClipboardList size={16} />
                    Quizzes
                  </h4>
                  <div className="space-y-2">
                    {course.quizzes.map((quiz, idx) => {
                      const unlocked = isQuizUnlocked(idx);
                      const completed = isQuizCompleted(quiz.id);
                      const score = getQuizScore(quiz.id);
                      
                      return (
                        <button
                          key={quiz.id}
                          onClick={() => {
                            if (unlocked) {
                              setSelectedQuiz(quiz);
                              setSelectedVideo(null);
                              setShowQuizResults(false);
                              setQuizAnswers({});
                            }
                          }}
                          disabled={!unlocked}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            !unlocked
                              ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                              : selectedQuiz?.id === quiz.id
                              ? "border-purple-500 bg-purple-50"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex-shrink-0 ${
                              !unlocked ? 'text-gray-400' :
                              completed ? 'text-green-500' : 'text-purple-500'
                            }`}>
                              {!unlocked ? <Lock size={20} /> : 
                               completed ? <CheckCircle size={20} /> : 
                               <ClipboardList size={20} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                Quiz {idx + 1}: {quiz.type.toUpperCase()}
                              </div>
                              {!unlocked && (
                                <div className="text-xs text-gray-500">Complete video {idx + 1} to unlock</div>
                              )}
                              {completed && score !== undefined && (
                                <div className="text-xs text-green-600 font-medium">Score: {score}%</div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Assignments */}
              {course.assignments && course.assignments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <FileText size={16} />
                    Assignments
                  </h4>
                  <div className="space-y-2">
                    {course.assignments.map((assignment, idx) => (
                      <div
                        key={assignment.id}
                        className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <FileText size={20} className="text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{assignment.title}</div>
                            <div className="text-xs text-gray-500">{assignment.files.length} file(s)</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}