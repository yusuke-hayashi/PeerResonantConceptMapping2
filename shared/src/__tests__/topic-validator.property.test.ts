import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateTopicId, validateLinkRelationship } from '../validators/topic-validator';

describe('Topic Validator Property Tests', () => {
  // Feature: peer-concept-mapping, Property 4: Topic association requirement
  // For any concept map creation, the map must be associated with a valid topic ID,
  // and creation without a topic ID is rejected
  describe('Property 4: Topic association requirement', () => {
    it('should reject null or undefined topic ID', () => {
      const result1 = validateTopicId(null);
      const result2 = validateTopicId(undefined);

      expect(result1.valid).toBe(false);
      expect(result1.error).toBe('MISSING_TOPIC_ID');

      expect(result2.valid).toBe(false);
      expect(result2.error).toBe('MISSING_TOPIC_ID');
    });

    it('should reject empty string or whitespace-only topic ID', () => {
      fc.assert(
        fc.property(
          fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r')),
          (whitespaceOnly) => {
            const result = validateTopicId(whitespaceOnly);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('MISSING_TOPIC_ID');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept any non-empty topic ID with content', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          (validTopicId) => {
            const result = validateTopicId(validTopicId);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept UUID-like topic IDs', () => {
      fc.assert(
        fc.property(fc.uuid(), (uuid) => {
          const result = validateTopicId(uuid);
          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  // Feature: peer-concept-mapping, Property 3: Link relationship preservation
  // For any link creation operation, the created link contains a relationship description
  describe('Property 3: Link relationship preservation', () => {
    it('should reject null or undefined relationship', () => {
      const result1 = validateLinkRelationship(null);
      const result2 = validateLinkRelationship(undefined);

      expect(result1.valid).toBe(false);
      expect(result1.error).toBe('MISSING_LINK_RELATIONSHIP');

      expect(result2.valid).toBe(false);
      expect(result2.error).toBe('MISSING_LINK_RELATIONSHIP');
    });

    it('should reject empty string or whitespace-only relationship', () => {
      fc.assert(
        fc.property(
          fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r')),
          (whitespaceOnly) => {
            const result = validateLinkRelationship(whitespaceOnly);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('MISSING_LINK_RELATIONSHIP');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept any non-empty relationship with content up to 200 chars', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0),
          (validRelationship) => {
            const result = validateLinkRelationship(validRelationship);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject relationship longer than 200 characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 201, maxLength: 500 }),
          (longRelationship) => {
            const result = validateLinkRelationship(longRelationship);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('LINK_RELATIONSHIP_TOO_LONG');
            expect(result.details?.maxLength).toBe(200);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
