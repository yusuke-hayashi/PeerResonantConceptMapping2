import type { ComparisonPermission, UserRole } from '@peer-resonant/shared';
import type { FirestoreService } from './firestore-service';

/**
 * Permission service error codes
 */
export const PermissionErrorCode = {
  COMPARISON_NOT_FOUND: 'COMPARISON_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  PERMISSION_ALREADY_EXISTS: 'PERMISSION_ALREADY_EXISTS',
  PERMISSION_NOT_FOUND: 'PERMISSION_NOT_FOUND',
  INVALID_STUDENT: 'INVALID_STUDENT',
} as const;

export type PermissionErrorCode = (typeof PermissionErrorCode)[keyof typeof PermissionErrorCode];

/**
 * Permission service error
 */
export class PermissionError extends Error {
  constructor(
    public readonly code: PermissionErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * Permission service interface
 */
export interface PermissionService {
  // Grant/revoke permissions
  grantViewPermission(
    comparisonId: string,
    studentId: string,
    grantedBy: string
  ): Promise<ComparisonPermission>;
  revokeViewPermission(comparisonId: string, studentId: string, revokedBy: string): Promise<void>;

  // Check permissions
  canViewComparison(comparisonId: string, userId: string, role: UserRole): Promise<boolean>;
  getPermissionsForComparison(comparisonId: string): Promise<ComparisonPermission[]>;
  getPermissionsForStudent(studentId: string): Promise<ComparisonPermission[]>;
}

/**
 * Create permission service
 */
export function createPermissionService(firestoreService: FirestoreService): PermissionService {
  /**
   * Verify the user is the creator of the comparison (teacher who created it)
   */
  async function verifyCreatorPermission(
    comparisonId: string,
    userId: string
  ): Promise<void> {
    const comparison = await firestoreService.getComparison(comparisonId);
    if (!comparison) {
      throw new PermissionError(
        PermissionErrorCode.COMPARISON_NOT_FOUND,
        `Comparison not found: ${comparisonId}`
      );
    }

    if (comparison.createdBy !== userId) {
      throw new PermissionError(
        PermissionErrorCode.PERMISSION_DENIED,
        'Only the comparison creator can manage permissions'
      );
    }
  }

  return {
    /**
     * Grant view permission to a student
     * Property 10: Permission round-trip
     */
    async grantViewPermission(
      comparisonId: string,
      studentId: string,
      grantedBy: string
    ): Promise<ComparisonPermission> {
      // Verify the granting user is the comparison creator
      await verifyCreatorPermission(comparisonId, grantedBy);

      // Check if permission already exists
      const existingPermission = await firestoreService.getPermission(comparisonId, studentId);
      if (existingPermission) {
        // Return existing permission (idempotent operation)
        return existingPermission;
      }

      // Create new permission
      return firestoreService.createPermission({
        comparisonId,
        studentId,
        grantedBy,
        grantedAt: new Date(),
      });
    },

    /**
     * Revoke view permission from a student
     * Property 10: Permission round-trip
     */
    async revokeViewPermission(
      comparisonId: string,
      studentId: string,
      revokedBy: string
    ): Promise<void> {
      // Verify the revoking user is the comparison creator
      await verifyCreatorPermission(comparisonId, revokedBy);

      // Check if permission exists
      const existingPermission = await firestoreService.getPermission(comparisonId, studentId);
      if (!existingPermission) {
        // Permission doesn't exist - this is okay (idempotent operation)
        return;
      }

      // Delete the permission
      await firestoreService.deletePermission(comparisonId, studentId);
    },

    /**
     * Check if a user can view a comparison
     * Property 9: Comparison default privacy
     */
    async canViewComparison(
      comparisonId: string,
      userId: string,
      role: UserRole
    ): Promise<boolean> {
      const comparison = await firestoreService.getComparison(comparisonId);
      if (!comparison) {
        return false;
      }

      // Teachers can view comparisons they created
      if (comparison.createdBy === userId) {
        return true;
      }

      // Teachers can view all comparisons
      if (role === 'teacher') {
        return true;
      }

      // Students need explicit permission
      // Property 9: Default privacy - students cannot view unless explicitly permitted
      const permission = await firestoreService.getPermission(comparisonId, userId);
      return permission !== null;
    },

    /**
     * Get all permissions for a comparison
     */
    async getPermissionsForComparison(comparisonId: string): Promise<ComparisonPermission[]> {
      return firestoreService.getPermissionsByComparison(comparisonId);
    },

    /**
     * Get all permissions granted to a student
     */
    async getPermissionsForStudent(studentId: string): Promise<ComparisonPermission[]> {
      return firestoreService.getPermissionsByStudent(studentId);
    },
  };
}
