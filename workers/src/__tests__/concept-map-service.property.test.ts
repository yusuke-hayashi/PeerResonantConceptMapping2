import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { createMockFirestoreService, type FirestoreService } from '../services/firestore-service';
import {
  createConceptMapService,
  ConceptMapError,
  ConceptMapErrorCode,
  type ConceptMapService,
} from '../services/concept-map-service';
import { NodeType, NodeShape, type UserRole } from '@peer-resonant/shared';

/**
 * Arbitrary generators for property-based testing
 */
const positionArbitrary = fc.record({
  x: fc.integer({ min: 0, max: 2000 }),
  y: fc.integer({ min: 0, max: 2000 }),
});

// Node label must have at least one non-whitespace character
const validNodeLabelArbitrary = fc
  .tuple(
    fc.string({ minLength: 0, maxLength: 20 }),
    fc.stringOf(fc.char().filter((c) => c.trim().length > 0), { minLength: 1, maxLength: 20 }),
    fc.string({ minLength: 0, maxLength: 20 })
  )
  .map(([prefix, core, suffix]) => `${prefix}${core}${suffix}`.slice(0, 50));

const nodeDataArbitrary = fc.record({
  id: fc.uuid(),
  label: validNodeLabelArbitrary,
  type: fc.constantFrom(NodeType.NOUN, NodeType.VERB),
  position: positionArbitrary,
});

// Relationship must have at least one non-whitespace character
const validRelationshipArbitrary = fc
  .tuple(
    fc.string({ minLength: 0, maxLength: 50 }),
    fc.stringOf(fc.char().filter((c) => c.trim().length > 0), { minLength: 1, maxLength: 50 }),
    fc.string({ minLength: 0, maxLength: 50 })
  )
  .map(([prefix, core, suffix]) => `${prefix}${core}${suffix}`.slice(0, 100));

const linkArbitrary = fc.record({
  id: fc.uuid(),
  sourceNodeId: fc.uuid(),
  targetNodeId: fc.uuid(),
  relationship: validRelationshipArbitrary,
});

describe('Concept Map Service Property Tests', () => {
  let firestoreService: FirestoreService;
  let conceptMapService: ConceptMapService;

  beforeEach(() => {
    firestoreService = createMockFirestoreService();
    conceptMapService = createConceptMapService(firestoreService);
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

  // Feature: peer-concept-mapping, Property 5: Reference map marking
  // Reference maps created by teachers are clearly marked as such and distinguishable
  // from student maps
  describe('Property 5: Reference map marking', () => {
    it('should mark reference maps as isReference=true', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (teacherId) => {
          const topicId = await createTopic(teacherId);

          // Create a reference map
          const referenceMap = await conceptMapService.createMap(teacherId, topicId, true);

          expect(referenceMap.isReference).toBe(true);
          expect(referenceMap.ownerId).toBe(teacherId);
          expect(referenceMap.topicId).toBe(topicId);
        }),
        { numRuns: 50 }
      );
    });

    it('should mark student maps as isReference=false', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (teacherId, studentId) => {
          const topicId = await createTopic(teacherId);

          // Create a student map (not a reference)
          const studentMap = await conceptMapService.createMap(studentId, topicId, false);

          expect(studentMap.isReference).toBe(false);
          expect(studentMap.ownerId).toBe(studentId);
        }),
        { numRuns: 50 }
      );
    });

    it('should distinguish reference maps from student maps in queries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          async (teacherId, studentIds) => {
            const topicId = await createTopic(teacherId);

            // Create a reference map
            await conceptMapService.createMap(teacherId, topicId, true);

            // Create student maps
            for (const studentId of studentIds) {
              await conceptMapService.createMap(studentId, topicId, false);
            }

            // Get all maps for the topic (as teacher)
            const allMaps = await conceptMapService.getMapsByTopic(topicId, teacherId, 'teacher');

            // Verify reference maps are distinguishable
            const referenceMaps = allMaps.filter((m) => m.isReference);
            const studentMaps = allMaps.filter((m) => !m.isReference);

            expect(referenceMaps.length).toBe(1);
            expect(studentMaps.length).toBe(studentIds.length);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  // Feature: peer-concept-mapping, Property 3: Link relationship preservation
  // For any link added to a map, the relationship label is preserved exactly as entered
  describe('Property 3: Link relationship preservation', () => {
    it('should preserve link relationship exactly as entered', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          validRelationshipArbitrary,
          async (userId, relationship) => {
            const topicId = await createTopic(userId);
            const map = await conceptMapService.createMap(userId, topicId, false);

            // Add two nodes first
            const node1 = {
              id: crypto.randomUUID(),
              label: 'Node 1',
              type: NodeType.NOUN as const,
              position: { x: 100, y: 100 },
            };
            const node2 = {
              id: crypto.randomUUID(),
              label: 'Node 2',
              type: NodeType.NOUN as const,
              position: { x: 200, y: 200 },
            };

            await conceptMapService.addNode(map.id, userId, node1);
            const mapWithNodes = await conceptMapService.addNode(map.id, userId, node2);

            // Add a link with the relationship
            const link = {
              id: crypto.randomUUID(),
              sourceNodeId: node1.id,
              targetNodeId: node2.id,
              relationship,
            };

            const mapWithLink = await conceptMapService.addLink(map.id, userId, link);

            // Verify relationship is preserved exactly
            const addedLink = mapWithLink.links.find((l) => l.id === link.id);
            expect(addedLink).toBeDefined();
            expect(addedLink!.relationship).toBe(relationship);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should preserve special characters in relationship labels', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc
            .tuple(
              fc.constantFrom('→', '←', '↔', '⇒', '∈', '⊂', '∩', '∪', '≤', '≥', '≠', '∞'),
              fc.string({ minLength: 0, maxLength: 20 })
            )
            .map(([special, suffix]) => `${special}${suffix}`),
          async (userId, relationship) => {
            const topicId = await createTopic(userId);
            const map = await conceptMapService.createMap(userId, topicId, false);

            // Add nodes
            const node1 = {
              id: crypto.randomUUID(),
              label: 'Node 1',
              type: NodeType.NOUN as const,
              position: { x: 100, y: 100 },
            };
            const node2 = {
              id: crypto.randomUUID(),
              label: 'Node 2',
              type: NodeType.NOUN as const,
              position: { x: 200, y: 200 },
            };

            await conceptMapService.addNode(map.id, userId, node1);
            await conceptMapService.addNode(map.id, userId, node2);

            const link = {
              id: crypto.randomUUID(),
              sourceNodeId: node1.id,
              targetNodeId: node2.id,
              relationship,
            };

            const mapWithLink = await conceptMapService.addLink(map.id, userId, link);
            const addedLink = mapWithLink.links.find((l) => l.id === link.id);

            expect(addedLink!.relationship).toBe(relationship);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  // Feature: peer-concept-mapping, Property 11: Owner-based access control
  // A student can only edit their own concept map; teachers can view all but edit only their own
  describe('Property 11: Owner-based access control', () => {
    it('should allow owner to edit their own map', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          const topicId = await createTopic(userId);
          const map = await conceptMapService.createMap(userId, topicId, false);

          // Owner should be able to edit
          const canEdit = await conceptMapService.canEdit(map.id, userId);
          expect(canEdit).toBe(true);
        }),
        { numRuns: 50 }
      );
    });

    it('should deny non-owner from editing a map', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (ownerId, otherUserId) => {
          // Ensure different users
          fc.pre(ownerId !== otherUserId);

          const topicId = await createTopic(ownerId);
          const map = await conceptMapService.createMap(ownerId, topicId, false);

          // Non-owner should not be able to edit
          const canEdit = await conceptMapService.canEdit(map.id, otherUserId);
          expect(canEdit).toBe(false);
        }),
        { numRuns: 50 }
      );
    });

    it('should throw PERMISSION_DENIED when non-owner tries to add node', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), nodeDataArbitrary, async (ownerId, otherUserId, nodeData) => {
          fc.pre(ownerId !== otherUserId);

          const topicId = await createTopic(ownerId);
          const map = await conceptMapService.createMap(ownerId, topicId, false);

          // Non-owner should get PERMISSION_DENIED
          await expect(conceptMapService.addNode(map.id, otherUserId, nodeData)).rejects.toThrow(
            ConceptMapError
          );

          try {
            await conceptMapService.addNode(map.id, otherUserId, nodeData);
          } catch (error) {
            expect(error).toBeInstanceOf(ConceptMapError);
            expect((error as ConceptMapError).code).toBe(ConceptMapErrorCode.PERMISSION_DENIED);
          }
        }),
        { numRuns: 30 }
      );
    });

    it('should allow teacher to view all maps but not edit others', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (teacherId, studentId) => {
          fc.pre(teacherId !== studentId);

          const topicId = await createTopic(teacherId);
          const studentMap = await conceptMapService.createMap(studentId, topicId, false);

          // Teacher can view student's map
          const canView = await conceptMapService.canView(studentMap.id, teacherId, 'teacher');
          expect(canView).toBe(true);

          // But teacher cannot edit student's map
          const canEdit = await conceptMapService.canEdit(studentMap.id, teacherId);
          expect(canEdit).toBe(false);
        }),
        { numRuns: 50 }
      );
    });

    it('should prevent student from viewing other students maps', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), fc.uuid(), async (teacherId, student1Id, student2Id) => {
          fc.pre(student1Id !== student2Id);

          const topicId = await createTopic(teacherId);
          const student1Map = await conceptMapService.createMap(student1Id, topicId, false);

          // Student 2 cannot view student 1's map
          const canView = await conceptMapService.canView(student1Map.id, student2Id, 'student');
          expect(canView).toBe(false);
        }),
        { numRuns: 50 }
      );
    });
  });

  // Feature: peer-concept-mapping, Property 17: Topic-based organization
  // All concept maps are organized under exactly one topic, enabling topic-centric navigation
  describe('Property 17: Topic-based organization', () => {
    it('should require topic association for map creation', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          // Creating a map without a valid topic should fail
          await expect(conceptMapService.createMap(userId, '', false)).rejects.toThrow(ConceptMapError);

          try {
            await conceptMapService.createMap(userId, '', false);
          } catch (error) {
            expect(error).toBeInstanceOf(ConceptMapError);
            expect((error as ConceptMapError).code).toBe(ConceptMapErrorCode.TOPIC_REQUIRED);
          }
        }),
        { numRuns: 20 }
      );
    });

    it('should fail when topic does not exist', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (userId, nonExistentTopicId) => {
          await expect(conceptMapService.createMap(userId, nonExistentTopicId, false)).rejects.toThrow(
            ConceptMapError
          );

          try {
            await conceptMapService.createMap(userId, nonExistentTopicId, false);
          } catch (error) {
            expect(error).toBeInstanceOf(ConceptMapError);
            expect((error as ConceptMapError).code).toBe(ConceptMapErrorCode.TOPIC_NOT_FOUND);
          }
        }),
        { numRuns: 20 }
      );
    });

    it('should group maps by topic correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 2, max: 5 }),
          fc.integer({ min: 1, max: 3 }),
          async (userId, numTopics, mapsPerTopic) => {
            const topicIds: string[] = [];

            // Create multiple topics
            for (let i = 0; i < numTopics; i++) {
              const topicId = await createTopic(userId);
              topicIds.push(topicId);

              // Create maps for each topic
              for (let j = 0; j < mapsPerTopic; j++) {
                await conceptMapService.createMap(userId, topicId, false);
              }
            }

            // Get maps grouped by topic
            const groupedMaps = await conceptMapService.getMapsByTopicGrouped(userId);

            // Verify grouping
            expect(groupedMaps.size).toBe(numTopics);

            for (const topicId of topicIds) {
              const mapsForTopic = groupedMaps.get(topicId);
              expect(mapsForTopic).toBeDefined();
              expect(mapsForTopic!.length).toBe(mapsPerTopic);

              // Verify all maps in group belong to the topic
              for (const map of mapsForTopic!) {
                expect(map.topicId).toBe(topicId);
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain topic association after updates', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), nodeDataArbitrary, async (userId, nodeData) => {
          const topicId = await createTopic(userId);
          const map = await conceptMapService.createMap(userId, topicId, false);

          // Add a node
          const updatedMap = await conceptMapService.addNode(map.id, userId, nodeData);

          // Topic association should be preserved
          expect(updatedMap.topicId).toBe(topicId);

          // Retrieve and verify
          const retrievedMap = await conceptMapService.getMap(map.id, userId);
          expect(retrievedMap.topicId).toBe(topicId);
        }),
        { numRuns: 30 }
      );
    });
  });

  // Additional tests for node/link operations
  describe('Node and Link operations', () => {
    it('should auto-apply correct style based on node type', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), nodeDataArbitrary, async (userId, nodeData) => {
          const topicId = await createTopic(userId);
          const map = await conceptMapService.createMap(userId, topicId, false);

          const updatedMap = await conceptMapService.addNode(map.id, userId, nodeData);
          const addedNode = updatedMap.nodes.find((n) => n.id === nodeData.id);

          expect(addedNode).toBeDefined();
          expect(addedNode!.style).toBeDefined();

          // Verify style matches type
          if (nodeData.type === NodeType.NOUN) {
            expect(addedNode!.style.shape).toBe(NodeShape.RECTANGLE);
          } else {
            expect(addedNode!.style.shape).toBe(NodeShape.ROUNDED_RECTANGLE);
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should remove connected links when node is removed', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          const topicId = await createTopic(userId);
          const map = await conceptMapService.createMap(userId, topicId, false);

          // Add nodes
          const node1 = {
            id: crypto.randomUUID(),
            label: 'Node 1',
            type: NodeType.NOUN as const,
            position: { x: 100, y: 100 },
          };
          const node2 = {
            id: crypto.randomUUID(),
            label: 'Node 2',
            type: NodeType.NOUN as const,
            position: { x: 200, y: 200 },
          };
          const node3 = {
            id: crypto.randomUUID(),
            label: 'Node 3',
            type: NodeType.NOUN as const,
            position: { x: 300, y: 300 },
          };

          await conceptMapService.addNode(map.id, userId, node1);
          await conceptMapService.addNode(map.id, userId, node2);
          await conceptMapService.addNode(map.id, userId, node3);

          // Add links
          const link1 = {
            id: crypto.randomUUID(),
            sourceNodeId: node1.id,
            targetNodeId: node2.id,
            relationship: 'connects to',
          };
          const link2 = {
            id: crypto.randomUUID(),
            sourceNodeId: node2.id,
            targetNodeId: node3.id,
            relationship: 'leads to',
          };

          await conceptMapService.addLink(map.id, userId, link1);
          await conceptMapService.addLink(map.id, userId, link2);

          // Remove node2 (which is connected to both links)
          const mapAfterRemoval = await conceptMapService.removeNode(map.id, userId, node2.id);

          // Both links should be removed
          expect(mapAfterRemoval.links.length).toBe(0);
          expect(mapAfterRemoval.nodes.length).toBe(2);
        }),
        { numRuns: 30 }
      );
    });
  });
});
