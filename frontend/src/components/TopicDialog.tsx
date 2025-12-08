import { useState, useEffect } from 'react';
import type { Topic } from '../services/firestore';

interface TopicDialogProps {
  isOpen: boolean;
  topic?: Topic | null;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}

/**
 * Dialog for creating or editing a topic
 */
export function TopicDialog({ isOpen, topic, onClose, onSave }: TopicDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const isEdit = !!topic;

  useEffect(() => {
    if (topic) {
      setName(topic.name);
      setDescription(topic.description);
    } else {
      setName('');
      setDescription('');
    }
  }, [topic, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), description.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="topic-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{isEdit ? 'Edit Topic' : 'Create Topic'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="topic-name">Topic Name</label>
            <input
              id="topic-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter topic name"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="topic-description">Description (optional)</label>
            <textarea
              id="topic-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter topic description"
              rows={3}
            />
          </div>
          <div className="dialog-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="add-button"
              disabled={!name.trim()}
            >
              {isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
