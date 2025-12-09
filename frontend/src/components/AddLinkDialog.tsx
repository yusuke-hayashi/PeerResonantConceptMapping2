import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { LinkLabel } from '../services/firestore';

/**
 * Link label options with descriptions
 */
const LINK_LABELS: { value: LinkLabel; description: string }[] = [
  { value: '何が', description: '動作の主体' },
  { value: '何を', description: '動作の対象' },
  { value: '何に', description: '動作の相手・到達先' },
  { value: 'どこで', description: '場所' },
  { value: 'いつ', description: '時間' },
];

interface AddLinkDialogProps {
  isOpen: boolean;
  sourceLabel: string;
  targetLabel: string;
  onClose: () => void;
  onAdd: (label: LinkLabel, relationship: string) => void;
}

/**
 * Dialog for adding a new link between nodes
 */
export function AddLinkDialog({
  isOpen,
  sourceLabel,
  targetLabel,
  onClose,
  onAdd,
}: AddLinkDialogProps) {
  const { t } = useTranslation();
  const [selectedLabel, setSelectedLabel] = useState<LinkLabel>('何を');
  const [relationship, setRelationship] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onAdd(selectedLabel, relationship.trim());
    setSelectedLabel('何を');
    setRelationship('');
    onClose();
  };

  const handleClose = () => {
    setSelectedLabel('何を');
    setRelationship('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div
        className="add-link-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{t('editor.addLink')}</h3>
        <div className="link-preview">
          <span className="node-label source">{sourceLabel}</span>
          <span className="arrow">→</span>
          <span className="link-label-preview">{selectedLabel}</span>
          <span className="arrow">→</span>
          <span className="node-label target">{targetLabel}</span>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('editor.linkLabel')}</label>
            <div className="label-buttons">
              {LINK_LABELS.map(({ value, description }) => (
                <button
                  key={value}
                  type="button"
                  className={`label-button ${selectedLabel === value ? 'active' : ''}`}
                  onClick={() => setSelectedLabel(value)}
                  title={description}
                >
                  {value}
                  <span className="label-description">{description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="relationship">{t('editor.relationship')}</label>
            <input
              type="text"
              id="relationship"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder={t('editor.enterRelationship')}
            />
          </div>

          <div className="dialog-actions">
            <button type="button" className="cancel-button" onClick={handleClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="add-button">
              {t('editor.addLink')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
