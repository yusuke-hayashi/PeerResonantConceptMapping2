import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
      setError('Failed to load topics');
    } finally {
      setLoading(false);
    }
  }, []);

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
    if (!confirm('Are you sure you want to delete this topic?')) {
      return;
    }

    try {
      await deleteTopic(topicId);
      setTopics((prev) => prev.filter((t) => t.id !== topicId));
    } catch (err) {
      console.error('Failed to delete topic:', err);
      setError('Failed to delete topic');
    }
  };

  const handleSaveTopic = async (name: string, description: string) => {
    if (!user) return;

    try {
      if (editingTopic) {
        await updateTopic(editingTopic.id, { name, description });
        setTopics((prev) =>
          prev.map((t) =>
            t.id === editingTopic.id
              ? { ...t, name, description, updatedAt: new Date() }
              : t
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
      setError('Failed to save topic');
    }
  };

  const handleSelectTopic = (topicId: string) => {
    navigate(`/maps?topicId=${topicId}`);
  };

  if (loading) {
    return (
      <div className="topics-page">
        <p>Loading topics...</p>
      </div>
    );
  }

  return (
    <div className="topics-page">
      <div className="topics-header">
        <h2>Topics</h2>
        {isTeacher && (
          <button className="create-button" onClick={handleCreateTopic}>
            + New Topic
          </button>
        )}
      </div>

      {error && <p className="error-message">{error}</p>}

      {topics.length === 0 ? (
        <div className="empty-state">
          <p>No topics yet.</p>
          {isTeacher && <p>Click "New Topic" to create one.</p>}
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
                  Created: {topic.createdAt.toLocaleDateString()}
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
                    Edit
                  </button>
                  <button
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTopic(topic.id);
                    }}
                  >
                    Delete
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
