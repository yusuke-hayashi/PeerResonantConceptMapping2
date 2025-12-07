import { useCallback, useState, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeTypes,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ConceptNode, type ConceptNodeData } from './ConceptNode';
import { AddNodeDialog } from './AddNodeDialog';
import type { MapNode, MapLink } from '../services/firestore';

/**
 * Convert internal nodes to Firestore format
 */
function toMapNodes(nodes: Node[]): MapNode[] {
  return nodes.map((node) => {
    const data = node.data as unknown as ConceptNodeData;
    return {
      id: node.id,
      label: data.label,
      type: data.nodeType,
      position: { x: node.position.x, y: node.position.y },
      style: {
        shape: data.nodeType === 'noun' ? 'rectangle' : 'rounded-rectangle',
        color: data.color,
        borderRadius: data.nodeType === 'noun' ? 0 : 12,
      },
    };
  }) as MapNode[];
}

/**
 * Convert internal edges to Firestore format
 */
function toMapLinks(edges: Edge[]): MapLink[] {
  return edges.map((edge) => ({
    id: edge.id,
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
    relationship: (edge.label as string) || '',
  }));
}

/**
 * Convert Firestore nodes to ReactFlow format
 */
function fromMapNodes(mapNodes: MapNode[]): Node[] {
  return mapNodes.map((node) => ({
    id: node.id,
    type: 'conceptNode',
    position: { x: node.position.x, y: node.position.y },
    data: {
      label: node.label,
      nodeType: node.type,
      color: node.style.color,
    },
  }));
}

/**
 * Convert Firestore links to ReactFlow format
 */
function fromMapLinks(mapLinks: MapLink[]): Edge[] {
  return mapLinks.map((link) => ({
    id: link.id,
    source: link.sourceNodeId,
    target: link.targetNodeId,
    label: link.relationship,
    type: 'default',
    style: { stroke: '#6B7280', strokeWidth: 2 },
    labelStyle: { fill: '#333', fontWeight: 500 },
    labelBgStyle: { fill: '#fff', fillOpacity: 0.8 },
  }));
}

const nodeTypes: NodeTypes = {
  conceptNode: ConceptNode,
};

interface ConceptMapEditorProps {
  initialNodes?: MapNode[];
  initialLinks?: MapLink[];
  onChange?: (nodes: MapNode[], links: MapLink[]) => void;
  readOnly?: boolean;
}

/**
 * Concept map editor component using ReactFlow
 */
export function ConceptMapEditor({
  initialNodes = [],
  initialLinks = [],
  onChange,
  readOnly = false,
}: ConceptMapEditorProps) {
  const [nodes, setNodes] = useState<Node[]>(() => fromMapNodes(initialNodes));
  const [edges, setEdges] = useState<Edge[]>(() => fromMapLinks(initialLinks));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPosition, setDialogPosition] = useState({ x: 0, y: 0 });
  const pendingPositionRef = useRef<{ x: number; y: number } | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const notifyChange = useCallback(
    (newNodes: Node[], newEdges: Edge[]) => {
      if (onChange) {
        onChange(toMapNodes(newNodes), toMapLinks(newEdges));
      }
    },
    [onChange]
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const newNodes = applyNodeChanges(changes, nds);
        notifyChange(newNodes, edges);
        return newNodes;
      });
    },
    [edges, notifyChange]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => {
        const newEdges = applyEdgeChanges(changes, eds);
        notifyChange(nodes, newEdges);
        return newEdges;
      });
    },
    [nodes, notifyChange]
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (readOnly) return;

      const relationship = prompt('Enter relationship:');
      if (relationship !== null) {
        const newEdge: Edge = {
          id: `e${connection.source}-${connection.target}-${Date.now()}`,
          source: connection.source!,
          target: connection.target!,
          label: relationship,
          type: 'default',
          style: { stroke: '#6B7280', strokeWidth: 2 },
          labelStyle: { fill: '#333', fontWeight: 500 },
          labelBgStyle: { fill: '#fff', fillOpacity: 0.8 },
        };
        setEdges((eds) => {
          const newEdges = addEdge(newEdge, eds);
          notifyChange(nodes, newEdges);
          return newEdges;
        });
      }
    },
    [readOnly, nodes, notifyChange]
  );

  const onDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      if (readOnly) return;

      const wrapper = reactFlowWrapper.current;
      if (!wrapper) return;

      const bounds = wrapper.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;

      pendingPositionRef.current = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      setDialogPosition({ x, y });
      setDialogOpen(true);
    },
    [readOnly]
  );

  const handleAddNode = useCallback(
    (label: string, nodeType: 'noun' | 'verb', color: string) => {
      if (!pendingPositionRef.current) return;

      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: 'conceptNode',
        position: pendingPositionRef.current,
        data: {
          label,
          nodeType,
          color,
        },
      };

      setNodes((nds) => {
        const newNodes = [...nds, newNode];
        notifyChange(newNodes, edges);
        return newNodes;
      });

      pendingPositionRef.current = null;
    },
    [edges, notifyChange]
  );

  return (
    <div ref={reactFlowWrapper} className="concept-map-editor" style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        onDoubleClick={onDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={readOnly ? null : 'Delete'}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      </ReactFlow>

      <AddNodeDialog
        isOpen={dialogOpen}
        position={dialogPosition}
        onClose={() => setDialogOpen(false)}
        onAdd={handleAddNode}
      />

      {!readOnly && (
        <div className="editor-hint">
          Double-click to add a node. Drag from one node to another to create a link.
        </div>
      )}
    </div>
  );
}
