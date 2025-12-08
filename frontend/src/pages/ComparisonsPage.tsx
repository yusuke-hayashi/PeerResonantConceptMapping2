import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { CreateComparisonDialog } from '../components/CreateComparisonDialog';
import {
  getComparisons,
  deleteComparison,
  getTopics,
  type Comparison,
  type Topic,
} from '../services/firestore';

/**
 * Comparisons list page (teacher only)
 */
export function ComparisonsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        setLoading(true);
        const [userComparisons, allTopics] = await Promise.all([
          getComparisons(user.id),
          getTopics(),
        ]);
        setComparisons(userComparisons);
        setTopics(allTopics);
      } catch (err) {
        console.error('Failed to load comparisons:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load comparisons';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const handleDelete = async (comparisonId: string) => {
    if (!confirm(t('comparisons.deleteConfirm'))) return;

    try {
      await deleteComparison(comparisonId);
      setComparisons((prev) => prev.filter((c) => c.id !== comparisonId));
    } catch (err) {
      console.error('Failed to delete comparison:', err);
      setError(t('errors.failedToDelete'));
    }
  };

  const handleComparisonCreated = (comparison: Comparison) => {
    setComparisons((prev) => [comparison, ...prev]);
    setCreateDialogOpen(false);
  };

  // トピックID -> トピック名のマッピング
  const topicNameMap = new Map(topics.map((t) => [t.id, t.name]));

  // 比較モードの表示名を取得
  const getModeLabel = (mode: Comparison['mode']): string => {
    const modeLabels: Record<Comparison['mode'], string> = {
      one_to_one: t('comparisons.oneToOne'),
      teacher_to_all: t('comparisons.teacherToAll'),
      all_students: t('comparisons.allStudents'),
      partial_students: t('comparisons.partialStudents'),
    };
    return modeLabels[mode];
  };

  if (user?.role !== 'teacher') {
    return (
      <div className="comparisons-page">
        <p>{t('students.teacherOnly')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="comparisons-page">
        <p>{t('comparisons.loadingComparisons')}</p>
      </div>
    );
  }

  return (
    <div className="comparisons-page">
      <div className="comparisons-header">
        <h2>{t('comparisons.title')}</h2>
        <button className="create-button" onClick={() => setCreateDialogOpen(true)}>
          + {t('comparisons.newComparison')}
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      {comparisons.length === 0 ? (
        <div className="empty-state">
          <p>{t('comparisons.noComparisons')}</p>
          <p>{t('comparisons.createFirstComparisonHint')}</p>
        </div>
      ) : (
        <div className="comparisons-grid">
          {comparisons.map((comparison) => (
            <div key={comparison.id} className="comparison-card">
              <Link to={`/comparisons/${comparison.id}`} className="comparison-card-link">
                <h3>{topicNameMap.get(comparison.topicId) || 'Unknown Topic'}</h3>
                <p className="comparison-mode">{getModeLabel(comparison.mode)}</p>
                <p className="comparison-meta">
                  {comparison.mapIds.length} {t('nav.maps')}
                </p>
                <p className="comparison-date">
                  {comparison.createdAt.toLocaleDateString()}
                </p>
              </Link>
              <button
                className="delete-button"
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete(comparison.id);
                }}
              >
                {t('common.delete')}
              </button>
            </div>
          ))}
        </div>
      )}

      <CreateComparisonDialog
        isOpen={createDialogOpen}
        topics={topics}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={handleComparisonCreated}
      />
    </div>
  );
}
