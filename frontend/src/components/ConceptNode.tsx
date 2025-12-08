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
function ConceptNodeComponent({ data }: NodeProps) {
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

  return (
    <div
      className="concept-node"
      style={{
        backgroundColor: nodeData.color,
        borderRadius: `${borderRadius}px`,
        padding: '10px 20px',
        minWidth: '80px',
        textAlign: 'center',
        color: '#fff',
        fontWeight: 500,
        fontSize: '14px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        border: '2px solid rgba(255,255,255,0.3)',
        position: 'relative',
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
