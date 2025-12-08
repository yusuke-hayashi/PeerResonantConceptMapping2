import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import {
  getComparisonPermissions,
  grantComparisonPermission,
  revokeComparisonPermission,
  getStudentsByTeacher,
  type ComparisonPermission,
  type User,
} from '../services/firestore';

interface PermissionManagerProps {
  comparisonId: string;
  onClose: () => void;
}

/**
 * Modal dialog for managing comparison permissions
 */
export function PermissionManager({ comparisonId, onClose }: PermissionManagerProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [permissions, setPermissions] = useState<ComparisonPermission[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        setLoading(true);
        const [loadedPermissions, loadedStudents] = await Promise.all([
          getComparisonPermissions(comparisonId),
          getStudentsByTeacher(user.id),
        ]);
        setPermissions(loadedPermissions);
        setStudents(loadedStudents);
      } catch (err) {
        console.error('Failed to load permission data:', err);
        setError(t('errors.failedToLoad'));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [comparisonId, user, t]);

  // Create a set of student IDs who have permission
  const grantedStudentIds = new Set(permissions.map((p) => p.studentId));

  const handleGrant = async (studentId: string) => {
    if (!user) return;

    try {
      setProcessingIds((prev) => new Set(prev).add(studentId));
      await grantComparisonPermission(comparisonId, studentId, user.id);
      setPermissions((prev) => [
        ...prev,
        {
          id: `${comparisonId}-${studentId}`,
          comparisonId,
          studentId,
          grantedBy: user.id,
          grantedAt: new Date(),
        },
      ]);
    } catch (err) {
      console.error('Failed to grant permission:', err);
      setError(t('errors.generic'));
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }
  };

  const handleRevoke = async (studentId: string) => {
    try {
      setProcessingIds((prev) => new Set(prev).add(studentId));
      await revokeComparisonPermission(comparisonId, studentId);
      setPermissions((prev) => prev.filter((p) => p.studentId !== studentId));
    } catch (err) {
      console.error('Failed to revoke permission:', err);
      setError(t('errors.generic'));
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="permission-manager-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{t('comparisons.managePermissions')}</h3>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <p>{t('common.loading')}</p>
        ) : students.length === 0 ? (
          <p>{t('students.noStudentsAssigned')}</p>
        ) : (
          <div className="students-permission-list">
            <p>{t('comparisons.selectStudentsToGrant')}</p>
            <ul className="permission-list">
              {students.map((student) => {
                const hasPermission = grantedStudentIds.has(student.id);
                const isProcessing = processingIds.has(student.id);

                return (
                  <li key={student.id} className="permission-item">
                    <span className="student-name">{student.displayName}</span>
                    <span className="permission-status">
                      {hasPermission ? (
                        <>
                          <span className="status-granted">
                            {t('comparisons.permissionGranted')}
                          </span>
                          <button
                            className="revoke-button"
                            onClick={() => handleRevoke(student.id)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? '...' : t('comparisons.revokePermission')}
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="status-not-granted">
                            {t('comparisons.permissionRevoked')}
                          </span>
                          <button
                            className="grant-button"
                            onClick={() => handleGrant(student.id)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? '...' : t('comparisons.grantPermission')}
                          </button>
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="dialog-actions">
          <button type="button" className="cancel-button" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
