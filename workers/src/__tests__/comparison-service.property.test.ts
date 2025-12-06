import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { createMockFirestoreService, type FirestoreService } from '../services/firestore-service';
import {
  createComparisonService,
  ComparisonError,
  ComparisonErrorCode,
  type ComparisonService,
} from '../services/comparison-service';
import { createMockLLMAdapter, type LLMAdapter } from '../services/llm-adapter';
import { NodeType, NodeShape, type Node, type Link, ComparisonMode } from '@peer-resonant/shared';

/**
 * Arbitrary generators for property-based testing
 */
const positionArbitrary = fc.record({
  x: fc.integer({ min: 0, max: 2000 }),
  y: fc.integer({ min: 0, max: 2000 }),
});

const nodeStyleArbitrary = fc.record({
  shape: fc.constantFrom(NodeShape.RECTANGLE, NodeShape.ROUNDED_RECTANGLE),
  color: fc.hexaString({ minLength: 6, maxLength: 6 }).map((s) => `#${s}`),
  borderRadius: fc.option(fc.integer({ min: 0, max: 20 })),
});

// Node label must have at least one non-whitespace character
const validNodeLabelArbitrary = fc
  .tuple(
    fc.string({ minLength: 0, maxLength: 15 }),
    fc.stringOf(fc.char().filter((c) => c.trim().length > 0), { minLength: 1, maxLength: 15 }),
    fc.string({ minLength: 0, maxLength: 15 })
  )
  .map(([prefix, core, suffix]) => `${prefix}${core}${suffix}`.slice(0, 45));

const nodeArbitrary: fc.Arbitrary<Node> = fc.record({
  id: fc.uuid(),
  label: validNodeLabelArbitrary,
  type: fc.constantFrom(NodeType.NOUN, NodeType.VERB),
  position: positionArbitrary,
  style: nodeStyleArbitrary,
});

// Relationship must have at least one non-whitespace character
const validRelationshipArbitrary = fc
  .tuple(
    fc.string({ minLength: 0, maxLength: 20 }),
    fc.stringOf(fc.char().filter((c) => c.trim().length > 0), { minLength: 1, maxLength: 20 }),
    fc.string({ minLength: 0, maxLength: 20 })
  )
  .map(([prefix, core, suffix]) => `${prefix}${core}${suffix}`.slice(0, 60));

const linkArbitrary: fc.Arbitrary<Link> = fc.record({
  id: fc.uuid(),
  sourceNodeId: fc.uuid(),
  targetNodeId: fc.uuid(),
  relationship: validRelationshipArbitrary,
});

describe('Comparison Service Property Tests', () => {
  let firestoreService: FirestoreService;
  let llmAdapter: LLMAdapter;
  let comparisonService: ComparisonService;

  beforeEach(() => {
    firestoreService = createMockFirestoreService();
    llmAdapter = createMockLLMAdapter();
    comparisonService = createComparisonService(firestoreService, llmAdapter);
  });

  /**
   * Helper function to create a topic
   */
  async function createTopic(createdBy: string): Promise<string> {
    const topic = await firestoreService.createTopic({
      name: 'Test Topic',
      description: 'Test description',
      createdBy,
    });
    return topic.id;
  }

  /**
   * Helper function to create a concept map with nodes and links
   */
  async function createMapWithContent(
    topicId: string,
    ownerId: string,
    isReference: boolean,
    nodes: Node[],
    links: Link[]
  ): Promise<string> {
    const map = await firestoreService.createConceptMap({
      topicId,
      ownerId,
      isReference,
      nodes,
      links,
    });
    return map.id;
  }

  // Feature: peer-concept-mapping, Property 7: Comparison mode accuracy
  // Each comparison mode produces results that correctly reflect the selected comparison type
  describe('Property 7: Comparison mode accuracy', () => {
    it('one_to_one mode should compare exactly two maps', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(nodeArbitrary, { minLength: 1, maxLength: 5 }),
          fc.array(nodeArbitrary, { minLength: 1, maxLength: 5 }),
          async (teacherId, nodes1, nodes2) => {
            const topicId = await createTopic(teacherId);
            const mapId1 = await createMapWithContent(topicId, teacherId, false, nodes1, []);
            const mapId2 = await createMapWithContent(topicId, teacherId, false, nodes2, []);

            const comparison = await comparisonService.createOneToOneComparison(
              teacherId,
              topicId,
              mapId1,
              mapId2
            );

            expect(comparison.mode).toBe(ComparisonMode.ONE_TO_ONE);
            expect(comparison.mapIds).toHaveLength(2);
            expect(comparison.mapIds).toContain(mapId1);
            expect(comparison.mapIds).toContain(mapId2);
            expect(comparison.results).toHaveLength(1);
            expect(comparison.results[0].map1Id).toBe(mapId1);
            expect(comparison.results[0].map2Id).toBe(mapId2);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('teacher_to_all mode should compare reference map against all student maps', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(fc.uuid(), { minLength: 2, maxLength: 4 }),
          fc.array(nodeArbitrary, { minLength: 1, maxLength: 3 }),
          async (teacherId, studentIds, referenceNodes) => {
            const topicId = await createTopic(teacherId);
            const referenceMapId = await createMapWithContent(
              topicId,
              teacherId,
              true,
              referenceNodes,
              []
            );

            // Create student maps
            const studentMapIds: string[] = [];
            for (const studentId of studentIds) {
              const mapId = await createMapWithContent(topicId, studentId, false, [], []);
              studentMapIds.push(mapId);
            }

            const comparison = await comparisonService.createTeacherToAllComparison(
              teacherId,
              topicId,
              referenceMapId
            );

            expect(comparison.mode).toBe(ComparisonMode.TEACHER_TO_ALL);
            expect(comparison.mapIds).toContain(referenceMapId);
            expect(comparison.results).toHaveLength(studentIds.length);

            // Each result should compare reference map with a student map
            for (const result of comparison.results) {
              expect(result.map1Id).toBe(referenceMapId);
              expect(studentMapIds).toContain(result.map2Id);
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    it('all_students mode should create pairwise comparisons of all student maps', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(fc.uuid(), { minLength: 2, maxLength: 4 }),
          async (teacherId, studentIds) => {
            const topicId = await createTopic(teacherId);

            // Create student maps
            for (const studentId of studentIds) {
              await createMapWithContent(topicId, studentId, false, [], []);
            }

            const comparison = await comparisonService.createAllStudentsComparison(
              teacherId,
              topicId
            );

            expect(comparison.mode).toBe(ComparisonMode.ALL_STUDENTS);

            // Number of pairwise comparisons should be n*(n-1)/2
            const n = studentIds.length;
            const expectedPairs = (n * (n - 1)) / 2;
            expect(comparison.results).toHaveLength(expectedPairs);
          }
        ),
        { numRuns: 15 }
      );
    });

    it('partial_students mode should compare only selected student maps', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(fc.uuid(), { minLength: 3, maxLength: 5 }),
          fc.integer({ min: 2, max: 3 }),
          async (teacherId, studentIds, numSelected) => {
            const topicId = await createTopic(teacherId);

            // Create student maps
            const allMapIds: string[] = [];
            for (const studentId of studentIds) {
              const mapId = await createMapWithContent(topicId, studentId, false, [], []);
              allMapIds.push(mapId);
            }

            // Select a subset
            const selectedMapIds = allMapIds.slice(0, numSelected);

            const comparison = await comparisonService.createPartialStudentsComparison(
              teacherId,
              topicId,
              selectedMapIds
            );

            expect(comparison.mode).toBe(ComparisonMode.PARTIAL_STUDENTS);
            expect(comparison.mapIds).toHaveLength(numSelected);

            // Only selected maps should be in the comparison
            for (const mapId of selectedMapIds) {
              expect(comparison.mapIds).toContain(mapId);
            }

            // Number of pairwise comparisons
            const expectedPairs = (numSelected * (numSelected - 1)) / 2;
            expect(comparison.results).toHaveLength(expectedPairs);
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  // Feature: peer-concept-mapping, Property 8: Vocabulary adjustment is mandatory
  // Before any comparison, vocabulary adjustment through LLM is always performed
  describe('Property 8: Vocabulary adjustment is mandatory', () => {
    it('comparison results should include adjusted vocabulary for all nodes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(nodeArbitrary, { minLength: 1, maxLength: 5 }),
          fc.array(nodeArbitrary, { minLength: 1, maxLength: 5 }),
          async (teacherId, nodes1, nodes2) => {
            const topicId = await createTopic(teacherId);
            const mapId1 = await createMapWithContent(topicId, teacherId, false, nodes1, []);
            const mapId2 = await createMapWithContent(topicId, teacherId, false, nodes2, []);

            const comparison = await comparisonService.createOneToOneComparison(
              teacherId,
              topicId,
              mapId1,
              mapId2
            );

            const result = comparison.results[0];

            // All nodes from map1 should have adjustments
            expect(result.adjustedNodes1).toHaveLength(nodes1.length);
            for (const adj of result.adjustedNodes1) {
              const originalNode = nodes1.find((n) => n.id === adj.nodeId);
              expect(originalNode).toBeDefined();
              expect(adj.originalLabel).toBe(originalNode!.label);
              expect(adj.adjustedLabel).toBeDefined();
            }

            // All nodes from map2 should have adjustments
            expect(result.adjustedNodes2).toHaveLength(nodes2.length);
            for (const adj of result.adjustedNodes2) {
              const originalNode = nodes2.find((n) => n.id === adj.nodeId);
              expect(originalNode).toBeDefined();
              expect(adj.originalLabel).toBe(originalNode!.label);
              expect(adj.adjustedLabel).toBeDefined();
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // Feature: peer-concept-mapping, Property 12: Comparison result structural integrity
  // A comparison result contains: matched nodes/links, unique elements per map,
  // similarity score, and adjusted vocabulary
  describe('Property 12: Comparison result structural integrity', () => {
    it('comparison result should contain all required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(nodeArbitrary, { minLength: 1, maxLength: 5 }),
          fc.array(linkArbitrary, { minLength: 0, maxLength: 3 }),
          fc.array(nodeArbitrary, { minLength: 1, maxLength: 5 }),
          fc.array(linkArbitrary, { minLength: 0, maxLength: 3 }),
          async (teacherId, nodes1, links1, nodes2, links2) => {
            const topicId = await createTopic(teacherId);
            const mapId1 = await createMapWithContent(topicId, teacherId, false, nodes1, links1);
            const mapId2 = await createMapWithContent(topicId, teacherId, false, nodes2, links2);

            const comparison = await comparisonService.createOneToOneComparison(
              teacherId,
              topicId,
              mapId1,
              mapId2
            );

            const result = comparison.results[0];

            // Check required fields exist
            expect(result.map1Id).toBe(mapId1);
            expect(result.map2Id).toBe(mapId2);
            expect(typeof result.similarityScore).toBe('number');
            expect(result.similarityScore).toBeGreaterThanOrEqual(0);
            expect(result.similarityScore).toBeLessThanOrEqual(1);

            // Check arrays exist
            expect(Array.isArray(result.matchedNodes)).toBe(true);
            expect(Array.isArray(result.matchedLinks)).toBe(true);
            expect(Array.isArray(result.uniqueNodesMap1)).toBe(true);
            expect(Array.isArray(result.uniqueNodesMap2)).toBe(true);
            expect(Array.isArray(result.uniqueLinksMap1)).toBe(true);
            expect(Array.isArray(result.uniqueLinksMap2)).toBe(true);
            expect(Array.isArray(result.adjustedNodes1)).toBe(true);
            expect(Array.isArray(result.adjustedNodes2)).toBe(true);
            expect(Array.isArray(result.adjustedLinks1)).toBe(true);
            expect(Array.isArray(result.adjustedLinks2)).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('matched and unique nodes should partition all nodes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(nodeArbitrary, { minLength: 1, maxLength: 5 }),
          fc.array(nodeArbitrary, { minLength: 1, maxLength: 5 }),
          async (teacherId, nodes1, nodes2) => {
            const topicId = await createTopic(teacherId);
            const mapId1 = await createMapWithContent(topicId, teacherId, false, nodes1, []);
            const mapId2 = await createMapWithContent(topicId, teacherId, false, nodes2, []);

            const comparison = await comparisonService.createOneToOneComparison(
              teacherId,
              topicId,
              mapId1,
              mapId2
            );

            const result = comparison.results[0];

            // Matched nodes from map1 + unique nodes from map1 = all nodes in map1
            const matchedFromMap1 = result.matchedNodes.map((m) => m.node1Id);
            const allMap1Nodes = [...matchedFromMap1, ...result.uniqueNodesMap1];
            expect(allMap1Nodes.length).toBe(nodes1.length);

            // Matched nodes from map2 + unique nodes from map2 = all nodes in map2
            const matchedFromMap2 = result.matchedNodes.map((m) => m.node2Id);
            const allMap2Nodes = [...matchedFromMap2, ...result.uniqueNodesMap2];
            expect(allMap2Nodes.length).toBe(nodes2.length);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // Feature: peer-concept-mapping, Property 16: Topic boundary respect
  // Comparisons can only be created between maps belonging to the same topic
  describe('Property 16: Topic boundary respect', () => {
    it('should reject comparison of maps from different topics', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (teacherId) => {
          const topic1Id = await createTopic(teacherId);
          const topic2Id = await createTopic(teacherId);

          const mapId1 = await createMapWithContent(topic1Id, teacherId, false, [], []);
          const mapId2 = await createMapWithContent(topic2Id, teacherId, false, [], []);

          await expect(
            comparisonService.createOneToOneComparison(teacherId, topic1Id, mapId1, mapId2)
          ).rejects.toThrow(ComparisonError);

          try {
            await comparisonService.createOneToOneComparison(teacherId, topic1Id, mapId1, mapId2);
          } catch (error) {
            expect(error).toBeInstanceOf(ComparisonError);
            expect((error as ComparisonError).code).toBe(ComparisonErrorCode.TOPIC_MISMATCH);
          }
        }),
        { numRuns: 20 }
      );
    });

    it('should allow comparison of maps from the same topic', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (teacherId) => {
          const topicId = await createTopic(teacherId);

          const mapId1 = await createMapWithContent(topicId, teacherId, false, [], []);
          const mapId2 = await createMapWithContent(topicId, teacherId, false, [], []);

          // Should not throw
          const comparison = await comparisonService.createOneToOneComparison(
            teacherId,
            topicId,
            mapId1,
            mapId2
          );

          expect(comparison.topicId).toBe(topicId);
        }),
        { numRuns: 20 }
      );
    });
  });
});
