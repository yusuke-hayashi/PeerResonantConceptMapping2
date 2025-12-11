import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  type Node,
  type Edge,
  type NodeTypes,
  type OnNodesChange,
  applyNodeChanges,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ConceptNode } from './ConceptNode';
import type { MapNode, MapLink, NodeAdjustmentResult } from '../services/firestore';

/**
 * Groups edges by node pair to detect multiple edges between the same nodes
 * Used for calculating label offsets to avoid overlap
 */
function groupEdgesByNodePair(links: MapLink[]): Map<string, MapLink[]> {
  const groups = new Map<string, MapLink[]>();
  links.forEach((link) => {
    // Treat bidirectional edges as the same group
    const key = [link.sourceNodeId, link.targetNodeId].sort().join('-');
    const group = groups.get(key) || [];
    group.push(link);
    groups.set(key, group);
  });
  return groups;
}

const nodeTypes: NodeTypes = {
  conceptNode: ConceptNode,
};

interface ComparisonMapViewProps {
  nodes: MapNode[];
  links: MapLink[];
  matchedNodeIds: string[];
  matchedLinkIds: string[];
  uniqueNodeIds: string[];
  uniqueLinkIds: string[];
  adjustedNodes?: NodeAdjustmentResult[];
}

/**
 * Interactive concept map view for comparison display
 * Highlights matched nodes/links in green and unique ones in orange
 * Nodes can be dragged to adjust layout and avoid label overlap
 */
export function ComparisonMapView({
  nodes,
  links,
  matchedNodeIds,
  matchedLinkIds,
  uniqueNodeIds,
  uniqueLinkIds,
  adjustedNodes = [],
}: ComparisonMapViewProps) {
  // Create a map of adjusted labels
  const adjustedLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    adjustedNodes.forEach((adj) => {
      if (adj.originalLabel !== adj.adjustedLabel) {
        map.set(adj.nodeId, adj.adjustedLabel);
      }
    });
    return map;
  }, [adjustedNodes]);

  // Convert nodes with highlighting (initial state)
  const initialNodes = useMemo((): Node[] => {
    return nodes.map((node, index) => {
      const isMatched = matchedNodeIds.includes(node.id);
      const isUnique = uniqueNodeIds.includes(node.id);
      const adjustedLabel = adjustedLabelMap.get(node.id);

      // Determine highlight color
      let highlightColor: string | undefined;
      if (isMatched) {
        highlightColor = '#F59E0B'; // yellow/amber for matched
      } else if (isUnique) {
        highlightColor = '#EF4444'; // red for unique/missing
      }

      // 位置が未定義の場合は自動レイアウト（グリッド配置）
      const defaultPosition = {
        x: (index % 4) * 200 + 50,
        y: Math.floor(index / 4) * 150 + 50,
      };
      const position = node.position
        ? { x: node.position.x ?? defaultPosition.x, y: node.position.y ?? defaultPosition.y }
        : defaultPosition;

      return {
        id: node.id,
        type: 'conceptNode',
        position,
        data: {
          label: adjustedLabel ? `${node.label} → ${adjustedLabel}` : node.label,
          nodeType: node.type,
          color: highlightColor || node.style?.color || '#3B82F6',
          isHighlighted: isMatched || isUnique,
        },
      };
    });
  }, [nodes, matchedNodeIds, uniqueNodeIds, adjustedLabelMap]);

  // Manage node state for dragging
  const [reactFlowNodes, setReactFlowNodes] = useState<Node[]>(initialNodes);

  // Update nodes when initial data changes
  useEffect(() => {
    setReactFlowNodes(initialNodes);
  }, [initialNodes]);

  // Handle node position changes (drag)
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setReactFlowNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  // Convert links with highlighting and label offset for overlap avoidance
  const reactFlowEdges = useMemo((): Edge[] => {
    const edgeGroups = groupEdgesByNodePair(links);

    return links.map((link) => {
      const isMatched = matchedLinkIds.includes(link.id);
      const isUnique = uniqueLinkIds.includes(link.id);

      // Calculate offset for edges between the same node pair
      const groupKey = [link.sourceNodeId, link.targetNodeId].sort().join('-');
      const group = edgeGroups.get(groupKey) || [link];
      const indexInGroup = group.findIndex((l) => l.id === link.id);
      const groupSize = group.length;

      // Calculate Y offset to distribute labels (centered distribution)
      const labelOffset =
        groupSize > 1 ? (indexInGroup - (groupSize - 1) / 2) * 25 : 0;

      // Determine stroke color
      let strokeColor = '#6B7280'; // default gray
      if (isMatched) {
        strokeColor = '#F59E0B'; // yellow/amber for matched
      } else if (isUnique) {
        strokeColor = '#EF4444'; // red for unique/missing
      }

      // リンクラベルを構築（link.labelがある場合は「何が: relationship」形式）
      const displayLabel = link.label
        ? link.relationship
          ? `${link.label}: ${link.relationship}`
          : link.label
        : link.relationship || '';

      return {
        id: link.id,
        source: link.sourceNodeId,
        target: link.targetNodeId,
        label: displayLabel,
        type: groupSize > 1 ? 'smoothstep' : 'default',
        style: { stroke: strokeColor, strokeWidth: isMatched || isUnique ? 3 : 2 },
        labelStyle: {
          fill: strokeColor,
          fontWeight: isMatched || isUnique ? 600 : 500,
          fontSize: 12,
          transform: `translateY(${labelOffset}px)`,
        },
        labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
        ...(groupSize > 1 && { pathOptions: { offset: labelOffset } }),
      };
    });
  }, [links, matchedLinkIds, uniqueLinkIds]);

  return (
    <div className="comparison-map-view" style={{ width: '100%', height: '400px' }}>
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        fitView
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag
        zoomOnScroll
      >
        <Controls showInteractive={false} />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      </ReactFlow>

      <div className="map-legend">
        <span className="legend-item matched">
          <span className="legend-color" style={{ backgroundColor: '#F59E0B' }} />
          一致
        </span>
        <span className="legend-item unique">
          <span className="legend-color" style={{ backgroundColor: '#EF4444' }} />
          不足
        </span>
      </div>
    </div>
  );
}
