import type { ValidationResult } from './node-validator';

/**
 * Validate topic ID
 * Property 4: Topic association requirement
 * For any concept map creation, the map must be associated with a valid topic ID,
 * and creation without a topic ID is rejected
 */
export function validateTopicId(topicId: string | undefined | null): ValidationResult {
  if (!topicId || topicId.trim().length === 0) {
    return {
      valid: false,
      error: 'MISSING_TOPIC_ID',
      details: {
        message: 'Topic ID is required for concept map creation',
      },
    };
  }

  return { valid: true };
}

/**
 * Validate topic name
 */
export function validateTopicName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return {
      valid: false,
      error: 'EMPTY_TOPIC_NAME',
      details: {
        message: 'Topic name cannot be empty',
      },
    };
  }

  if (name.length > 200) {
    return {
      valid: false,
      error: 'TOPIC_NAME_TOO_LONG',
      details: {
        maxLength: 200,
        providedLength: name.length,
      },
    };
  }

  return { valid: true };
}

/**
 * Validate link relationship
 * Property 3: Link relationship preservation
 * For any link creation operation, the created link contains a relationship description
 */
export function validateLinkRelationship(relationship: string | undefined | null): ValidationResult {
  if (!relationship || relationship.trim().length === 0) {
    return {
      valid: false,
      error: 'MISSING_LINK_RELATIONSHIP',
      details: {
        message: 'Link relationship description is required',
      },
    };
  }

  if (relationship.length > 200) {
    return {
      valid: false,
      error: 'LINK_RELATIONSHIP_TOO_LONG',
      details: {
        maxLength: 200,
        providedLength: relationship.length,
      },
    };
  }

  return { valid: true };
}
