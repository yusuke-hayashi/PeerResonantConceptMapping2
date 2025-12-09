import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { TopicDialog } from '../components/TopicDialog';
import {
  getTopics,
  createTopic,
  updateTopic,
  deleteTopic,
  getMapsByTopic,
  type Topic,
  type ConceptMap,
} from '../services/firestore';

/**
 * Topics management page
 */
export function TopicsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  // マップ一覧の展開状態とマップデータ
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [topicMaps, setTopicMaps] = useState<ConceptMap[]>([]);
  const [loadingMaps, setLoadingMaps] = useState(false);

  const isTeacher = user?.role === 'teacher';

  const loadTopics = useCallback(async () => {
    try {
      setLoading(true);
      const loadedTopics = await getTopics();
      setTopics(loadedTopics);
    } catch (err) {
      console.error('Failed to load topics:', err);
      setError(t('errors.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const handleCreateTopic = () => {
    setEditingTopic(null);
    setDialogOpen(true);
  };

  const handleEditTopic = (topic: Topic) => {
    setEditingTopic(topic);
    setDialogOpen(true);
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm(t('topics.deleteConfirm'))) {
      return;
    }

    try {
      await deleteTopic(topicId);
      setTopics((prev) => prev.filter((tp) => tp.id !== topicId));
    } catch (err) {
      console.error('Failed to delete topic:', err);
      setError(t('errors.failedToDelete'));
    }
  };

  const handleSaveTopic = async (name: string, description: string) => {
    if (!user) return;

    try {
      if (editingTopic) {
        await updateTopic(editingTopic.id, { name, description });
        setTopics((prev) =>
          prev.map((tp) =>
            tp.id === editingTopic.id
              ? { ...tp, name, description, updatedAt: new Date() }
              : tp
          )
        );
      } else {
        const newTopicId = await createTopic(user.id, name, description);
        const newTopic: Topic = {
          id: newTopicId,
          name,
          description,
          createdBy: user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setTopics((prev) => [newTopic, ...prev]);
      }
    } catch (err) {
      console.error('Failed to save topic:', err);
      setError(t('errors.failedToSave'));
    }
  };

  const handleSelectTopic = (topicId: string) => {
    navigate(`/maps?topicId=${topicId}`);
  };

  // マップ一覧の展開/折りたたみを切り替え
  const handleToggleMaps = async (topicId: string) => {
    if (expandedTopicId === topicId) {
      // 閉じる
      setExpandedTopicId(null);
      setTopicMaps([]);
    } else {
      // 開く
      setExpandedTopicId(topicId);
      setLoadingMaps(true);
      try {
        const maps = await getMapsByTopic(topicId);
        setTopicMaps(maps);
      } catch (err) {
        console.error('Failed to load maps for topic:', err);
        setTopicMaps([]);
      } finally {
        setLoadingMaps(false);
      }
    }
  };

  // マップを見本マップと学生マップに分類
  const categorizedMaps = topicMaps.reduce(
    (acc, map) => {
      if (map.isReference) {
        acc.reference.push(map);
      } else {
        acc.student.push(map);
      }
      return acc;
    },
    { reference: [] as ConceptMap[], student: [] as ConceptMap[] }
  );

  if (loading) {
    return (
      <div className="topics-page">
        <p>{t('topics.loadingTopics')}</p>
      </div>
    );
  }

  return (
    <div className="topics-page">
      <div className="topics-header">
        <h2>{t('topics.title')}</h2>
        {isTeacher && (
          <button className="create-button" onClick={handleCreateTopic}>
            + {t('topics.newTopic')}
          </button>
        )}
      </div>

      {error && <p className="error-message">{error}</p>}

      {topics.length === 0 ? (
        <div className="empty-state">
          <p>{t('topics.noTopics')}</p>
          {isTeacher && <p>{t('topics.createFirstTopicHint')}</p>}
        </div>
      ) : (
        <div className="topics-grid">
          {topics.map((topic) => (
            <div key={topic.id} className="topic-card">
              <div
                className="topic-card-content"
                onClick={() => handleSelectTopic(topic.id)}
              >
                <h3>{topic.name}</h3>
                {topic.description && (
                  <p className="topic-description">{topic.description}</p>
                )}
                <p className="topic-date">
                  {topic.createdAt.toLocaleDateString()}
                </p>
              </div>
              {isTeacher && (
                <div className="topic-actions">
                  <button
                    className="secondary-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMaps(topic.id);
                    }}
                  >
                    {expandedTopicId === topic.id
                      ? t('topics.hideMaps')
                      : t('topics.showMaps')}
                  </button>
                  <button
                    className="edit-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTopic(topic);
                    }}
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTopic(topic.id);
                    }}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              )}
              {/* マップ一覧 */}
              {expandedTopicId === topic.id && (
                <div className="topic-maps-section">
                  {loadingMaps ? (
                    <p className="loading-text">{t('topics.loadingMaps')}</p>
                  ) : (
                    <>
                      {/* 見本マップ */}
                      <div className="maps-category">
                        <h4>{t('topics.referenceMap')}</h4>
                        {categorizedMaps.reference.length > 0 ? (
                          <ul className="maps-list">
                            {categorizedMaps.reference.map((map) => (
                              <li key={map.id}>
                                <Link to={`/maps/${map.id}?from=topics`}>
                                  {map.title || t('maps.untitledMap')}
                                </Link>
                                <span className="map-meta">
                                  ({map.nodes.length} {t('maps.nodes')}, {map.links.length} {t('maps.links')})
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="no-maps-text">{t('topics.noReferenceMap')}</p>
                        )}
                      </div>
                      {/* 学生マップ */}
                      <div className="maps-category">
                        <h4>{t('topics.studentMaps')}</h4>
                        {categorizedMaps.student.length > 0 ? (
                          <ul className="maps-list">
                            {categorizedMaps.student.map((map) => (
                              <li key={map.id}>
                                <Link to={`/maps/${map.id}?from=topics`}>
                                  {map.title || t('maps.untitledMap')}
                                </Link>
                                <span className="map-meta">
                                  ({map.nodes.length} {t('maps.nodes')}, {map.links.length} {t('maps.links')})
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="no-maps-text">{t('topics.noStudentMaps')}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <TopicDialog
        isOpen={dialogOpen}
        topic={editingTopic}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveTopic}
      />
    </div>
  );
}
