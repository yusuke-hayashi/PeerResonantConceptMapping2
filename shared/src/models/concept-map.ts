/**
 * Node type enum
 */
export const NodeType = {
  NOUN: 'noun',
  VERB: 'verb',
} as const;

export type NodeType = (typeof NodeType)[keyof typeof NodeType];

/**
 * Node shape enum
 */
export const NodeShape = {
  RECTANGLE: 'rectangle',
  ROUNDED_RECTANGLE: 'rounded-rectangle',
} as const;

export type NodeShape = (typeof NodeShape)[keyof typeof NodeShape];

/**
 * Position interface
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Node style interface
 */
export interface NodeStyle {
  shape: NodeShape;
  color: string;
  borderRadius?: number;
}

/**
 * Node interface
 */
export interface Node {
  id: string;
  label: string;
  type: NodeType;
  position: Position;
  style: NodeStyle;
  metadata?: Record<string, unknown>;
}

/**
 * Link interface
 */
export interface Link {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationship: string;
  metadata?: Record<string, unknown>;
}

/**
 * Concept map data model
 * Firestore collection: concept_maps
 *
 * Indexes:
 * - topicId (ascending), ownerId (ascending)
 * - topicId (ascending), isReference (ascending)
 * - ownerId (ascending), createdAt (descending)
 */
export interface ConceptMap {
  id: string;
  topicId: string;
  ownerId: string;
  isReference: boolean;
  nodes: Node[];
  links: Link[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Map updates interface for partial updates
 */
export interface MapUpdates {
  nodes?: Node[];
  links?: Link[];
}
