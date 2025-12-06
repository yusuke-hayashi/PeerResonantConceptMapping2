import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateNodeType, isValidNodeType } from '../validators/node-validator';
import { NodeType } from '../models/concept-map';

describe('Node Validator Property Tests', () => {
  // Feature: peer-concept-mapping, Property 2: Node type validation
  // For any node add operation, if the node type is not 'noun' or 'verb', the system rejects the operation
  describe('Property 2: Node type validation', () => {
    it('should accept only noun and verb as valid node types', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(NodeType.NOUN, NodeType.VERB),
          (validType) => {
            const result = validateNodeType(validType);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject any string that is not noun or verb', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => s !== NodeType.NOUN && s !== NodeType.VERB),
          (invalidType) => {
            const result = validateNodeType(invalidType);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('INVALID_NODE_TYPE');
            expect(result.details?.providedType).toBe(invalidType);
            expect(result.details?.allowedTypes).toContain(NodeType.NOUN);
            expect(result.details?.allowedTypes).toContain(NodeType.VERB);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isValidNodeType should return true only for noun and verb', () => {
      fc.assert(
        fc.property(fc.string(), (type) => {
          const isValid = isValidNodeType(type);
          const expectedValid = type === NodeType.NOUN || type === NodeType.VERB;
          expect(isValid).toBe(expectedValid);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases like empty string, whitespace, and special characters', () => {
      const edgeCases = ['', ' ', '\t', '\n', 'NOUN', 'VERB', 'Noun', 'Verb', 'noun ', ' verb'];
      for (const edgeCase of edgeCases) {
        const result = validateNodeType(edgeCase);
        // 'noun' と 'verb' のみがvalidであるべき
        const shouldBeValid = edgeCase === NodeType.NOUN || edgeCase === NodeType.VERB;
        expect(result.valid).toBe(shouldBeValid);
      }
    });
  });
});
