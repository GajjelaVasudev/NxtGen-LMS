import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getAccessToken } from '@/utils/supabaseBrowser';

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

const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";

export default function CreateAssignment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [assignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  
  const [form, setForm] = useState({
    title: "",
    description: "",
    courseId: "",
    dueDate: "",
    imageUrl: ""
  });

  useEffect(() => {
    if (isEditing) {
      // fetch the assignment from server when editing
      let mounted = true;
      (async () => {
        try {
          const res = await fetch(`${API}/assignments/${id}`);
          if (!res.ok) return;
          const json = await res.json();
          if (!mounted) return;
          const a = json.data;
          if (a) {
            setForm({
              title: a.title || "",
              description: a.description || "",
              courseId: a.course_id || a.courseId || "",
              dueDate: a.due_at || a.dueAt || "",
              imageUrl: a.image_url || a.imageUrl || ""
            });
          }
        } catch (e) {
          // ignore
        }
      })();
    }
  }, [id, isEditing]);

  useEffect(() => {
    // load courses from server
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API}/courses`);
        const json = await res.json();
        if (!mounted) return;
        setCourses(json.courses || []);
      } catch (err) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

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
    try {
      const body = {
        course_id: form.courseId,
        title: form.title,
        description: form.description,
        due_at: form.dueDate,
      };
      const url = isEditing ? `${API}/assignments/${id}` : `${API}/assignments`;
      // prefer Authorization Bearer token from centralized supabase client
      const token = await getAccessToken();

      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (user) {
        // Demo fallback: include x-user-id as email or id so server can canonicalize
        if (user.email) headers['x-user-id'] = String(user.email);
        else if (user.id) headers['x-user-id'] = String(user.id);
      }

      const res = await fetch(url, { method: isEditing ? 'PUT' : 'POST', headers, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || "Failed to save assignment");
        return;
      }
      navigate("/app/assignments");
    } catch (err) {
      alert("Failed to save assignment");
    }
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