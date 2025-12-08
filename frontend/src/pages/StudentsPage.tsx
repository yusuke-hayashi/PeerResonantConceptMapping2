import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getStudentsByTeacher,
  getUnassignedStudents,
  assignStudentToTeacher,
  removeStudentFromTeacher,
  type User,
} from '../services/firestore';

/**
 * Students management page (for teachers only)
 */
export function StudentsPage() {
  const { user } = useAuth();
  const [myStudents, setMyStudents] = useState<User[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isTeacher = user?.role === 'teacher';

  const loadStudents = useCallback(async () => {
    if (!user || !isTeacher) return;

    try {
      setLoading(true);
      setError(null);
      const [assigned, unassigned] = await Promise.all([
        getStudentsByTeacher(user.id),
        getUnassignedStudents(),
      ]);
      setMyStudents(assigned);
      setUnassignedStudents(unassigned);
    } catch (err) {
      console.error('Failed to load students:', err);
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [user, isTeacher]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleAddStudent = async (studentId: string) => {
    if (!user) return;

    try {
      await assignStudentToTeacher(studentId, user.id);
      // Update local state
      const student = unassignedStudents.find(s => s.id === studentId);
      if (student) {
        setUnassignedStudents(prev => prev.filter(s => s.id !== studentId));
        setMyStudents(prev => [...prev, { ...student, teacherId: user.id }]);
      }
    } catch (err) {
      console.error('Failed to add student:', err);
      setError('Failed to add student');
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to remove this student from your class?')) {
      return;
    }

    try {
      await removeStudentFromTeacher(studentId);
      // Update local state
      const student = myStudents.find(s => s.id === studentId);
      if (student) {
        setMyStudents(prev => prev.filter(s => s.id !== studentId));
        setUnassignedStudents(prev => [...prev, { ...student, teacherId: undefined }]);
      }
    } catch (err) {
      console.error('Failed to remove student:', err);
      setError('Failed to remove student');
    }
  };

  if (!isTeacher) {
    return (
      <div className="students-page">
        <p className="error-message">Only teachers can access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="students-page">
        <p>Loading students...</p>
      </div>
    );
  }

  return (
    <div className="students-page">
      <div className="students-header">
        <h2>My Students</h2>
      </div>

      {error && <p className="error-message">{error}</p>}

      <section className="students-section">
        <h3>Current Students ({myStudents.length})</h3>
        {myStudents.length === 0 ? (
          <div className="empty-state">
            <p>No students assigned yet.</p>
            <p>Add students from the list below.</p>
          </div>
        ) : (
          <div className="students-grid">
            {myStudents.map((student) => (
              <div key={student.id} className="student-card">
                <div className="student-info">
                  <h4>{student.displayName}</h4>
                  <p className="student-email">{student.email}</p>
                  <p className="student-date">
                    Joined: {student.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <div className="student-actions">
                  <button
                    className="remove-button"
                    onClick={() => handleRemoveStudent(student.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="students-section">
        <h3>Available Students ({unassignedStudents.length})</h3>
        {unassignedStudents.length === 0 ? (
          <div className="empty-state">
            <p>No unassigned students available.</p>
          </div>
        ) : (
          <div className="students-grid">
            {unassignedStudents.map((student) => (
              <div key={student.id} className="student-card unassigned">
                <div className="student-info">
                  <h4>{student.displayName}</h4>
                  <p className="student-email">{student.email}</p>
                  <p className="student-date">
                    Joined: {student.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <div className="student-actions">
                  <button
                    className="add-student-button"
                    onClick={() => handleAddStudent(student.id)}
                  >
                    Add to My Class
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
