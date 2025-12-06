/**
 * Comparison permission data model
 * Firestore collection: comparison_permissions
 *
 * Indexes:
 * - comparisonId (ascending), studentId (ascending)
 * - studentId (ascending), grantedAt (descending)
 */
export interface ComparisonPermission {
  id: string;
  comparisonId: string;
  studentId: string;
  grantedBy: string;
  grantedAt: Date;
}

/**
 * Permission interface (for API responses)
 */
export interface Permission {
  comparisonId: string;
  studentId: string;
  grantedAt: Date;
  grantedBy: string;
}
