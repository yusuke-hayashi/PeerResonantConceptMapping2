import { NodeType, type Node } from '../models/concept-map';

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Valid node types
 */
const VALID_NODE_TYPES: readonly string[] = [NodeType.NOUN, NodeType.VERB];

/**
 * Validate node type
 * Property 2: Node type validation
 * For any node add operation, if the node type is not 'noun' or 'verb', the system rejects the operation
 */
export function validateNodeType(type: string): ValidationResult {
  if (!VALID_NODE_TYPES.includes(type)) {
    return {
      valid: false,
      error: 'INVALID_NODE_TYPE',
      details: {
        providedType: type,
        allowedTypes: VALID_NODE_TYPES,
      },
    };
  }

  return { valid: true };
}

/**
 * Validate node label
 */
export function validateNodeLabel(label: string): ValidationResult {
  if (!label || label.trim().length === 0) {
    return {
      valid: false,
      error: 'EMPTY_NODE_LABEL',
      details: {
        message: 'Node label cannot be empty',
      },
    };
  }

  if (label.length > 100) {
    return {
      valid: false,
      error: 'NODE_LABEL_TOO_LONG',
      details: {
        maxLength: 100,
        providedLength: label.length,
      },
    };
  }

  return { valid: true };
}

/**
 * Validate a complete node
 */
export function validateNode(node: Partial<Node>): ValidationResult {
  if (!node.type) {
    return {
      valid: false,
      error: 'MISSING_NODE_TYPE',
      details: {
        message: 'Node type is required',
      },
    };
  }

  const typeValidation = validateNodeType(node.type);
  if (!typeValidation.valid) {
    return typeValidation;
  }

  if (!node.label) {
    return {
      valid: false,
      error: 'MISSING_NODE_LABEL',
      details: {
        message: 'Node label is required',
      },
    };
  }

  const labelValidation = validateNodeLabel(node.label);
  if (!labelValidation.valid) {
    return labelValidation;
  }

  if (!node.position) {
    return {
      valid: false,
      error: 'MISSING_NODE_POSITION',
      details: {
        message: 'Node position is required',
      },
    };
  }

  return { valid: true };
}

/**
 * Check if a type string is a valid NodeType
 */
export function isValidNodeType(type: string): type is NodeType {
  return VALID_NODE_TYPES.includes(type);
}
