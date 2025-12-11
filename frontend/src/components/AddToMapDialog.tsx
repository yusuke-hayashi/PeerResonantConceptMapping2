import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MapNode, MapLink } from '../services/firestore';

interface AddNodeDialogProps {
  type: 'node';
  node: MapNode;
  targetMapTitle: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

interface AddLinkDialogProps {
  type: 'link';
  link: MapLink;
  sourceNode: MapNode;
  targetNode: MapNode;
  targetMapTitle: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

type AddToMapDialogProps = AddNodeDialogProps | AddLinkDialogProps;

/**
 * Dialog for confirming addition of nodes or links to a map
 */
export function AddToMapDialog(props: AddToMapDialogProps) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    try {
      setIsAdding(true);
      setError(null);
      await props.onConfirm();
    } catch (err) {
      console.error('Failed to add to map:', err);
      setError(err instanceof Error ? err.message : t('errors.failedToCreate'));
      setIsAdding(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={props.onCancel}>
      <div className="add-to-map-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{t('comparisons.addToMap')}</h3>

        {error && <div className="error-message">{error}</div>}

        <div className="dialog-content">
          {props.type === 'node' ? (
            <div className="add-item-preview">
              <p>{t('comparisons.addNodeConfirm')}</p>
              <div className="preview-item node-preview">
                <span className={`node-type ${props.node.type}`}>
                  {props.node.type === 'verb' ? t('editor.verb') : t('editor.noun')}
                </span>
                <span className="node-label">{props.node.label}</span>
              </div>
              <p className="target-info">
                {t('comparisons.addTo')}: <strong>{props.targetMapTitle}</strong>
              </p>
            </div>
          ) : (
            <div className="add-item-preview">
              <p>{t('comparisons.addLinkConfirm')}</p>
              <div className="preview-item link-preview">
                <span className={`node-label ${props.sourceNode.type}`}>
                  {props.sourceNode.label}
                </span>
                <span className="arrow">
                  {props.link.label && `(${props.link.label})`} {props.link.relationship} &rarr;
                </span>
                <span className={`node-label ${props.targetNode.type}`}>
                  {props.targetNode.label}
                </span>
              </div>
              <p className="target-info">
                {t('comparisons.addTo')}: <strong>{props.targetMapTitle}</strong>
              </p>
            </div>
          )}
        </div>

        <div className="dialog-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={props.onCancel}
            disabled={isAdding}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="add-button"
            onClick={handleConfirm}
            disabled={isAdding}
          >
            {isAdding ? t('common.adding') : t('common.add')}
          </button>
        </div>
      </div>
    </div>
  );
}
