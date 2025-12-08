import { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  type Node,
  type Edge,
  type NodeTypes,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ConceptNode } from './ConceptNode';
import type { MapNode, MapLink, NodeAdjustmentResult } from '../services/firestore';

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
 * Read-only concept map view for comparison display
 * Highlights matched nodes/links in green and unique ones in orange
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

  // Convert nodes with highlighting
  const reactFlowNodes = useMemo((): Node[] => {
    return nodes.map((node) => {
      const isMatched = matchedNodeIds.includes(node.id);
      const isUnique = uniqueNodeIds.includes(node.id);
      const adjustedLabel = adjustedLabelMap.get(node.id);

      // Determine highlight color
      let highlightColor: string | undefined;
      if (isMatched) {
        highlightColor = '#10B981'; // green
      } else if (isUnique) {
        highlightColor = '#F59E0B'; // orange
      }

      return {
        id: node.id,
        type: 'conceptNode',
        position: { x: node.position.x, y: node.position.y },
        data: {
          label: adjustedLabel ? `${node.label} → ${adjustedLabel}` : node.label,
          nodeType: node.type,
          color: highlightColor || node.style.color,
          isHighlighted: isMatched || isUnique,
        },
      };
    });
  }, [nodes, matchedNodeIds, uniqueNodeIds, adjustedLabelMap]);

  // Convert links with highlighting
  const reactFlowEdges = useMemo((): Edge[] => {
    return links.map((link) => {
      const isMatched = matchedLinkIds.includes(link.id);
      const isUnique = uniqueLinkIds.includes(link.id);

      // Determine stroke color
      let strokeColor = '#6B7280'; // default gray
      if (isMatched) {
        strokeColor = '#10B981'; // green
      } else if (isUnique) {
        strokeColor = '#F59E0B'; // orange
      }

      return {
        id: link.id,
        source: link.sourceNodeId,
        target: link.targetNodeId,
        label: link.relationship,
        type: 'default',
        style: { stroke: strokeColor, strokeWidth: isMatched || isUnique ? 3 : 2 },
        labelStyle: { fill: strokeColor, fontWeight: isMatched || isUnique ? 600 : 500 },
        labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
      };
    });
  }, [links, matchedLinkIds, uniqueLinkIds]);

  return (
    <div className="comparison-map-view" style={{ width: '100%', height: '400px' }}>
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
      >
        <Controls showInteractive={false} />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      </ReactFlow>

      <div className="map-legend">
        <span className="legend-item matched">
          <span className="legend-color" style={{ backgroundColor: '#10B981' }} />
          Matched
        </span>
        <span className="legend-item unique">
          <span className="legend-color" style={{ backgroundColor: '#F59E0B' }} />
          Unique
        </span>
      </div>
    </div>
  );
}
