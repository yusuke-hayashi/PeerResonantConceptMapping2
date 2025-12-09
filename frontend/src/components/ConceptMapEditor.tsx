import { useCallback, useState, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  SelectionMode,
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
import { AddLinkDialog } from './AddLinkDialog';
import type { MapNode, MapLink, LinkLabel } from '../services/firestore';

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
    label: (edge.data?.linkLabel as MapLink['label']) || '何を',
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
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<{
    source: string;
    target: string;
    sourceLabel: string;
    targetLabel: string;
    sourceType: 'noun' | 'verb';
    targetType: 'noun' | 'verb';
  } | null>(null);

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

      const sourceNode = nodes.find(n => n.id === connection.source);
      const targetNode = nodes.find(n => n.id === connection.target);
      const sourceData = sourceNode?.data as ConceptNodeData | undefined;
      const targetData = targetNode?.data as ConceptNodeData | undefined;

      setPendingConnection({
        source: connection.source!,
        target: connection.target!,
        sourceLabel: sourceData?.label || '',
        targetLabel: targetData?.label || '',
        sourceType: sourceData?.nodeType || 'noun',
        targetType: targetData?.nodeType || 'noun',
      });
      setLinkDialogOpen(true);
    },
    [readOnly, nodes]
  );

  const handleAddLink = useCallback(
    (label: LinkLabel, relationship: string, swapped: boolean) => {
      if (!pendingConnection) return;

      // swappedがtrueの場合、source/targetを入れ替える
      const actualSource = swapped ? pendingConnection.target : pendingConnection.source;
      const actualTarget = swapped ? pendingConnection.source : pendingConnection.target;

      const newEdge: Edge = {
        id: `e${actualSource}-${actualTarget}-${Date.now()}`,
        source: actualSource,
        target: actualTarget,
        label: relationship || label,
        data: { linkLabel: label },
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
      setPendingConnection(null);
    },
    [pendingConnection, nodes, notifyChange]
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
      const position = pendingPositionRef.current || { x: 200, y: 200 };

      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: 'conceptNode',
        position,
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

  const handleAddNodeButton = useCallback(() => {
    // Calculate center position based on existing nodes or default
    const wrapper = reactFlowWrapper.current;
    if (wrapper) {
      const bounds = wrapper.getBoundingClientRect();
      pendingPositionRef.current = { x: bounds.width / 2, y: bounds.height / 2 };
      setDialogPosition({ x: bounds.width / 2, y: bounds.height / 2 });
    } else {
      pendingPositionRef.current = { x: 200, y: 200 };
      setDialogPosition({ x: 200, y: 200 });
    }
    setDialogOpen(true);
  }, []);

  const handleSelectionChange = useCallback(({ nodes: selectedNodesList }: { nodes: Node[] }) => {
    setSelectedNodes(selectedNodesList.map(n => n.id));
  }, []);

  const handleAddLinkButton = useCallback(() => {
    if (selectedNodes.length !== 2) {
      alert('Please select exactly 2 nodes to create a link');
      return;
    }

    const sourceNode = nodes.find(n => n.id === selectedNodes[0]);
    const targetNode = nodes.find(n => n.id === selectedNodes[1]);
    const sourceData = sourceNode?.data as ConceptNodeData | undefined;
    const targetData = targetNode?.data as ConceptNodeData | undefined;

    setPendingConnection({
      source: selectedNodes[0],
      target: selectedNodes[1],
      sourceLabel: sourceData?.label || '',
      targetLabel: targetData?.label || '',
      sourceType: sourceData?.nodeType || 'noun',
      targetType: targetData?.nodeType || 'noun',
    });
    setLinkDialogOpen(true);
  }, [selectedNodes, nodes]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedNodes.length === 0) {
      alert('Please select nodes to delete');
      return;
    }

    setNodes((nds) => {
      const newNodes = nds.filter(n => !selectedNodes.includes(n.id));
      // Also remove edges connected to deleted nodes
      setEdges((eds) => {
        const newEdges = eds.filter(e =>
          !selectedNodes.includes(e.source) && !selectedNodes.includes(e.target)
        );
        notifyChange(newNodes, newEdges);
        return newEdges;
      });
      return newNodes;
    });
    setSelectedNodes([]);
  }, [selectedNodes, notifyChange]);

  return (
    <div ref={reactFlowWrapper} className="concept-map-editor" style={{ width: '100%', height: '100%' }}>
      {!readOnly && (
        <div className="editor-toolbar-buttons">
          <button className="toolbar-button add-node-btn" onClick={handleAddNodeButton}>
            + Add Node
          </button>
          <button
            className="toolbar-button add-link-btn"
            onClick={handleAddLinkButton}
            disabled={selectedNodes.length !== 2}
          >
            + Add Link {selectedNodes.length === 2 ? '' : `(Select 2 nodes)`}
          </button>
          <button
            className="toolbar-button delete-btn"
            onClick={handleDeleteSelected}
            disabled={selectedNodes.length === 0}
          >
            Delete Selected
          </button>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        onDoubleClick={onDoubleClick}
        onSelectionChange={handleSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={readOnly ? null : 'Delete'}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode="Shift"
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

      <AddLinkDialog
        isOpen={linkDialogOpen}
        sourceLabel={pendingConnection?.sourceLabel || ''}
        targetLabel={pendingConnection?.targetLabel || ''}
        sourceType={pendingConnection?.sourceType || 'noun'}
        targetType={pendingConnection?.targetType || 'noun'}
        onClose={() => {
          setLinkDialogOpen(false);
          setPendingConnection(null);
        }}
        onAdd={handleAddLink}
      />

      {!readOnly && (
        <div className="editor-hint">
          Click nodes to select (Shift+click for multiple). Use buttons above to add/delete.
        </div>
      )}
    </div>
  );
}
