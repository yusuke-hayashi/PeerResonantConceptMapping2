import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        <h3>{isEdit ? t('topics.editTopic') : t('topics.createTopic')}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="topic-name">{t('topics.topicName')}</label>
            <input
              id="topic-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('topics.enterTopicName')}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="topic-description">{t('topics.topicDescription')} ({t('common.optional')})</label>
            <textarea
              id="topic-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('topics.enterTopicDescription')}
              rows={3}
            />
          </div>
          <div className="dialog-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="add-button"
              disabled={!name.trim()}
            >
              {isEdit ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
