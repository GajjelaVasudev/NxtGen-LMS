import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type Assignment = {
  id: string;
  title: string;
  description: string;
  courseId: string;
  courseName: string;
  instructorId: string;
  dueDate: string;
  imageUrl?: string;
  createdAt: number;
};

const ASSIGNMENTS_KEY = "nxtgen_assignments";
const COURSES_KEY = "nxtgen_courses";

function loadAssignments(): Assignment[] {
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_KEY);
    return raw ? (JSON.parse(raw) as Assignment[]) : [];
  } catch {
    return [];
  }
}

function saveAssignments(assignments: Assignment[]) {
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  window.dispatchEvent(new CustomEvent("assignments:updated"));
}

function loadCourses() {
  try {
    const raw = localStorage.getItem(COURSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function CreateAssignment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [assignments] = useState<Assignment[]>(() => loadAssignments());
  const [courses] = useState(() => loadCourses());
  
  const [form, setForm] = useState({
    title: "",
    description: "",
    courseId: "",
    dueDate: "",
    imageUrl: ""
  });

  useEffect(() => {
    if (isEditing) {
      const assignment = loadAssignments().find(a => a.id === id);
      if (assignment) {
        setForm({
          title: assignment.title,
          description: assignment.description,
          courseId: assignment.courseId,
          dueDate: assignment.dueDate,
          imageUrl: assignment.imageUrl || ""
        });
      }
    }
  }, [id, isEditing]);

  const handleImageUpload = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !form.title || !form.description || !form.courseId || !form.dueDate) {
      alert("Please fill all required fields");
      return;
    }

    const selectedCourse = courses.find((c: any) => c.id === form.courseId);
    if (!selectedCourse) {
      alert("Selected course not found");
      return;
    }

    const existing = loadAssignments();
    
    if (isEditing) {
      const updated = existing.map(a => 
        a.id === id 
          ? { 
              ...a, 
              title: form.title,
              description: form.description,
              courseId: form.courseId,
              courseName: selectedCourse.title,
              dueDate: form.dueDate,
              imageUrl: form.imageUrl
            }
          : a
      );
      saveAssignments(updated);
    } else {
      const newAssignment: Assignment = {
        id: String(Date.now()),
        title: form.title,
        description: form.description,
        courseId: form.courseId,
        courseName: selectedCourse.title,
        instructorId: user.id,
        dueDate: form.dueDate,
        imageUrl: form.imageUrl,
        createdAt: Date.now()
      };
      
      saveAssignments([newAssignment, ...existing]);
    }

    navigate("/app/assignments");
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-white min-h-0">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          {isEditing ? "Edit Assignment" : "Create Assignment"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Assignment Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Course *</label>
            <select
              value={form.courseId}
              onChange={(e) => setForm({ ...form, courseId: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              required
            >
              <option value="">Select a course</option>
              {courses.map((course: any) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Due Date *</label>
            <input
              type="datetime-local"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Assignment Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    const imageUrl = await handleImageUpload(file);
                    setForm({ ...form, imageUrl });
                  } catch (error) {
                    alert("Failed to upload image");
                  }
                }
              }}
              className="w-full border rounded-md px-3 py-2"
            />
            {form.imageUrl && (
              <div className="mt-2">
                <img 
                  src={form.imageUrl} 
                  alt="Assignment preview" 
                  className="w-full max-w-md h-40 object-cover rounded-md"
                />
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="px-6 py-2 bg-[#515DEF] text-white rounded-md hover:bg-[#515DEF]/90"
            >
              {isEditing ? "Update Assignment" : "Create Assignment"}
            </button>
            
            <button
              type="button"
              onClick={() => navigate("/app/assignments")}
              className="px-6 py-2 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}