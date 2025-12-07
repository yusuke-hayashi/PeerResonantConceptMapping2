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
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555' }}
      />
      <div>{nodeData.label}</div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555' }}
      />
    </div>
  );
}

export const ConceptNode = memo(ConceptNodeComponent);
