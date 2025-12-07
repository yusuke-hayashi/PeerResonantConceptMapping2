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
