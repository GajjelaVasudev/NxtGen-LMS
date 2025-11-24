import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function Gradeass() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, { grade: string; feedback: string }>>({});

  const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/instructor/submissions`, { headers: { 'x-user-id': user?.id || '' } });
        const json = await res.json();
        if (!mounted) return;
        if (json.success) {
          setSubmissions(json.submissions || []);
        } else {
          setSubmissions([]);
        }
      } catch (err) {
        setSubmissions([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  const handleEdit = (s: any) => {
    setEditing(prev => ({ ...prev, [s.submissionId]: { grade: s.grade?.toString() || '', feedback: s.feedback || '' } }));
  };

  const saveGrade = async (submissionId: string) => {
    const payload = editing[submissionId];
    if (!payload) return;
    const grade = parseInt(payload.grade);
    if (isNaN(grade) || grade < 0 || grade > 100) {
      alert('Please enter a valid grade (0-100)');
      return;
    }
    try {
      const res = await fetch(`${API}/submissions/${submissionId}/grade`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ submissionId, grade, feedback: payload.feedback })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to grade');

      // update UI
      setSubmissions(prev => prev.map(s => s.submissionId === submissionId ? { ...s, grade, feedback: payload.feedback } : s));
      setEditing(prev => { const copy = { ...prev }; delete copy[submissionId]; return copy; });

      // notify student via inbox
      try {
        await fetch(`${API}/inbox/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
          body: JSON.stringify({
            fromUserId: user?.id || '',
            fromName: user?.name || user?.email || 'Instructor',
            toUserId: (json.data && json.data.user_id) || undefined,
            subject: 'Assignment Graded',
            content: `Your assignment "${json.data && json.data.assignment_title ? json.data.assignment_title : ''}" has been graded: ${grade}/100. ${payload.feedback || ''}`
          })
        });
      } catch (e) {
        // ignore notify errors
      }
    } catch (err) {
      alert('Failed to save grade');
    }
  };

  return (
    <main className="flex-1 p-6 overflow-y-auto bg-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-nxtgen-text-primary mb-6">Grade Assignments</h1>

        {loading ? (
          <div className="text-center py-12">Loading submissions...</div>
        ) : submissions.length === 0 ? (
          <div className="text-center text-gray-500 py-12">No submissions found</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {submissions.map(s => (
              <div key={s.submissionId} className="p-4 border rounded bg-white flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold">{s.studentName}</div>
                  <div className="text-sm text-gray-600">{s.studentEmail}</div>
                  <div className="text-sm text-gray-800 mt-2">{s.assignmentTitle}</div>
                  <div className="text-xs text-gray-500">Submitted: {new Date(s.submitted_at).toLocaleString()}</div>
                </div>

                <div className="mt-3 md:mt-0 flex flex-col md:items-end gap-2">
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} max={100} placeholder="Grade" value={editing[s.submissionId]?.grade || ''} onChange={(e) => setEditing(prev => ({ ...prev, [s.submissionId]: { ...(prev[s.submissionId] || {}), grade: e.target.value } }))} className="w-24 border rounded p-1" />
                    <input type="text" placeholder="Feedback" value={editing[s.submissionId]?.feedback || ''} onChange={(e) => setEditing(prev => ({ ...prev, [s.submissionId]: { ...(prev[s.submissionId] || {}), feedback: e.target.value } }))} className="border rounded p-1" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(s)} className="px-3 py-1 border rounded">Edit</button>
                    <button onClick={() => saveGrade(s.submissionId)} className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
