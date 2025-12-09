import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

/**
 * Custom node data interface
 */
export interface ConceptNodeData extends Record<string, unknown> {
  label: string;
  nodeType: 'noun' | 'verb';
  color: string;
}

/**
 * Custom concept node component for React Flow
 */
function ConceptNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ConceptNodeData;
  const isNoun = nodeData.nodeType === 'noun';
  const borderRadius = isNoun ? 0 : 12;

  // ノードの中心に小さな透明ハンドルを配置（ドラッグを妨げない）
  const centerHandleStyle = {
    background: 'transparent',
    border: 'none',
    width: 10,
    height: 10,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none' as const,
  };

  // 選択時のスタイル
  const selectedStyle = selected
    ? {
        border: '3px solid #FFD700',
        boxShadow: '0 0 12px 4px rgba(255, 215, 0, 0.6)',
        transform: 'scale(1.05)',
      }
    : {
        border: '2px solid rgba(255,255,255,0.3)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      };

  return (
    <div
      className={`concept-node ${selected ? 'selected' : ''}`}
      style={{
        backgroundColor: nodeData.color,
        borderRadius: `${borderRadius}px`,
        padding: '10px 20px',
        minWidth: '80px',
        textAlign: 'center',
        color: '#fff',
        fontWeight: 500,
        fontSize: '14px',
        position: 'relative',
        transition: 'all 0.2s ease',
        ...selectedStyle,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={centerHandleStyle}
        isConnectable
      />
      <div>{nodeData.label}</div>
      <Handle
        type="source"
        position={Position.Right}
        style={centerHandleStyle}
        isConnectable
      />
    </div>
  );
}

export const ConceptNode = memo(ConceptNodeComponent);
