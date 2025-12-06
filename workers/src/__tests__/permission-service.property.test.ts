import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { createMockFirestoreService, type FirestoreService } from '../services/firestore-service';
import {
  createPermissionService,
  PermissionError,
  PermissionErrorCode,
  type PermissionService,
} from '../services/permission-service';
import { ComparisonMode } from '@peer-resonant/shared';

describe('Permission Service Property Tests', () => {
  let firestoreService: FirestoreService;
  let permissionService: PermissionService;

  beforeEach(() => {
    firestoreService = createMockFirestoreService();
    permissionService = createPermissionService(firestoreService);
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
   * Helper function to create a comparison
   */
  async function createComparison(teacherId: string, topicId: string): Promise<string> {
    const comparison = await firestoreService.createComparison({
      topicId,
      createdBy: teacherId,
      mode: ComparisonMode.ONE_TO_ONE,
      mapIds: [],
      results: [],
    });
    return comparison.id;
  }

  // Feature: peer-concept-mapping, Property 9: Comparison default privacy
  // Comparisons are private by default; students cannot view unless explicitly permitted
  describe('Property 9: Comparison default privacy', () => {
    it('new comparisons should not be viewable by students by default', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (teacherId, studentId) => {
          fc.pre(teacherId !== studentId);

          const topicId = await createTopic(teacherId);
          const comparisonId = await createComparison(teacherId, topicId);

          // Student should not be able to view the comparison by default
          const canView = await permissionService.canViewComparison(
            comparisonId,
            studentId,
            'student'
          );

          expect(canView).toBe(false);
        }),
        { numRuns: 50 }
      );
    });

    it('comparison creator can always view their comparison', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (teacherId) => {
          const topicId = await createTopic(teacherId);
          const comparisonId = await createComparison(teacherId, topicId);

          // Creator should always be able to view
          const canView = await permissionService.canViewComparison(
            comparisonId,
            teacherId,
            'teacher'
          );

          expect(canView).toBe(true);
        }),
        { numRuns: 50 }
      );
    });

    it('teachers can view all comparisons', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (teacher1Id, teacher2Id) => {
          fc.pre(teacher1Id !== teacher2Id);

          const topicId = await createTopic(teacher1Id);
          const comparisonId = await createComparison(teacher1Id, topicId);

          // Another teacher should be able to view
          const canView = await permissionService.canViewComparison(
            comparisonId,
            teacher2Id,
            'teacher'
          );

          expect(canView).toBe(true);
        }),
        { numRuns: 50 }
      );
    });
  });

  // Feature: peer-concept-mapping, Property 10: Permission round-trip
  // Granting view permission to a student and then checking canView returns true;
  // revoking and checking returns false
  describe('Property 10: Permission round-trip', () => {
    it('granting permission should allow student to view comparison', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (teacherId, studentId) => {
          fc.pre(teacherId !== studentId);

          const topicId = await createTopic(teacherId);
          const comparisonId = await createComparison(teacherId, topicId);

          // Initially, student cannot view
          const canViewBefore = await permissionService.canViewComparison(
            comparisonId,
            studentId,
            'student'
          );
          expect(canViewBefore).toBe(false);

          // Grant permission
          await permissionService.grantViewPermission(comparisonId, studentId, teacherId);

          // Now student can view
          const canViewAfter = await permissionService.canViewComparison(
            comparisonId,
            studentId,
            'student'
          );
          expect(canViewAfter).toBe(true);
        }),
        { numRuns: 50 }
      );
    });

    it('revoking permission should deny student view access', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (teacherId, studentId) => {
          fc.pre(teacherId !== studentId);

          const topicId = await createTopic(teacherId);
          const comparisonId = await createComparison(teacherId, topicId);

          // Grant permission
          await permissionService.grantViewPermission(comparisonId, studentId, teacherId);

          // Student can view
          const canViewAfterGrant = await permissionService.canViewComparison(
            comparisonId,
            studentId,
            'student'
          );
          expect(canViewAfterGrant).toBe(true);

          // Revoke permission
          await permissionService.revokeViewPermission(comparisonId, studentId, teacherId);

          // Student can no longer view
          const canViewAfterRevoke = await permissionService.canViewComparison(
            comparisonId,
            studentId,
            'student'
          );
          expect(canViewAfterRevoke).toBe(false);
        }),
        { numRuns: 50 }
      );
    });

    it('granting permission is idempotent', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (teacherId, studentId) => {
          fc.pre(teacherId !== studentId);

          const topicId = await createTopic(teacherId);
          const comparisonId = await createComparison(teacherId, topicId);

          // Grant permission multiple times
          const permission1 = await permissionService.grantViewPermission(
            comparisonId,
            studentId,
            teacherId
          );
          const permission2 = await permissionService.grantViewPermission(
            comparisonId,
            studentId,
            teacherId
          );

          // Should return the same permission
          expect(permission1.id).toBe(permission2.id);
          expect(permission1.comparisonId).toBe(permission2.comparisonId);
          expect(permission1.studentId).toBe(permission2.studentId);

          // Student can still view
          const canView = await permissionService.canViewComparison(
            comparisonId,
            studentId,
            'student'
          );
          expect(canView).toBe(true);
        }),
        { numRuns: 30 }
      );
    });

    it('revoking permission is idempotent', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (teacherId, studentId) => {
          fc.pre(teacherId !== studentId);

          const topicId = await createTopic(teacherId);
          const comparisonId = await createComparison(teacherId, topicId);

          // Grant then revoke multiple times
          await permissionService.grantViewPermission(comparisonId, studentId, teacherId);
          await permissionService.revokeViewPermission(comparisonId, studentId, teacherId);
          await permissionService.revokeViewPermission(comparisonId, studentId, teacherId);

          // Student should not be able to view
          const canView = await permissionService.canViewComparison(
            comparisonId,
            studentId,
            'student'
          );
          expect(canView).toBe(false);
        }),
        { numRuns: 30 }
      );
    });
  });

  describe('Permission management authorization', () => {
    it('only comparison creator can grant permissions', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), fc.uuid(), async (teacher1Id, teacher2Id, studentId) => {
          fc.pre(teacher1Id !== teacher2Id && teacher1Id !== studentId && teacher2Id !== studentId);

          const topicId = await createTopic(teacher1Id);
          const comparisonId = await createComparison(teacher1Id, topicId);

          // Another teacher should not be able to grant permissions
          await expect(
            permissionService.grantViewPermission(comparisonId, studentId, teacher2Id)
          ).rejects.toThrow(PermissionError);

          try {
            await permissionService.grantViewPermission(comparisonId, studentId, teacher2Id);
          } catch (error) {
            expect(error).toBeInstanceOf(PermissionError);
            expect((error as PermissionError).code).toBe(PermissionErrorCode.PERMISSION_DENIED);
          }
        }),
        { numRuns: 30 }
      );
    });

    it('only comparison creator can revoke permissions', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), fc.uuid(), async (teacher1Id, teacher2Id, studentId) => {
          fc.pre(teacher1Id !== teacher2Id && teacher1Id !== studentId && teacher2Id !== studentId);

          const topicId = await createTopic(teacher1Id);
          const comparisonId = await createComparison(teacher1Id, topicId);

          // Grant permission as creator
          await permissionService.grantViewPermission(comparisonId, studentId, teacher1Id);

          // Another teacher should not be able to revoke permissions
          await expect(
            permissionService.revokeViewPermission(comparisonId, studentId, teacher2Id)
          ).rejects.toThrow(PermissionError);

          try {
            await permissionService.revokeViewPermission(comparisonId, studentId, teacher2Id);
          } catch (error) {
            expect(error).toBeInstanceOf(PermissionError);
            expect((error as PermissionError).code).toBe(PermissionErrorCode.PERMISSION_DENIED);
          }
        }),
        { numRuns: 30 }
      );
    });
  });

  describe('Permission queries', () => {
    it('getPermissionsForComparison returns all granted permissions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          async (teacherId, studentIds) => {
            // Ensure all IDs are unique
            const uniqueStudentIds = [...new Set(studentIds.filter((id) => id !== teacherId))];
            fc.pre(uniqueStudentIds.length > 0);

            const topicId = await createTopic(teacherId);
            const comparisonId = await createComparison(teacherId, topicId);

            // Grant permissions to all students
            for (const studentId of uniqueStudentIds) {
              await permissionService.grantViewPermission(comparisonId, studentId, teacherId);
            }

            // Get all permissions for the comparison
            const permissions = await permissionService.getPermissionsForComparison(comparisonId);

            expect(permissions).toHaveLength(uniqueStudentIds.length);
            for (const studentId of uniqueStudentIds) {
              const found = permissions.find((p) => p.studentId === studentId);
              expect(found).toBeDefined();
              expect(found!.comparisonId).toBe(comparisonId);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('getPermissionsForStudent returns all comparisons a student can access', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), fc.integer({ min: 2, max: 4 }), async (teacherId, studentId, numComparisons) => {
          fc.pre(teacherId !== studentId);

          const topicId = await createTopic(teacherId);
          const comparisonIds: string[] = [];

          // Create multiple comparisons and grant permission
          for (let i = 0; i < numComparisons; i++) {
            const comparisonId = await createComparison(teacherId, topicId);
            comparisonIds.push(comparisonId);
            await permissionService.grantViewPermission(comparisonId, studentId, teacherId);
          }

          // Get all permissions for the student
          const permissions = await permissionService.getPermissionsForStudent(studentId);

          expect(permissions).toHaveLength(numComparisons);
          for (const comparisonId of comparisonIds) {
            const found = permissions.find((p) => p.comparisonId === comparisonId);
            expect(found).toBeDefined();
            expect(found!.studentId).toBe(studentId);
          }
        }),
        { numRuns: 15 }
      );
    });
  });
});
