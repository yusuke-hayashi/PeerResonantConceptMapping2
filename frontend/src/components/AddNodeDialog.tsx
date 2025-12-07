import { useState, type FormEvent } from 'react';

/**
 * Color palettes for node types
 */
const NOUN_COLORS = [
  '#3B82F6', // blue-500
  '#2563EB', // blue-600
  '#10B981', // emerald-500
  '#8B5CF6', // violet-500
];

const VERB_COLORS = [
  '#EF4444', // red-500
  '#F97316', // orange-500
  '#F59E0B', // amber-500
  '#DC2626', // red-600
];

interface AddNodeDialogProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onAdd: (label: string, nodeType: 'noun' | 'verb', color: string) => void;
}

/**
 * Dialog for adding a new node
 */
export function AddNodeDialog({ isOpen, position, onClose, onAdd }: AddNodeDialogProps) {
  const [label, setLabel] = useState('');
  const [nodeType, setNodeType] = useState<'noun' | 'verb'>('noun');
  const [selectedColor, setSelectedColor] = useState(NOUN_COLORS[0]);

  const colors = nodeType === 'noun' ? NOUN_COLORS : VERB_COLORS;

  const handleTypeChange = (type: 'noun' | 'verb') => {
    setNodeType(type);
    setSelectedColor(type === 'noun' ? NOUN_COLORS[0] : VERB_COLORS[0]);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (label.trim()) {
      onAdd(label.trim(), nodeType, selectedColor);
      setLabel('');
      setNodeType('noun');
      setSelectedColor(NOUN_COLORS[0]);
      onClose();
    }
  };

  const handleClose = () => {
    setLabel('');
    setNodeType('noun');
    setSelectedColor(NOUN_COLORS[0]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div
        className="add-node-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <h3>Add Node</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nodeLabel">Label</label>
            <input
              type="text"
              id="nodeLabel"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter label"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Type</label>
            <div className="type-buttons">
              <button
                type="button"
                className={`type-button ${nodeType === 'noun' ? 'active noun' : ''}`}
                onClick={() => handleTypeChange('noun')}
              >
                Noun
              </button>
              <button
                type="button"
                className={`type-button ${nodeType === 'verb' ? 'active verb' : ''}`}
                onClick={() => handleTypeChange('verb')}
              >
                Verb
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Color</label>
            <div className="color-palette">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-button ${selectedColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>

          <div className="dialog-actions">
            <button type="button" className="cancel-button" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="add-button" disabled={!label.trim()}>
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
