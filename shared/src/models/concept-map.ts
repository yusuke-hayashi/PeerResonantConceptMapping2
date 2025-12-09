/**
 * Node type enum
 */
export const NodeType = {
  NOUN: 'noun',
  VERB: 'verb',
} as const;

export type NodeType = (typeof NodeType)[keyof typeof NodeType];

/**
 * Link label enum
 * Based on docs/conceptmap/specification.md
 */
export const LinkLabel = {
  WHAT_SUBJECT: '何が', // Subject of action (動作の主体)
  WHAT_OBJECT: '何を', // Object of action (動作の対象)
  WHAT_TO: '何に', // Recipient/destination (動作の相手・到達先)
  WHERE: 'どこで', // Location (場所)
  WHEN: 'いつ', // Time (時間)
} as const;

export type LinkLabel = (typeof LinkLabel)[keyof typeof LinkLabel];

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
 * Links connect verb nodes to noun nodes with semantic labels
 */
export interface Link {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: LinkLabel; // Semantic role (何が, 何を, etc.)
  relationship: string; // Optional descriptive text
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
