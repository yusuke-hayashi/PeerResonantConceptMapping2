import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createMockLLMAdapter, type LLMAdapter } from '../services/llm-adapter';
import { NodeType, NodeShape, type Node, type Link } from '@peer-resonant/shared';

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

const nodeArbitrary: fc.Arbitrary<Node> = fc.record({
  id: fc.uuid(),
  label: fc.string({ minLength: 1, maxLength: 50 }),
  type: fc.constantFrom(NodeType.NOUN, NodeType.VERB),
  position: positionArbitrary,
  style: nodeStyleArbitrary,
});

// Relationship must have at least one non-whitespace character
const validRelationshipArbitrary = fc
  .tuple(
    fc.string({ minLength: 0, maxLength: 25 }),
    fc.stringOf(fc.char().filter((c) => c.trim().length > 0), { minLength: 1, maxLength: 25 }),
    fc.string({ minLength: 0, maxLength: 25 })
  )
  .map(([prefix, core, suffix]) => `${prefix}${core}${suffix}`.slice(0, 75));

const linkArbitrary: fc.Arbitrary<Link> = fc.record({
  id: fc.uuid(),
  sourceNodeId: fc.uuid(),
  targetNodeId: fc.uuid(),
  relationship: validRelationshipArbitrary,
});

describe('LLM Adapter Property Tests', () => {
  let llmAdapter: LLMAdapter;

  beforeEach(() => {
    llmAdapter = createMockLLMAdapter();
  });

  // Feature: peer-concept-mapping, Property 13: Non-destructive vocabulary adjustment
  // Vocabulary adjustment preserves the original node labels while adding adjusted versions,
  // never replacing or losing original data
  describe('Property 13: Non-destructive vocabulary adjustment', () => {
    it('should preserve original labels when adjusting vocabulary', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1, maxLength: 50 }), async (label) => {
          const result = await llmAdapter.adjustLabel(label);

          // Original label must be preserved
          expect(result.originalLabel).toBe(label);

          // Result must have an adjusted label (even if same as original)
          expect(result.adjustedLabel).toBeDefined();
          expect(typeof result.adjustedLabel).toBe('string');
          expect(result.adjustedLabel.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve all original node labels when adjusting map vocabulary', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(nodeArbitrary, { minLength: 1, maxLength: 10 }),
          fc.array(linkArbitrary, { minLength: 0, maxLength: 15 }),
          async (nodes, links) => {
            const result = await llmAdapter.adjustMapVocabulary(nodes, links);

            // All original nodes must be represented in the result
            expect(result.nodes.length).toBe(nodes.length);

            // Each node's original label must be preserved
            for (const node of nodes) {
              const adjustment = result.nodes.find((n) => n.nodeId === node.id);
              expect(adjustment).toBeDefined();
              expect(adjustment!.originalLabel).toBe(node.label);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should preserve all original link relationships when adjusting map vocabulary', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(nodeArbitrary, { minLength: 1, maxLength: 5 }),
          fc.array(linkArbitrary, { minLength: 1, maxLength: 10 }),
          async (nodes, links) => {
            const result = await llmAdapter.adjustMapVocabulary(nodes, links);

            // All original links must be represented in the result
            expect(result.links.length).toBe(links.length);

            // Each link's original relationship must be preserved
            for (const link of links) {
              const adjustment = result.links.find((l) => l.linkId === link.id);
              expect(adjustment).toBeDefined();
              expect(adjustment!.originalRelationship).toBe(link.relationship);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should provide confidence scores for all adjustments', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(nodeArbitrary, { minLength: 1, maxLength: 10 }),
          fc.array(linkArbitrary, { minLength: 0, maxLength: 10 }),
          async (nodes, links) => {
            const result = await llmAdapter.adjustMapVocabulary(nodes, links);

            // All node adjustments must have valid confidence scores
            for (const nodeAdj of result.nodes) {
              expect(nodeAdj.confidence).toBeGreaterThanOrEqual(0);
              expect(nodeAdj.confidence).toBeLessThanOrEqual(1);
            }

            // All link adjustments must have valid confidence scores
            for (const linkAdj of result.links) {
              expect(linkAdj.confidence).toBeGreaterThanOrEqual(0);
              expect(linkAdj.confidence).toBeLessThanOrEqual(1);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should never return empty adjusted labels', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1, maxLength: 100 }), async (label) => {
          const result = await llmAdapter.adjustLabel(label);

          // Adjusted label must never be empty
          expect(result.adjustedLabel.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle reference vocabulary without losing student map data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(nodeArbitrary, { minLength: 1, maxLength: 5 }),
          fc.array(linkArbitrary, { minLength: 0, maxLength: 5 }),
          fc.array(nodeArbitrary, { minLength: 1, maxLength: 5 }),
          fc.array(linkArbitrary, { minLength: 0, maxLength: 5 }),
          async (studentNodes, studentLinks, referenceNodes, referenceLinks) => {
            const result = await llmAdapter.adjustMapVocabulary(
              studentNodes,
              studentLinks,
              referenceNodes,
              referenceLinks
            );

            // All student nodes must still be present
            expect(result.nodes.length).toBe(studentNodes.length);

            // All student links must still be present
            expect(result.links.length).toBe(studentLinks.length);

            // Original data must be preserved
            for (const node of studentNodes) {
              const adjustment = result.nodes.find((n) => n.nodeId === node.id);
              expect(adjustment).toBeDefined();
              expect(adjustment!.originalLabel).toBe(node.label);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('LLM availability', () => {
    it('mock adapter should always be available', async () => {
      const isAvailable = await llmAdapter.isAvailable();
      expect(isAvailable).toBe(true);
    });
  });

  describe('Adjustment consistency', () => {
    it('should return consistent adjustments for identical inputs', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1, maxLength: 50 }), async (label) => {
          const result1 = await llmAdapter.adjustLabel(label);
          const result2 = await llmAdapter.adjustLabel(label);

          // Same input should produce same output (deterministic)
          expect(result1.adjustedLabel).toBe(result2.adjustedLabel);
          expect(result1.confidence).toBe(result2.confidence);
        }),
        { numRuns: 50 }
      );
    });
  });
});
