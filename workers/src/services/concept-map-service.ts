import type {
  ConceptMap,
  Node,
  Link,
  MapUpdates,
  UserRole,
} from '@peer-resonant/shared';
import {
  validateNode,
  validateTopicId,
  validateLinkRelationship,
  type ValidationResult,
} from '@peer-resonant/shared';
import { getDefaultNodeStyle } from '@peer-resonant/shared';
import type { FirestoreService } from './firestore-service';

/**
 * Concept map service error codes
 */
export const ConceptMapErrorCode = {
  TOPIC_REQUIRED: 'TOPIC_REQUIRED',
  TOPIC_NOT_FOUND: 'TOPIC_NOT_FOUND',
  MAP_NOT_FOUND: 'MAP_NOT_FOUND',
  NODE_NOT_FOUND: 'NODE_NOT_FOUND',
  LINK_NOT_FOUND: 'LINK_NOT_FOUND',
  INVALID_NODE: 'INVALID_NODE',
  INVALID_LINK: 'INVALID_LINK',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

export type ConceptMapErrorCode = (typeof ConceptMapErrorCode)[keyof typeof ConceptMapErrorCode];

/**
 * Concept map service error
 */
export class ConceptMapError extends Error {
  constructor(
    public readonly code: ConceptMapErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ConceptMapError';
  }
}

/**
 * Concept map service interface
 */
export interface ConceptMapService {
  // Create
  createMap(userId: string, topicId: string, isReference: boolean): Promise<ConceptMap>;

  // Read
  getMap(mapId: string, userId: string): Promise<ConceptMap>;
  getMapsByTopic(topicId: string, userId: string, role: UserRole): Promise<ConceptMap[]>;
  getMapsByUser(userId: string): Promise<ConceptMap[]>;
  getMapsByTopicGrouped(userId: string): Promise<Map<string, ConceptMap[]>>;

  // Update
  updateMap(mapId: string, userId: string, updates: MapUpdates): Promise<ConceptMap>;
  addNode(mapId: string, userId: string, node: Omit<Node, 'style'>): Promise<ConceptMap>;
  addLink(mapId: string, userId: string, link: Link): Promise<ConceptMap>;
  removeNode(mapId: string, userId: string, nodeId: string): Promise<ConceptMap>;
  removeLink(mapId: string, userId: string, linkId: string): Promise<ConceptMap>;

  // Delete
  deleteMap(mapId: string, userId: string): Promise<void>;

  // Permission checks
  canEdit(mapId: string, userId: string): Promise<boolean>;
  canView(mapId: string, userId: string, role: UserRole): Promise<boolean>;
}

/**
 * Create concept map service
 */
export function createConceptMapService(
  firestoreService: FirestoreService
): ConceptMapService {
  /**
   * Verify user can edit the map (owner only)
   * Property 11: Owner-based access control
   */
  async function verifyEditPermission(mapId: string, userId: string): Promise<ConceptMap> {
    const map = await firestoreService.getConceptMap(mapId);
    if (!map) {
      throw new ConceptMapError(
        ConceptMapErrorCode.MAP_NOT_FOUND,
        `Concept map not found: ${mapId}`
      );
    }

    if (map.ownerId !== userId) {
      throw new ConceptMapError(
        ConceptMapErrorCode.PERMISSION_DENIED,
        'You do not have permission to edit this map'
      );
    }

    return map;
  }

  /**
   * Verify user can view the map
   * Property 11: Owner-based access control
   */
  async function verifyViewPermission(
    mapId: string,
    userId: string,
    role: UserRole
  ): Promise<ConceptMap> {
    const map = await firestoreService.getConceptMap(mapId);
    if (!map) {
      throw new ConceptMapError(
        ConceptMapErrorCode.MAP_NOT_FOUND,
        `Concept map not found: ${mapId}`
      );
    }

    // Teachers can view all maps
    if (role === 'teacher') {
      return map;
    }

    // Students can only view their own maps
    if (map.ownerId !== userId) {
      throw new ConceptMapError(
        ConceptMapErrorCode.PERMISSION_DENIED,
        'You do not have permission to view this map'
      );
    }

    return map;
  }

  return {
    /**
     * Create a new concept map
     * Property 4: Topic association requirement
     * Property 5: Reference map marking
     */
    async createMap(userId: string, topicId: string, isReference: boolean): Promise<ConceptMap> {
      // Validate topic ID
      const topicValidation = validateTopicId(topicId);
      if (!topicValidation.valid) {
        throw new ConceptMapError(
          ConceptMapErrorCode.TOPIC_REQUIRED,
          'Topic ID is required',
          topicValidation.details
        );
      }

      // Verify topic exists
      const topic = await firestoreService.getTopic(topicId);
      if (!topic) {
        throw new ConceptMapError(
          ConceptMapErrorCode.TOPIC_NOT_FOUND,
          `Topic not found: ${topicId}`
        );
      }

      // Create map
      return firestoreService.createConceptMap({
        topicId,
        ownerId: userId,
        isReference,
        nodes: [],
        links: [],
      });
    },

    /**
     * Get a single map
     */
    async getMap(mapId: string, userId: string): Promise<ConceptMap> {
      const map = await firestoreService.getConceptMap(mapId);
      if (!map) {
        throw new ConceptMapError(
          ConceptMapErrorCode.MAP_NOT_FOUND,
          `Concept map not found: ${mapId}`
        );
      }
      return map;
    },

    /**
     * Get maps by topic with role-based filtering
     * Property 11: Owner-based access control
     */
    async getMapsByTopic(topicId: string, userId: string, role: UserRole): Promise<ConceptMap[]> {
      const allMaps = await firestoreService.getConceptMapsByTopic(topicId);

      // Teachers can see all maps
      if (role === 'teacher') {
        return allMaps;
      }

      // Students can only see their own maps
      return allMaps.filter((map) => map.ownerId === userId);
    },

    /**
     * Get all maps owned by user
     */
    async getMapsByUser(userId: string): Promise<ConceptMap[]> {
      return firestoreService.getConceptMapsByOwner(userId);
    },

    /**
     * Get maps grouped by topic
     * Property 17: Topic-based organization
     */
    async getMapsByTopicGrouped(userId: string): Promise<Map<string, ConceptMap[]>> {
      const maps = await firestoreService.getConceptMapsByOwner(userId);
      const grouped = new Map<string, ConceptMap[]>();

      for (const map of maps) {
        const existing = grouped.get(map.topicId) ?? [];
        existing.push(map);
        grouped.set(map.topicId, existing);
      }

      return grouped;
    },

    /**
     * Update map
     */
    async updateMap(mapId: string, userId: string, updates: MapUpdates): Promise<ConceptMap> {
      await verifyEditPermission(mapId, userId);
      return firestoreService.updateConceptMap(mapId, updates);
    },

    /**
     * Add node to map
     * Property 2: Node type validation (via validateNode)
     */
    async addNode(mapId: string, userId: string, nodeData: Omit<Node, 'style'>): Promise<ConceptMap> {
      const map = await verifyEditPermission(mapId, userId);

      // Create node with auto-applied style based on type
      const node: Node = {
        ...nodeData,
        style: getDefaultNodeStyle(nodeData.type),
      };

      // Validate node
      const validation = validateNode(node);
      if (!validation.valid) {
        throw new ConceptMapError(
          ConceptMapErrorCode.INVALID_NODE,
          validation.error ?? 'Invalid node',
          validation.details
        );
      }

      // Add node to map
      const updatedNodes = [...map.nodes, node];
      return firestoreService.updateConceptMap(mapId, { nodes: updatedNodes });
    },

    /**
     * Add link to map
     * Property 3: Link relationship preservation
     */
    async addLink(mapId: string, userId: string, link: Link): Promise<ConceptMap> {
      const map = await verifyEditPermission(mapId, userId);

      // Validate relationship
      const validation = validateLinkRelationship(link.relationship);
      if (!validation.valid) {
        throw new ConceptMapError(
          ConceptMapErrorCode.INVALID_LINK,
          validation.error ?? 'Invalid link',
          validation.details
        );
      }

      // Verify source and target nodes exist
      const sourceExists = map.nodes.some((n) => n.id === link.sourceNodeId);
      const targetExists = map.nodes.some((n) => n.id === link.targetNodeId);

      if (!sourceExists || !targetExists) {
        throw new ConceptMapError(
          ConceptMapErrorCode.NODE_NOT_FOUND,
          'Source or target node not found',
          { sourceNodeId: link.sourceNodeId, targetNodeId: link.targetNodeId }
        );
      }

      // Add link to map
      const updatedLinks = [...map.links, link];
      return firestoreService.updateConceptMap(mapId, { links: updatedLinks });
    },

    /**
     * Remove node from map (also removes connected links)
     */
    async removeNode(mapId: string, userId: string, nodeId: string): Promise<ConceptMap> {
      const map = await verifyEditPermission(mapId, userId);

      const nodeExists = map.nodes.some((n) => n.id === nodeId);
      if (!nodeExists) {
        throw new ConceptMapError(
          ConceptMapErrorCode.NODE_NOT_FOUND,
          `Node not found: ${nodeId}`
        );
      }

      // Remove node and connected links
      const updatedNodes = map.nodes.filter((n) => n.id !== nodeId);
      const updatedLinks = map.links.filter(
        (l) => l.sourceNodeId !== nodeId && l.targetNodeId !== nodeId
      );

      return firestoreService.updateConceptMap(mapId, {
        nodes: updatedNodes,
        links: updatedLinks,
      });
    },

    /**
     * Remove link from map
     */
    async removeLink(mapId: string, userId: string, linkId: string): Promise<ConceptMap> {
      const map = await verifyEditPermission(mapId, userId);

      const linkExists = map.links.some((l) => l.id === linkId);
      if (!linkExists) {
        throw new ConceptMapError(
          ConceptMapErrorCode.LINK_NOT_FOUND,
          `Link not found: ${linkId}`
        );
      }

      const updatedLinks = map.links.filter((l) => l.id !== linkId);
      return firestoreService.updateConceptMap(mapId, { links: updatedLinks });
    },

    /**
     * Delete map
     */
    async deleteMap(mapId: string, userId: string): Promise<void> {
      await verifyEditPermission(mapId, userId);
      await firestoreService.deleteConceptMap(mapId);
    },

    /**
     * Check if user can edit map
     */
    async canEdit(mapId: string, userId: string): Promise<boolean> {
      const map = await firestoreService.getConceptMap(mapId);
      return map !== null && map.ownerId === userId;
    },

    /**
     * Check if user can view map
     */
    async canView(mapId: string, userId: string, role: UserRole): Promise<boolean> {
      const map = await firestoreService.getConceptMap(mapId);
      if (!map) {
        return false;
      }

      // Teachers can view all maps
      if (role === 'teacher') {
        return true;
      }

      // Students can only view their own maps
      return map.ownerId === userId;
    },
  };
}
