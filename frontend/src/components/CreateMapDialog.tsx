import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Topic } from '../services/firestore';

interface CreateMapDialogProps {
  isOpen: boolean;
  topics: Topic[];
  defaultTopicId?: string;
  onClose: () => void;
  onCreate: (topicId: string, title: string) => void;
}

/**
 * Dialog for creating a new concept map with topic selection
 */
export function CreateMapDialog({
  isOpen,
  topics,
  defaultTopicId,
  onClose,
  onCreate,
}: CreateMapDialogProps) {
  const { t } = useTranslation();
  const [selectedTopicId, setSelectedTopicId] = useState(defaultTopicId || '');
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTopicId) {
      onCreate(selectedTopicId, title.trim() || t('maps.untitledMap'));
      setTitle('');
      setSelectedTopicId(defaultTopicId || '');
    }
  };

  const handleClose = () => {
    setTitle('');
    setSelectedTopicId(defaultTopicId || '');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div
        className="create-map-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{t('maps.createMap')}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="map-topic">{t('maps.selectTopic')} ({t('common.required')})</label>
            <select
              id="map-topic"
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              required
            >
              <option value="">{t('maps.selectTopic')}...</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="map-title">{t('maps.mapTitle')} ({t('common.optional')})</label>
            <input
              id="map-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('maps.enterMapTitle')}
            />
          </div>
          <div className="dialog-actions">
            <button type="button" className="cancel-button" onClick={handleClose}>
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="add-button"
              disabled={!selectedTopicId}
            >
              {t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
