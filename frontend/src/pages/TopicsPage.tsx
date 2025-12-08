import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { TopicDialog } from '../components/TopicDialog';
import {
  getTopics,
  createTopic,
  updateTopic,
  deleteTopic,
  type Topic,
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
