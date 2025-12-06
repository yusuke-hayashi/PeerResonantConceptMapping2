import type { NodeType, Position } from './concept-map';

/**
 * Comparison type enum
 */
export const ComparisonType = {
  ONE_TO_ONE: 'one_to_one',
  TEACHER_TO_ALL: 'teacher_to_all',
  ALL_STUDENTS: 'all_students',
  PARTIAL_STUDENTS: 'partial_students',
} as const;

export type ComparisonType = (typeof ComparisonType)[keyof typeof ComparisonType];

/**
 * Adjusted node interface
 */
export interface AdjustedNode {
  originalId: string;
  originalLabel: string;
  adjustedLabel: string;
  type: NodeType;
  position: Position;
}

/**
 * Adjusted link interface
 */
export interface AdjustedLink {
  originalId: string;
  sourceNodeId: string;
  targetNodeId: string;
  originalRelationship: string;
  adjustedRelationship: string;
}

/**
 * Adjusted concept map interface
 */
export interface AdjustedConceptMap {
  originalMapId: string;
  adjustedNodes: AdjustedNode[];
  adjustedLinks: AdjustedLink[];
}

/**
 * Node match interface
 */
export interface NodeMatch {
  nodeId1: string;
  nodeId2: string;
  adjustedLabel: string;
  confidence: number;
}

/**
 * Link match interface
 */
export interface LinkMatch {
  linkId1: string;
  linkId2: string;
  adjustedRelationship: string;
  confidence: number;
}

/**
 * Similarity interface
 */
export interface Similarity {
  mapId1: string;
  mapId2: string;
  matchingNodes: NodeMatch[];
  matchingLinks: LinkMatch[];
  similarityScore: number;
}

/**
 * Difference interface
 */
export interface Difference {
  mapId: string;
  uniqueNodes: string[];
  uniqueLinks: string[];
}

/**
 * Comparison result interface
 */
export interface ComparisonResult {
  adjustedMaps: AdjustedConceptMap[];
  similarities: Similarity[];
  differences: Difference[];
}

/**
 * Comparison data model
 * Firestore collection: comparisons
 *
 * Indexes:
 * - topicId (ascending), createdBy (ascending)
 * - createdBy (ascending), createdAt (descending)
 */
export interface Comparison {
  id: string;
  type: ComparisonType;
  topicId: string;
  mapIds: string[];
  createdBy: string;
  result: ComparisonResult;
  createdAt: Date;
}

/**
 * Term mapping interface for LLM vocabulary adjustment
 */
export interface TermMapping {
  original: string;
  adjusted: string;
  confidence: number;
}

/**
 * Adjusted terms interface
 */
export interface AdjustedTerms {
  original: string[];
  adjusted: string[];
  mappings: TermMapping[];
}

/**
 * LLM configuration interface
 */
export interface LLMConfig {
  provider: 'lm-studio' | 'openai-compatible';
  endpoint: string;
  apiKey?: string;
  model: string;
}
