import type { ConceptMap, User, Topic, Comparison, ComparisonPermission } from '@peer-resonant/shared';

/**
 * Firestore collection names
 */
export const Collections = {
  USERS: 'users',
  TOPICS: 'topics',
  CONCEPT_MAPS: 'concept_maps',
  COMPARISONS: 'comparisons',
  COMPARISON_PERMISSIONS: 'comparison_permissions',
} as const;

/**
 * Firestore service interface
 */
export interface FirestoreService {
  // User operations
  getUser(userId: string): Promise<User | null>;
  createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  updateUser(userId: string, updates: Partial<User>): Promise<User>;

  // Topic operations
  getTopic(topicId: string): Promise<Topic | null>;
  getTopics(): Promise<Topic[]>;
  getTopicsByCreator(creatorId: string): Promise<Topic[]>;
  createTopic(topic: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>): Promise<Topic>;
  updateTopic(topicId: string, updates: Partial<Topic>): Promise<Topic>;
  deleteTopic(topicId: string): Promise<void>;

  // ConceptMap operations
  getConceptMap(mapId: string): Promise<ConceptMap | null>;
  getConceptMapsByTopic(topicId: string): Promise<ConceptMap[]>;
  getConceptMapsByOwner(ownerId: string): Promise<ConceptMap[]>;
  getConceptMapsByTopicAndOwner(topicId: string, ownerId: string): Promise<ConceptMap[]>;
  getReferenceMapsByTopic(topicId: string): Promise<ConceptMap[]>;
  createConceptMap(map: Omit<ConceptMap, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConceptMap>;
  updateConceptMap(mapId: string, updates: Partial<ConceptMap>): Promise<ConceptMap>;
  deleteConceptMap(mapId: string): Promise<void>;

  // Comparison operations
  getComparison(comparisonId: string): Promise<Comparison | null>;
  getComparisonsByTopic(topicId: string): Promise<Comparison[]>;
  getComparisonsByCreator(creatorId: string): Promise<Comparison[]>;
  createComparison(comparison: Omit<Comparison, 'id' | 'createdAt'>): Promise<Comparison>;

  // Permission operations
  getPermission(comparisonId: string, studentId: string): Promise<ComparisonPermission | null>;
  getPermissionsByComparison(comparisonId: string): Promise<ComparisonPermission[]>;
  getPermissionsByStudent(studentId: string): Promise<ComparisonPermission[]>;
  createPermission(permission: Omit<ComparisonPermission, 'id'>): Promise<ComparisonPermission>;
  deletePermission(comparisonId: string, studentId: string): Promise<void>;
}

/**
 * Mock Firestore implementation for development/testing
 * Note: In production, use actual Firebase Admin SDK
 */
export function createMockFirestoreService(): FirestoreService {
  const users = new Map<string, User>();
  const topics = new Map<string, Topic>();
  const conceptMaps = new Map<string, ConceptMap>();
  const comparisons = new Map<string, Comparison>();
  const permissions = new Map<string, ComparisonPermission>();

  function generateId(): string {
    return crypto.randomUUID();
  }

  return {
    // User operations
    async getUser(userId: string): Promise<User | null> {
      return users.get(userId) ?? null;
    },

    async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
      const now = new Date();
      const user: User = {
        ...userData,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      users.set(user.id, user);
      return user;
    },

    async updateUser(userId: string, updates: Partial<User>): Promise<User> {
      const existing = users.get(userId);
      if (!existing) {
        throw new Error(`User not found: ${userId}`);
      }
      const updated: User = {
        ...existing,
        ...updates,
        id: existing.id,
        updatedAt: new Date(),
      };
      users.set(userId, updated);
      return updated;
    },

    // Topic operations
    async getTopic(topicId: string): Promise<Topic | null> {
      return topics.get(topicId) ?? null;
    },

    async getTopics(): Promise<Topic[]> {
      return Array.from(topics.values());
    },

    async getTopicsByCreator(creatorId: string): Promise<Topic[]> {
      return Array.from(topics.values()).filter((t) => t.createdBy === creatorId);
    },

    async createTopic(topicData: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>): Promise<Topic> {
      const now = new Date();
      const topic: Topic = {
        ...topicData,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      topics.set(topic.id, topic);
      return topic;
    },

    async updateTopic(topicId: string, updates: Partial<Topic>): Promise<Topic> {
      const existing = topics.get(topicId);
      if (!existing) {
        throw new Error(`Topic not found: ${topicId}`);
      }
      const updated: Topic = {
        ...existing,
        ...updates,
        id: existing.id,
        updatedAt: new Date(),
      };
      topics.set(topicId, updated);
      return updated;
    },

    async deleteTopic(topicId: string): Promise<void> {
      topics.delete(topicId);
    },

    // ConceptMap operations
    async getConceptMap(mapId: string): Promise<ConceptMap | null> {
      return conceptMaps.get(mapId) ?? null;
    },

    async getConceptMapsByTopic(topicId: string): Promise<ConceptMap[]> {
      return Array.from(conceptMaps.values()).filter((m) => m.topicId === topicId);
    },

    async getConceptMapsByOwner(ownerId: string): Promise<ConceptMap[]> {
      return Array.from(conceptMaps.values()).filter((m) => m.ownerId === ownerId);
    },

    async getConceptMapsByTopicAndOwner(topicId: string, ownerId: string): Promise<ConceptMap[]> {
      return Array.from(conceptMaps.values()).filter(
        (m) => m.topicId === topicId && m.ownerId === ownerId
      );
    },

    async getReferenceMapsByTopic(topicId: string): Promise<ConceptMap[]> {
      return Array.from(conceptMaps.values()).filter(
        (m) => m.topicId === topicId && m.isReference
      );
    },

    async createConceptMap(
      mapData: Omit<ConceptMap, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<ConceptMap> {
      const now = new Date();
      const map: ConceptMap = {
        ...mapData,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      conceptMaps.set(map.id, map);
      return map;
    },

    async updateConceptMap(mapId: string, updates: Partial<ConceptMap>): Promise<ConceptMap> {
      const existing = conceptMaps.get(mapId);
      if (!existing) {
        throw new Error(`ConceptMap not found: ${mapId}`);
      }
      const updated: ConceptMap = {
        ...existing,
        ...updates,
        id: existing.id,
        updatedAt: new Date(),
      };
      conceptMaps.set(mapId, updated);
      return updated;
    },

    async deleteConceptMap(mapId: string): Promise<void> {
      conceptMaps.delete(mapId);
    },

    // Comparison operations
    async getComparison(comparisonId: string): Promise<Comparison | null> {
      return comparisons.get(comparisonId) ?? null;
    },

    async getComparisonsByTopic(topicId: string): Promise<Comparison[]> {
      return Array.from(comparisons.values()).filter((c) => c.topicId === topicId);
    },

    async getComparisonsByCreator(creatorId: string): Promise<Comparison[]> {
      return Array.from(comparisons.values()).filter((c) => c.createdBy === creatorId);
    },

    async createComparison(
      comparisonData: Omit<Comparison, 'id' | 'createdAt'>
    ): Promise<Comparison> {
      const comparison: Comparison = {
        ...comparisonData,
        id: generateId(),
        createdAt: new Date(),
      };
      comparisons.set(comparison.id, comparison);
      return comparison;
    },

    // Permission operations
    async getPermission(
      comparisonId: string,
      studentId: string
    ): Promise<ComparisonPermission | null> {
      const key = `${comparisonId}:${studentId}`;
      return permissions.get(key) ?? null;
    },

    async getPermissionsByComparison(comparisonId: string): Promise<ComparisonPermission[]> {
      return Array.from(permissions.values()).filter((p) => p.comparisonId === comparisonId);
    },

    async getPermissionsByStudent(studentId: string): Promise<ComparisonPermission[]> {
      return Array.from(permissions.values()).filter((p) => p.studentId === studentId);
    },

    async createPermission(
      permissionData: Omit<ComparisonPermission, 'id'>
    ): Promise<ComparisonPermission> {
      const permission: ComparisonPermission = {
        ...permissionData,
        id: generateId(),
      };
      const key = `${permission.comparisonId}:${permission.studentId}`;
      permissions.set(key, permission);
      return permission;
    },

    async deletePermission(comparisonId: string, studentId: string): Promise<void> {
      const key = `${comparisonId}:${studentId}`;
      permissions.delete(key);
    },
  };
}
