import { useState, useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { LinkLabel, NodeType } from '../services/firestore';

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
  sourceType: NodeType;
  targetType: NodeType;
  onClose: () => void;
  onAdd: (label: LinkLabel, relationship: string, swapped: boolean) => void;
}

/**
 * Dialog for adding a new link between nodes
 */
export function AddLinkDialog({
  isOpen,
  sourceLabel,
  targetLabel,
  sourceType,
  targetType,
  onClose,
  onAdd,
}: AddLinkDialogProps) {
  const { t } = useTranslation();
  const [selectedLabel, setSelectedLabel] = useState<LinkLabel>('何を');
  const [relationship, setRelationship] = useState('');
  const [swapped, setSwapped] = useState(false);

  // 現在の方向でのノード情報
  const currentSource = swapped ? { label: targetLabel, type: targetType } : { label: sourceLabel, type: sourceType };
  const currentTarget = swapped ? { label: sourceLabel, type: sourceType } : { label: targetLabel, type: targetType };

  // バリデーション: 動詞→名詞のみ許可
  const isValidDirection = currentSource.type === 'verb' && currentTarget.type === 'noun';
  const isBothNouns = currentSource.type === 'noun' && currentTarget.type === 'noun';
  const isBothVerbs = currentSource.type === 'verb' && currentTarget.type === 'verb';

  // ダイアログが開かれたときに状態をリセット
  useEffect(() => {
    if (isOpen) {
      setSwapped(false);
      setSelectedLabel('何を');
      setRelationship('');
    }
  }, [isOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidDirection) return;
    onAdd(selectedLabel, relationship.trim(), swapped);
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  const handleSwap = () => {
    setSwapped(!swapped);
  };

  // エラーメッセージの取得
  const getErrorMessage = () => {
    if (isBothNouns) return t('editor.invalidLinkBothNouns');
    if (isBothVerbs) return t('editor.invalidLinkBothVerbs');
    if (!isValidDirection) return t('editor.invalidLinkDirection');
    return null;
  };

  if (!isOpen) return null;

  const errorMessage = getErrorMessage();
  const canSwap = !isBothNouns && !isBothVerbs;

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div
        className="add-link-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{t('editor.addLink')}</h3>
        <div className="link-preview">
          <span className={`node-label source ${currentSource.type}`}>
            {currentSource.label}
            <span className="node-type-badge">{currentSource.type === 'verb' ? t('editor.verb') : t('editor.noun')}</span>
          </span>
          <span className="arrow">→</span>
          <span className="link-label-preview">{selectedLabel}</span>
          <span className="arrow">→</span>
          <span className={`node-label target ${currentTarget.type}`}>
            {currentTarget.label}
            <span className="node-type-badge">{currentTarget.type === 'verb' ? t('editor.verb') : t('editor.noun')}</span>
          </span>
        </div>

        {canSwap && (
          <button type="button" className="swap-button" onClick={handleSwap}>
            ↔ {t('editor.swapDirection')}
          </button>
        )}

        {errorMessage && (
          <div className="link-error-message">
            {errorMessage}
          </div>
        )}
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
            <button type="submit" className="add-button" disabled={!isValidDirection}>
              {t('editor.addLink')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
