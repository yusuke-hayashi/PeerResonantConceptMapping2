import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { createMockFirestoreService, type FirestoreService } from '../services/firestore-service';
import { NodeType, NodeShape } from '@peer-resonant/shared';

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

const nodeArbitrary = fc.record({
  id: fc.uuid(),
  label: fc.string({ minLength: 1, maxLength: 50 }),
  type: fc.constantFrom(NodeType.NOUN, NodeType.VERB),
  position: positionArbitrary,
  style: nodeStyleArbitrary,
});

const linkArbitrary = fc.record({
  id: fc.uuid(),
  sourceNodeId: fc.uuid(),
  targetNodeId: fc.uuid(),
  relationship: fc.string({ minLength: 1, maxLength: 100 }),
});

const conceptMapDataArbitrary = fc.record({
  topicId: fc.uuid(),
  ownerId: fc.uuid(),
  isReference: fc.boolean(),
  nodes: fc.array(nodeArbitrary, { minLength: 0, maxLength: 10 }),
  links: fc.array(linkArbitrary, { minLength: 0, maxLength: 15 }),
});

describe('Firestore Service Property Tests', () => {
  let firestoreService: FirestoreService;

  beforeEach(() => {
    firestoreService = createMockFirestoreService();
  });

  // Feature: peer-concept-mapping, Property 1: Concept map persistence round-trip
  // For any concept map, when saved and then retrieved, it returns an equivalent map
  // containing all nodes, links, and metadata
  describe('Property 1: Concept map persistence round-trip', () => {
    it('should preserve all concept map data after save and retrieve', async () => {
      await fc.assert(
        fc.asyncProperty(conceptMapDataArbitrary, async (mapData) => {
          // Create and save
          const savedMap = await firestoreService.createConceptMap(mapData);

          // Retrieve
          const retrievedMap = await firestoreService.getConceptMap(savedMap.id);

          // Verify
          expect(retrievedMap).not.toBeNull();
          expect(retrievedMap!.topicId).toBe(mapData.topicId);
          expect(retrievedMap!.ownerId).toBe(mapData.ownerId);
          expect(retrievedMap!.isReference).toBe(mapData.isReference);
          expect(retrievedMap!.nodes).toEqual(mapData.nodes);
          expect(retrievedMap!.links).toEqual(mapData.links);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve node data exactly after round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(nodeArbitrary, { minLength: 1, maxLength: 20 }),
          fc.uuid(),
          fc.uuid(),
          async (nodes, topicId, ownerId) => {
            const mapData = {
              topicId,
              ownerId,
              isReference: false,
              nodes,
              links: [],
            };

            const savedMap = await firestoreService.createConceptMap(mapData);
            const retrievedMap = await firestoreService.getConceptMap(savedMap.id);

            expect(retrievedMap!.nodes.length).toBe(nodes.length);
            for (let i = 0; i < nodes.length; i++) {
              expect(retrievedMap!.nodes[i].id).toBe(nodes[i].id);
              expect(retrievedMap!.nodes[i].label).toBe(nodes[i].label);
              expect(retrievedMap!.nodes[i].type).toBe(nodes[i].type);
              expect(retrievedMap!.nodes[i].position).toEqual(nodes[i].position);
              expect(retrievedMap!.nodes[i].style).toEqual(nodes[i].style);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve link data exactly after round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(linkArbitrary, { minLength: 1, maxLength: 30 }),
          fc.uuid(),
          fc.uuid(),
          async (links, topicId, ownerId) => {
            const mapData = {
              topicId,
              ownerId,
              isReference: false,
              nodes: [],
              links,
            };

            const savedMap = await firestoreService.createConceptMap(mapData);
            const retrievedMap = await firestoreService.getConceptMap(savedMap.id);

            expect(retrievedMap!.links.length).toBe(links.length);
            for (let i = 0; i < links.length; i++) {
              expect(retrievedMap!.links[i].id).toBe(links[i].id);
              expect(retrievedMap!.links[i].sourceNodeId).toBe(links[i].sourceNodeId);
              expect(retrievedMap!.links[i].targetNodeId).toBe(links[i].targetNodeId);
              expect(retrievedMap!.links[i].relationship).toBe(links[i].relationship);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain data integrity after update', async () => {
      await fc.assert(
        fc.asyncProperty(
          conceptMapDataArbitrary,
          fc.array(nodeArbitrary, { minLength: 1, maxLength: 5 }),
          async (originalData, newNodes) => {
            // Create original
            const savedMap = await firestoreService.createConceptMap(originalData);

            // Update with new nodes
            const updatedMap = await firestoreService.updateConceptMap(savedMap.id, {
              nodes: newNodes,
            });

            // Retrieve and verify
            const retrievedMap = await firestoreService.getConceptMap(savedMap.id);

            expect(retrievedMap!.nodes).toEqual(newNodes);
            // Original links should be preserved
            expect(retrievedMap!.links).toEqual(originalData.links);
            // Topic and owner should be preserved
            expect(retrievedMap!.topicId).toBe(originalData.topicId);
            expect(retrievedMap!.ownerId).toBe(originalData.ownerId);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Topic filtering', () => {
    it('should correctly filter concept maps by topic', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          async (targetTopicId, ownerId, otherTopicIds) => {
            // Create maps for target topic
            const targetMapsCount = 3;
            for (let i = 0; i < targetMapsCount; i++) {
              await firestoreService.createConceptMap({
                topicId: targetTopicId,
                ownerId,
                isReference: false,
                nodes: [],
                links: [],
              });
            }

            // Create maps for other topics
            for (const otherTopicId of otherTopicIds) {
              await firestoreService.createConceptMap({
                topicId: otherTopicId,
                ownerId,
                isReference: false,
                nodes: [],
                links: [],
              });
            }

            // Filter by target topic
            const filteredMaps = await firestoreService.getConceptMapsByTopic(targetTopicId);

            // All returned maps should have the target topic
            expect(filteredMaps.length).toBe(targetMapsCount);
            for (const map of filteredMaps) {
              expect(map.topicId).toBe(targetTopicId);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Owner filtering', () => {
    it('should correctly filter concept maps by owner', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          async (topicId, targetOwnerId, otherOwnerIds) => {
            // Create maps for target owner
            const targetMapsCount = 2;
            for (let i = 0; i < targetMapsCount; i++) {
              await firestoreService.createConceptMap({
                topicId,
                ownerId: targetOwnerId,
                isReference: false,
                nodes: [],
                links: [],
              });
            }

            // Create maps for other owners
            for (const otherOwnerId of otherOwnerIds) {
              await firestoreService.createConceptMap({
                topicId,
                ownerId: otherOwnerId,
                isReference: false,
                nodes: [],
                links: [],
              });
            }

            // Filter by target owner
            const filteredMaps = await firestoreService.getConceptMapsByOwner(targetOwnerId);

            // All returned maps should have the target owner
            expect(filteredMaps.length).toBe(targetMapsCount);
            for (const map of filteredMaps) {
              expect(map.ownerId).toBe(targetOwnerId);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
