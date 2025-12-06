/**
 * Topic data model
 * Firestore collection: topics
 *
 * Indexes:
 * - createdBy (ascending)
 * - createdAt (descending)
 */
export interface Topic {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
