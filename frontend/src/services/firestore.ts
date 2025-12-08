import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Node type
 */
export type NodeType = 'noun' | 'verb';

/**
 * Node shape
 */
export type NodeShape = 'rectangle' | 'rounded-rectangle';

/**
 * Position interface
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Node style interface
 */
export interface NodeStyle {
  shape: NodeShape;
  color: string;
  borderRadius?: number;
}

/**
 * Node interface
 */
export interface MapNode {
  id: string;
  label: string;
  type: NodeType;
  position: Position;
  style: NodeStyle;
}

/**
 * Link interface
 */
export interface MapLink {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationship: string;
}

/**
 * Concept map interface
 */
export interface ConceptMap {
  id: string;
  topicId: string;
  ownerId: string;
  title: string;
  isReference: boolean;
  nodes: MapNode[];
  links: MapLink[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Topic interface
 */
export interface Topic {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Convert Firestore timestamp to Date
function convertTimestamp(timestamp: Timestamp | Date | null): Date {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date();
}

/**
 * Get all maps for a user
 */
export async function getUserMaps(userId: string): Promise<ConceptMap[]> {
  const mapsRef = collection(db, 'concept_maps');
  const q = query(
    mapsRef,
    where('ownerId', '==', userId),
    orderBy('updatedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
    updatedAt: convertTimestamp(doc.data().updatedAt),
  })) as ConceptMap[];
}

/**
 * Get a single map by ID
 */
export async function getMap(mapId: string): Promise<ConceptMap | null> {
  const docRef = doc(db, 'concept_maps', mapId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
  } as ConceptMap;
}

/**
 * Create a new map
 */
export async function createMap(
  userId: string,
  title: string,
  topicId: string = 'default',
  isReference: boolean = false
): Promise<string> {
  const mapsRef = collection(db, 'concept_maps');

  const newMap = {
    topicId,
    ownerId: userId,
    title,
    isReference,
    nodes: [],
    links: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(mapsRef, newMap);
  return docRef.id;
}

/**
 * Update a map
 */
export async function updateMap(
  mapId: string,
  updates: {
    title?: string;
    nodes?: MapNode[];
    links?: MapLink[];
  }
): Promise<void> {
  const docRef = doc(db, 'concept_maps', mapId);

  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a map
 */
export async function deleteMap(mapId: string): Promise<void> {
  const docRef = doc(db, 'concept_maps', mapId);
  await deleteDoc(docRef);
}

/**
 * Get all topics
 */
export async function getTopics(): Promise<Topic[]> {
  const topicsRef = collection(db, 'topics');
  const q = query(topicsRef, orderBy('createdAt', 'desc'));

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
    updatedAt: convertTimestamp(doc.data().updatedAt),
  })) as Topic[];
}

/**
 * Create a new topic
 */
export async function createTopic(
  userId: string,
  name: string,
  description: string = ''
): Promise<string> {
  const topicsRef = collection(db, 'topics');

  const newTopic = {
    name,
    description,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(topicsRef, newTopic);
  return docRef.id;
}

/**
 * Get a single topic by ID
 */
export async function getTopic(topicId: string): Promise<Topic | null> {
  const docRef = doc(db, 'topics', topicId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
  } as Topic;
}

/**
 * Update a topic
 */
export async function updateTopic(
  topicId: string,
  updates: {
    name?: string;
    description?: string;
  }
): Promise<void> {
  const docRef = doc(db, 'topics', topicId);

  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a topic
 */
export async function deleteTopic(topicId: string): Promise<void> {
  const docRef = doc(db, 'topics', topicId);
  await deleteDoc(docRef);
}

/**
 * User role type
 */
export type UserRole = 'teacher' | 'student';

/**
 * User interface
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  teacherId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get all teachers
 */
export async function getTeachers(): Promise<User[]> {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('role', '==', 'teacher')
  );

  const snapshot = await getDocs(q);
  const teachers = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
    updatedAt: convertTimestamp(doc.data().updatedAt),
  })) as User[];

  // クライアント側でソート
  return teachers.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Get students for a specific teacher
 */
export async function getStudentsByTeacher(teacherId: string): Promise<User[]> {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('role', '==', 'student'),
    where('teacherId', '==', teacherId)
  );

  const snapshot = await getDocs(q);
  const students = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
    updatedAt: convertTimestamp(doc.data().updatedAt),
  })) as User[];

  // クライアント側でソート
  return students.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Get a single user by ID
 */
export async function getUser(userId: string): Promise<User | null> {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
  } as User;
}

/**
 * Update a user's teacherId
 */
export async function assignStudentToTeacher(
  studentId: string,
  teacherId: string
): Promise<void> {
  const docRef = doc(db, 'users', studentId);
  await updateDoc(docRef, {
    teacherId,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Remove student from teacher
 */
export async function removeStudentFromTeacher(studentId: string): Promise<void> {
  const docRef = doc(db, 'users', studentId);
  await updateDoc(docRef, {
    teacherId: null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get all students without a teacher
 */
export async function getUnassignedStudents(): Promise<User[]> {
  const usersRef = collection(db, 'users');
  // teacherId が存在しない、または null の学生を取得
  // Firestoreでは null のフィールドに対するクエリが制限されるため、
  // 全学生を取得してフィルタリングする
  const q = query(
    usersRef,
    where('role', '==', 'student')
  );

  const snapshot = await getDocs(q);
  const students = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
    updatedAt: convertTimestamp(doc.data().updatedAt),
  })) as User[];

  // teacherIdがないものをフィルタし、クライアント側でソート
  return students
    .filter(s => !s.teacherId)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Get maps by topic ID
 */
export async function getMapsByTopic(topicId: string): Promise<ConceptMap[]> {
  const mapsRef = collection(db, 'concept_maps');
  const q = query(
    mapsRef,
    where('topicId', '==', topicId),
    orderBy('updatedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
    updatedAt: convertTimestamp(doc.data().updatedAt),
  })) as ConceptMap[];
}

/**
 * Get multiple maps by IDs
 */
export async function getMapsByIds(mapIds: string[]): Promise<ConceptMap[]> {
  const maps: ConceptMap[] = [];
  for (const mapId of mapIds) {
    const map = await getMap(mapId);
    if (map) {
      maps.push(map);
    }
  }
  return maps;
}

// ============================================
// Comparison Types and Functions
// ============================================

/**
 * Comparison mode
 */
export type ComparisonMode = 'one_to_one' | 'teacher_to_all' | 'all_students' | 'partial_students';

/**
 * Node adjustment result
 */
export interface NodeAdjustmentResult {
  nodeId: string;
  originalLabel: string;
  adjustedLabel: string;
  confidence: number;
}

/**
 * Link adjustment result
 */
export interface LinkAdjustmentResult {
  linkId: string;
  originalRelationship: string;
  adjustedRelationship: string;
  confidence: number;
}

/**
 * Node match
 */
export interface NodeMatch {
  node1Id: string;
  node2Id: string;
  originalLabel1: string;
  originalLabel2: string;
  adjustedLabel: string;
  similarity: number;
}

/**
 * Link match
 */
export interface LinkMatch {
  link1Id: string;
  link2Id: string;
  originalRelationship1: string;
  originalRelationship2: string;
  adjustedRelationship: string;
  similarity: number;
}

/**
 * Comparison result for a pair of maps
 */
export interface ComparisonResult {
  map1Id: string;
  map2Id: string;
  similarityScore: number;
  matchedNodes: NodeMatch[];
  matchedLinks: LinkMatch[];
  uniqueNodesMap1: string[];
  uniqueNodesMap2: string[];
  uniqueLinksMap1: string[];
  uniqueLinksMap2: string[];
  adjustedNodes1: NodeAdjustmentResult[];
  adjustedNodes2: NodeAdjustmentResult[];
  adjustedLinks1: LinkAdjustmentResult[];
  adjustedLinks2: LinkAdjustmentResult[];
}

/**
 * Comparison interface
 */
export interface Comparison {
  id: string;
  mode: ComparisonMode;
  topicId: string;
  mapIds: string[];
  createdBy: string;
  results: ComparisonResult[];
  createdAt: Date;
}

/**
 * Comparison permission interface
 */
export interface ComparisonPermission {
  id: string;
  comparisonId: string;
  studentId: string;
  grantedBy: string;
  grantedAt: Date;
}

/**
 * Get all comparisons created by a teacher
 */
export async function getComparisons(teacherId: string): Promise<Comparison[]> {
  const comparisonsRef = collection(db, 'comparisons');
  const q = query(
    comparisonsRef,
    where('createdBy', '==', teacherId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
  })) as Comparison[];
}

/**
 * Get a single comparison by ID
 */
export async function getComparison(comparisonId: string): Promise<Comparison | null> {
  const docRef = doc(db, 'comparisons', comparisonId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: convertTimestamp(data.createdAt),
  } as Comparison;
}

/**
 * Create a new comparison
 */
export async function createComparison(
  teacherId: string,
  mode: ComparisonMode,
  topicId: string,
  mapIds: string[],
  results: ComparisonResult[]
): Promise<string> {
  const comparisonsRef = collection(db, 'comparisons');

  const newComparison = {
    mode,
    topicId,
    mapIds,
    createdBy: teacherId,
    results,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(comparisonsRef, newComparison);
  return docRef.id;
}

/**
 * Delete a comparison
 */
export async function deleteComparison(comparisonId: string): Promise<void> {
  const docRef = doc(db, 'comparisons', comparisonId);
  await deleteDoc(docRef);
}

/**
 * Get permissions for a comparison
 */
export async function getComparisonPermissions(comparisonId: string): Promise<ComparisonPermission[]> {
  const permissionsRef = collection(db, 'comparison_permissions');
  const q = query(
    permissionsRef,
    where('comparisonId', '==', comparisonId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    grantedAt: convertTimestamp(doc.data().grantedAt),
  })) as ComparisonPermission[];
}

/**
 * Grant view permission to a student
 */
export async function grantComparisonPermission(
  comparisonId: string,
  studentId: string,
  teacherId: string
): Promise<string> {
  const permissionsRef = collection(db, 'comparison_permissions');

  const newPermission = {
    comparisonId,
    studentId,
    grantedBy: teacherId,
    grantedAt: serverTimestamp(),
  };

  const docRef = await addDoc(permissionsRef, newPermission);
  return docRef.id;
}

/**
 * Revoke view permission from a student
 */
export async function revokeComparisonPermission(
  comparisonId: string,
  studentId: string
): Promise<void> {
  const permissionsRef = collection(db, 'comparison_permissions');
  const q = query(
    permissionsRef,
    where('comparisonId', '==', comparisonId),
    where('studentId', '==', studentId)
  );

  const snapshot = await getDocs(q);
  for (const docSnap of snapshot.docs) {
    await deleteDoc(docSnap.ref);
  }
}

/**
 * Check if a student has permission to view a comparison
 */
export async function hasComparisonPermission(
  comparisonId: string,
  studentId: string
): Promise<boolean> {
  const permissionsRef = collection(db, 'comparison_permissions');
  const q = query(
    permissionsRef,
    where('comparisonId', '==', comparisonId),
    where('studentId', '==', studentId)
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Get comparisons accessible to a student
 */
export async function getStudentAccessibleComparisons(studentId: string): Promise<Comparison[]> {
  // Get all permissions for this student
  const permissionsRef = collection(db, 'comparison_permissions');
  const q = query(
    permissionsRef,
    where('studentId', '==', studentId)
  );

  const permSnapshot = await getDocs(q);
  const comparisonIds = permSnapshot.docs.map(doc => doc.data().comparisonId);

  if (comparisonIds.length === 0) {
    return [];
  }

  // Get all comparisons
  const comparisons: Comparison[] = [];
  for (const comparisonId of comparisonIds) {
    const comparison = await getComparison(comparisonId);
    if (comparison) {
      comparisons.push(comparison);
    }
  }

  return comparisons.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
