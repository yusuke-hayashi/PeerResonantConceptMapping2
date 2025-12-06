import type { NodeType, Position } from './concept-map';

/**
 * Comparison mode enum
 */
export const ComparisonMode = {
  ONE_TO_ONE: 'one_to_one',
  TEACHER_TO_ALL: 'teacher_to_all',
  ALL_STUDENTS: 'all_students',
  PARTIAL_STUDENTS: 'partial_students',
} as const;

export type ComparisonMode = (typeof ComparisonMode)[keyof typeof ComparisonMode];

/**
 * @deprecated Use ComparisonMode instead
 */
export const ComparisonType = ComparisonMode;

/**
 * @deprecated Use ComparisonMode instead
 */
export type ComparisonType = ComparisonMode;

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
  node1Id: string;
  node2Id: string;
  originalLabel1: string;
  originalLabel2: string;
  adjustedLabel: string;
  similarity: number;
}

/**
 * Link match interface
 */
export interface LinkMatch {
  link1Id: string;
  link2Id: string;
  originalRelationship1: string;
  originalRelationship2: string;
  adjustedRelationship: string;
  similarity: number;
}

/**
 * Node adjustment result
 */
export interface NodeAdjustmentResult {
  nodeId: string;
  originalLabel: string;
  adjustedLabel: string;
  confidence: number;
}

/**
 * Link adjustment result
 */
export interface LinkAdjustmentResult {
  linkId: string;
  originalRelationship: string;
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
 * Pairwise comparison result interface
 * Property 12: Comparison result structural integrity
 */
export interface ComparisonResult {
  map1Id: string;
  map2Id: string;
  similarityScore: number;
  matchedNodes: NodeMatch[];
  matchedLinks: LinkMatch[];
  uniqueNodesMap1: string[];
  uniqueNodesMap2: string[];
  uniqueLinksMap1: string[];
  uniqueLinksMap2: string[];
  adjustedNodes1: NodeAdjustmentResult[];
  adjustedNodes2: NodeAdjustmentResult[];
  adjustedLinks1: LinkAdjustmentResult[];
  adjustedLinks2: LinkAdjustmentResult[];
}

/**
 * Legacy comparison result interface
 * @deprecated Use ComparisonResult instead
 */
export interface LegacyComparisonResult {
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
  mode: ComparisonMode;
  topicId: string;
  mapIds: string[];
  createdBy: string;
  results: ComparisonResult[];
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
