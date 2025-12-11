import type {
  ConceptMap,
  Node,
  Link,
  Comparison,
  ComparisonMode,
  ComparisonResult,
  NodeMatch,
  LinkMatch,
} from '@peer-resonant/shared';
import type { FirestoreService } from './firestore-service';
import type { LLMAdapter, MapAdjustmentResult } from './llm-adapter';

/**
 * Comparison service error codes
 */
export const ComparisonErrorCode = {
  MAP_NOT_FOUND: 'MAP_NOT_FOUND',
  TOPIC_MISMATCH: 'TOPIC_MISMATCH',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  LLM_ERROR: 'LLM_ERROR',
  INVALID_MODE: 'INVALID_MODE',
  NO_MAPS_SELECTED: 'NO_MAPS_SELECTED',
} as const;

export type ComparisonErrorCode = (typeof ComparisonErrorCode)[keyof typeof ComparisonErrorCode];

/**
 * Comparison service error
 */
export class ComparisonError extends Error {
  constructor(
    public readonly code: ComparisonErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ComparisonError';
  }
}

/**
 * Comparison service interface
 */
export interface ComparisonService {
  // Create comparisons
  createOneToOneComparison(
    teacherId: string,
    topicId: string,
    mapId1: string,
    mapId2: string
  ): Promise<Comparison>;

  createTeacherToAllComparison(
    teacherId: string,
    topicId: string,
    referenceMapId: string
  ): Promise<Comparison>;

  createAllStudentsComparison(teacherId: string, topicId: string): Promise<Comparison>;

  createPartialStudentsComparison(
    teacherId: string,
    topicId: string,
    studentMapIds: string[]
  ): Promise<Comparison>;

  // Read comparisons
  getComparison(comparisonId: string, userId: string): Promise<Comparison>;
  getComparisonsByTopic(topicId: string, userId: string): Promise<Comparison[]>;
  getAccessibleComparisons(userId: string): Promise<Comparison[]>;
}

/**
 * Similarity score calculation result
 */
interface SimilarityResult {
  score: number;
  matchedNodes: NodeMatch[];
  matchedLinks: LinkMatch[];
  uniqueNodes1: string[];
  uniqueNodes2: string[];
  uniqueLinks1: string[];
  uniqueLinks2: string[];
}

/**
 * Create comparison service
 */
export function createComparisonService(
  firestoreService: FirestoreService,
  llmAdapter: LLMAdapter
): ComparisonService {
  /**
   * Verify all maps belong to the same topic
   * Property 16: Topic boundary respect
   */
  async function verifyTopicBoundary(mapIds: string[], topicId: string): Promise<ConceptMap[]> {
    const maps: ConceptMap[] = [];

    for (const mapId of mapIds) {
      const map = await firestoreService.getConceptMap(mapId);
      if (!map) {
        throw new ComparisonError(ComparisonErrorCode.MAP_NOT_FOUND, `Map not found: ${mapId}`);
      }
      if (map.topicId !== topicId) {
        throw new ComparisonError(
          ComparisonErrorCode.TOPIC_MISMATCH,
          `Map ${mapId} does not belong to topic ${topicId}`,
          { mapTopicId: map.topicId, expectedTopicId: topicId }
        );
      }
      maps.push(map);
    }

    return maps;
  }

  /**
   * Apply vocabulary adjustment to maps
   * Property 8: Mandatory vocabulary adjustment
   */
  async function adjustVocabulary(
    nodes: Node[],
    links: Link[],
    referenceNodes?: Node[],
    referenceLinks?: Link[]
  ): Promise<MapAdjustmentResult> {
    return llmAdapter.adjustMapVocabulary(nodes, links, referenceNodes, referenceLinks);
  }

  /**
   * Calculate similarity between two sets of adjusted nodes and links
   */
  function calculateSimilarity(
    nodes1: Node[],
    links1: Link[],
    adjustment1: MapAdjustmentResult,
    nodes2: Node[],
    links2: Link[],
    adjustment2: MapAdjustmentResult
  ): SimilarityResult {
    const matchedNodes: NodeMatch[] = [];
    const matchedLinks: LinkMatch[] = [];
    const matchedNodeIds1 = new Set<string>();
    const matchedNodeIds2 = new Set<string>();
    const matchedLinkIds1 = new Set<string>();
    const matchedLinkIds2 = new Set<string>();

    // Match nodes based on adjusted labels AND node type (noun/verb)
    // 動詞は動詞同士、名詞は名詞同士でのみマッチする
    for (const adj1 of adjustment1.nodes) {
      for (const adj2 of adjustment2.nodes) {
        if (
          adj1.adjustedLabel.toLowerCase() === adj2.adjustedLabel.toLowerCase() &&
          !matchedNodeIds1.has(adj1.nodeId) &&
          !matchedNodeIds2.has(adj2.nodeId)
        ) {
          const node1 = nodes1.find((n) => n.id === adj1.nodeId);
          const node2 = nodes2.find((n) => n.id === adj2.nodeId);

          // ノードタイプが一致する場合のみマッチとする
          if (node1 && node2 && node1.type === node2.type) {
            matchedNodes.push({
              node1Id: adj1.nodeId,
              node2Id: adj2.nodeId,
              originalLabel1: adj1.originalLabel,
              originalLabel2: adj2.originalLabel,
              adjustedLabel: adj1.adjustedLabel,
              similarity: Math.min(adj1.confidence, adj2.confidence),
            });
            matchedNodeIds1.add(adj1.nodeId);
            matchedNodeIds2.add(adj2.nodeId);
          }
        }
      }
    }

    // Match links based on label, adjusted relationships, and matched nodes
    for (const adj1 of adjustment1.links) {
      for (const adj2 of adjustment2.links) {
        // 既にマッチ済みならスキップ
        if (matchedLinkIds1.has(adj1.linkId) || matchedLinkIds2.has(adj2.linkId)) {
          continue;
        }

        const link1 = links1.find((l) => l.id === adj1.linkId);
        const link2 = links2.find((l) => l.id === adj2.linkId);

        if (link1 && link2) {
          // labelの比較（何が/何を/何に/どこで/いつ）
          const labelMatches = link1.label === link2.label;
          // relationshipの比較（LLM調整済み）
          const relationshipMatches =
            adj1.adjustedRelationship.toLowerCase() === adj2.adjustedRelationship.toLowerCase();

          if (labelMatches && relationshipMatches) {
            // Check if source and target nodes are also matched
            const sourceMatched =
              matchedNodeIds1.has(link1.sourceNodeId) && matchedNodeIds2.has(link2.sourceNodeId);
            const targetMatched =
              matchedNodeIds1.has(link1.targetNodeId) && matchedNodeIds2.has(link2.targetNodeId);

            if (sourceMatched || targetMatched) {
              matchedLinks.push({
                link1Id: adj1.linkId,
                link2Id: adj2.linkId,
                originalRelationship1: adj1.originalRelationship,
                originalRelationship2: adj2.originalRelationship,
                adjustedRelationship: adj1.adjustedRelationship,
                similarity: Math.min(adj1.confidence, adj2.confidence),
              });
              matchedLinkIds1.add(adj1.linkId);
              matchedLinkIds2.add(adj2.linkId);
            }
          }
        }
      }
    }

    // Calculate unique elements
    const uniqueNodes1 = nodes1.filter((n) => !matchedNodeIds1.has(n.id)).map((n) => n.id);
    const uniqueNodes2 = nodes2.filter((n) => !matchedNodeIds2.has(n.id)).map((n) => n.id);
    const uniqueLinks1 = links1.filter((l) => !matchedLinkIds1.has(l.id)).map((l) => l.id);
    const uniqueLinks2 = links2.filter((l) => !matchedLinkIds2.has(l.id)).map((l) => l.id);

    // Calculate overall similarity score
    const totalElements =
      nodes1.length + nodes2.length + links1.length + links2.length;
    const matchedElements = (matchedNodes.length + matchedLinks.length) * 2;
    const score = totalElements > 0 ? matchedElements / totalElements : 0;

    return {
      score,
      matchedNodes,
      matchedLinks,
      uniqueNodes1,
      uniqueNodes2,
      uniqueLinks1,
      uniqueLinks2,
    };
  }

  /**
   * Create comparison result for two maps
   */
  async function createPairwiseComparison(
    map1: ConceptMap,
    map2: ConceptMap,
    referenceMap?: ConceptMap
  ): Promise<ComparisonResult> {
    // Adjust vocabulary
    const adjustment1 = await adjustVocabulary(
      map1.nodes,
      map1.links,
      referenceMap?.nodes,
      referenceMap?.links
    );
    const adjustment2 = await adjustVocabulary(
      map2.nodes,
      map2.links,
      referenceMap?.nodes,
      referenceMap?.links
    );

    // Calculate similarity
    const similarity = calculateSimilarity(
      map1.nodes,
      map1.links,
      adjustment1,
      map2.nodes,
      map2.links,
      adjustment2
    );

    return {
      map1Id: map1.id,
      map2Id: map2.id,
      similarityScore: similarity.score,
      matchedNodes: similarity.matchedNodes,
      matchedLinks: similarity.matchedLinks,
      uniqueNodesMap1: similarity.uniqueNodes1,
      uniqueNodesMap2: similarity.uniqueNodes2,
      uniqueLinksMap1: similarity.uniqueLinks1,
      uniqueLinksMap2: similarity.uniqueLinks2,
      adjustedNodes1: adjustment1.nodes,
      adjustedNodes2: adjustment2.nodes,
      adjustedLinks1: adjustment1.links,
      adjustedLinks2: adjustment2.links,
    };
  }

  return {
    /**
     * Create one-to-one comparison
     * Property 7: Comparison mode accuracy - one_to_one mode
     */
    async createOneToOneComparison(
      teacherId: string,
      topicId: string,
      mapId1: string,
      mapId2: string
    ): Promise<Comparison> {
      // Verify topic boundary
      const [map1, map2] = await verifyTopicBoundary([mapId1, mapId2], topicId);

      // Create comparison result
      const result = await createPairwiseComparison(map1, map2);

      // Save comparison
      return firestoreService.createComparison({
        topicId,
        createdBy: teacherId,
        mode: 'one_to_one' as ComparisonMode,
        mapIds: [mapId1, mapId2],
        results: [result],
      });
    },

    /**
     * Create teacher reference vs all students comparison
     * Property 7: Comparison mode accuracy - teacher_to_all mode
     */
    async createTeacherToAllComparison(
      teacherId: string,
      topicId: string,
      referenceMapId: string
    ): Promise<Comparison> {
      // Get reference map
      const referenceMap = await firestoreService.getConceptMap(referenceMapId);
      if (!referenceMap) {
        throw new ComparisonError(
          ComparisonErrorCode.MAP_NOT_FOUND,
          `Reference map not found: ${referenceMapId}`
        );
      }
      if (referenceMap.topicId !== topicId) {
        throw new ComparisonError(
          ComparisonErrorCode.TOPIC_MISMATCH,
          'Reference map does not belong to the specified topic'
        );
      }

      // Get all student maps for the topic
      const allMaps = await firestoreService.getConceptMapsByTopic(topicId);
      const studentMaps = allMaps.filter(
        (m) => !m.isReference && m.id !== referenceMapId
      );

      if (studentMaps.length === 0) {
        throw new ComparisonError(
          ComparisonErrorCode.NO_MAPS_SELECTED,
          'No student maps found for comparison'
        );
      }

      // Create comparison results for each student map
      const results: ComparisonResult[] = [];
      for (const studentMap of studentMaps) {
        const result = await createPairwiseComparison(referenceMap, studentMap, referenceMap);
        results.push(result);
      }

      // Save comparison
      return firestoreService.createComparison({
        topicId,
        createdBy: teacherId,
        mode: 'teacher_to_all' as ComparisonMode,
        mapIds: [referenceMapId, ...studentMaps.map((m) => m.id)],
        results,
      });
    },

    /**
     * Create all students comparison
     * Property 7: Comparison mode accuracy - all_students mode
     */
    async createAllStudentsComparison(
      teacherId: string,
      topicId: string
    ): Promise<Comparison> {
      // Get all student maps for the topic
      const allMaps = await firestoreService.getConceptMapsByTopic(topicId);
      const studentMaps = allMaps.filter((m) => !m.isReference);

      if (studentMaps.length < 2) {
        throw new ComparisonError(
          ComparisonErrorCode.NO_MAPS_SELECTED,
          'At least 2 student maps required for comparison'
        );
      }

      // Create pairwise comparisons
      const results: ComparisonResult[] = [];
      for (let i = 0; i < studentMaps.length; i++) {
        for (let j = i + 1; j < studentMaps.length; j++) {
          const result = await createPairwiseComparison(studentMaps[i], studentMaps[j]);
          results.push(result);
        }
      }

      // Save comparison
      return firestoreService.createComparison({
        topicId,
        createdBy: teacherId,
        mode: 'all_students' as ComparisonMode,
        mapIds: studentMaps.map((m) => m.id),
        results,
      });
    },

    /**
     * Create partial students comparison
     * Property 7: Comparison mode accuracy - partial_students mode
     */
    async createPartialStudentsComparison(
      teacherId: string,
      topicId: string,
      studentMapIds: string[]
    ): Promise<Comparison> {
      if (studentMapIds.length < 2) {
        throw new ComparisonError(
          ComparisonErrorCode.NO_MAPS_SELECTED,
          'At least 2 maps required for comparison'
        );
      }

      // Verify topic boundary
      const maps = await verifyTopicBoundary(studentMapIds, topicId);

      // Create pairwise comparisons
      const results: ComparisonResult[] = [];
      for (let i = 0; i < maps.length; i++) {
        for (let j = i + 1; j < maps.length; j++) {
          const result = await createPairwiseComparison(maps[i], maps[j]);
          results.push(result);
        }
      }

      // Save comparison
      return firestoreService.createComparison({
        topicId,
        createdBy: teacherId,
        mode: 'partial_students' as ComparisonMode,
        mapIds: studentMapIds,
        results,
      });
    },

    /**
     * Get a comparison by ID
     */
    async getComparison(comparisonId: string, userId: string): Promise<Comparison> {
      const comparison = await firestoreService.getComparison(comparisonId);
      if (!comparison) {
        throw new ComparisonError(
          ComparisonErrorCode.MAP_NOT_FOUND,
          `Comparison not found: ${comparisonId}`
        );
      }

      // Check if user has permission to view
      // Teachers who created it, or students with explicit permission
      if (comparison.createdBy !== userId) {
        const permission = await firestoreService.getPermission(comparisonId, userId);
        if (!permission) {
          throw new ComparisonError(
            ComparisonErrorCode.PERMISSION_DENIED,
            'You do not have permission to view this comparison'
          );
        }
      }

      return comparison;
    },

    /**
     * Get comparisons by topic
     */
    async getComparisonsByTopic(topicId: string, userId: string): Promise<Comparison[]> {
      const comparisons = await firestoreService.getComparisonsByTopic(topicId);

      // Filter to only include comparisons the user can access
      const accessible: Comparison[] = [];
      for (const comparison of comparisons) {
        if (comparison.createdBy === userId) {
          accessible.push(comparison);
        } else {
          const permission = await firestoreService.getPermission(comparison.id, userId);
          if (permission) {
            accessible.push(comparison);
          }
        }
      }

      return accessible;
    },

    /**
     * Get all comparisons accessible to a user
     */
    async getAccessibleComparisons(userId: string): Promise<Comparison[]> {
      // Get comparisons created by the user
      const createdComparisons = await firestoreService.getComparisonsByCreator(userId);

      // Get comparisons the user has permission to view
      const permissions = await firestoreService.getPermissionsByStudent(userId);
      const permittedComparisons: Comparison[] = [];

      for (const permission of permissions) {
        const comparison = await firestoreService.getComparison(permission.comparisonId);
        if (comparison) {
          permittedComparisons.push(comparison);
        }
      }

      // Combine and deduplicate
      const allComparisons = [...createdComparisons, ...permittedComparisons];
      const uniqueMap = new Map<string, Comparison>();
      for (const comparison of allComparisons) {
        uniqueMap.set(comparison.id, comparison);
      }

      return Array.from(uniqueMap.values());
    },
  };
}
