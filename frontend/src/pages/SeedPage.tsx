import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import {
  seedUsers,
  seedTopic,
  teacherMap,
  studentMaps,
  type SeedUser,
  type SeedMap,
} from '../services/seed-data';

interface LogEntry {
  type: 'info' | 'success' | 'error';
  message: string;
}

/**
 * Seed page for creating test data (development only)
 */
export function SeedPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs((prev) => [...prev, { type, message }]);
  };

  const createUser = async (user: SeedUser): Promise<string | null> => {
    try {
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        user.email,
        user.password
      );
      const uid = userCredential.user.uid;

      // Create user document in Firestore
      await setDoc(doc(db, 'users', uid), {
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        createdAt: serverTimestamp(),
        ...(user.role === 'student' ? { teacherId: '' } : {}),
      });

      addLog('success', `Created user: ${user.displayName} (${user.email})`);
      return uid;
    } catch (error) {
      if ((error as { code?: string }).code === 'auth/email-already-in-use') {
        addLog('info', `User already exists: ${user.email}, signing in...`);
        try {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            user.email,
            user.password
          );
          return userCredential.user.uid;
        } catch {
          addLog('error', `Failed to sign in: ${user.email}`);
          return null;
        }
      }
      addLog('error', `Failed to create user: ${user.email} - ${(error as Error).message}`);
      return null;
    }
  };

  const createTopic = async (teacherId: string): Promise<string | null> => {
    try {
      const topicRef = await addDoc(collection(db, 'topics'), {
        name: seedTopic.name,
        description: seedTopic.description,
        createdBy: teacherId,
        createdAt: serverTimestamp(),
      });
      addLog('success', `Created topic: ${seedTopic.name}`);
      return topicRef.id;
    } catch (error) {
      addLog('error', `Failed to create topic: ${(error as Error).message}`);
      return null;
    }
  };

  const createMap = async (
    map: SeedMap,
    ownerId: string,
    topicId: string
  ): Promise<string | null> => {
    try {
      // Generate node IDs and create nodes with IDs
      const nodeIdMap = new Map<string, string>();
      const nodesWithIds = map.nodes.map((node, index) => {
        const id = `node-${Date.now()}-${index}`;
        nodeIdMap.set(node.label, id);
        return { ...node, id };
      });

      // Create links with proper node IDs
      const linksWithIds = map.links.map((link, index) => {
        const sourceNodeId = nodeIdMap.get(link.sourceLabel);
        const targetNodeId = nodeIdMap.get(link.targetLabel);
        if (!sourceNodeId || !targetNodeId) {
          throw new Error(`Invalid link: ${link.sourceLabel} -> ${link.targetLabel}`);
        }
        return {
          id: `link-${Date.now()}-${index}`,
          sourceNodeId,
          targetNodeId,
          label: link.label,
          relationship: link.relationship,
        };
      });

      const mapRef = await addDoc(collection(db, 'concept_maps'), {
        title: map.title,
        topicId,
        ownerId,
        isReference: map.isReference,
        nodes: nodesWithIds,
        links: linksWithIds,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      addLog('success', `Created map: ${map.title}`);
      return mapRef.id;
    } catch (error) {
      addLog('error', `Failed to create map: ${map.title} - ${(error as Error).message}`);
      return null;
    }
  };

  const updateStudentTeacher = async (studentId: string, teacherId: string) => {
    try {
      await setDoc(
        doc(db, 'users', studentId),
        { teacherId },
        { merge: true }
      );
      addLog('info', `Linked student to teacher`);
    } catch (error) {
      addLog('error', `Failed to link student: ${(error as Error).message}`);
    }
  };

  const signInAsUser = async (email: string, password: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch {
      addLog('error', `Failed to sign in as ${email}`);
      return false;
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    setLogs([]);
    const totalSteps = seedUsers.length + 1 + 1 + studentMaps.length;
    setProgress({ current: 0, total: totalSteps });

    try {
      // Step 1: Create users
      addLog('info', 'Creating users...');
      const userIds: Record<string, string> = {};

      for (const user of seedUsers) {
        const uid = await createUser(user);
        if (uid) {
          userIds[user.email] = uid;
        }
        setProgress((prev) => ({ ...prev, current: prev.current + 1 }));
      }

      const teacherId = userIds['teacher@example.com'];
      if (!teacherId) {
        addLog('error', 'Teacher account creation failed, aborting');
        setIsSeeding(false);
        return;
      }

      // Sign in as teacher to perform teacher-only operations
      addLog('info', 'Signing in as teacher...');
      if (!(await signInAsUser('teacher@example.com', 'teacher123'))) {
        setIsSeeding(false);
        return;
      }

      // Step 2: Link students to teacher (teacher needs to do this)
      for (const user of seedUsers) {
        if (user.role === 'student' && userIds[user.email]) {
          await updateStudentTeacher(userIds[user.email], teacherId);
        }
      }

      // Step 3: Create topic (as teacher)
      addLog('info', 'Creating topic...');
      const topicId = await createTopic(teacherId);
      setProgress((prev) => ({ ...prev, current: prev.current + 1 }));

      if (!topicId) {
        addLog('error', 'Topic creation failed, aborting');
        setIsSeeding(false);
        return;
      }

      // Step 4: Create teacher's reference map (as teacher)
      addLog('info', 'Creating teacher reference map...');
      await createMap(teacherMap, teacherId, topicId);
      setProgress((prev) => ({ ...prev, current: prev.current + 1 }));

      // Step 5: Create student maps (need to sign in as each student)
      addLog('info', 'Creating student maps...');
      for (const studentMap of studentMaps) {
        const studentId = userIds[studentMap.ownerEmail];
        if (studentId) {
          // Sign in as the student to create their map
          const studentUser = seedUsers.find(u => u.email === studentMap.ownerEmail);
          if (studentUser && (await signInAsUser(studentUser.email, studentUser.password))) {
            await createMap(studentMap, studentId, topicId);
          }
        }
        setProgress((prev) => ({ ...prev, current: prev.current + 1 }));
      }

      // Sign out at the end
      await auth.signOut();

      addLog('success', 'Seed data creation completed!');
      addLog('info', `Teacher login: teacher@example.com / teacher123`);
    } catch (error) {
      addLog('error', `Seed failed: ${(error as Error).message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="seed-page">
      <div className="seed-container">
        <h1>{t('seed.title')}</h1>
        <p className="seed-description">{t('seed.description')}</p>

        <div className="seed-info">
          <h3>{t('seed.dataToCreate')}</h3>
          <ul>
            <li>
              <strong>{t('seed.users')}:</strong> 1 {t('seed.teacher')} + 3 {t('seed.students')}
            </li>
            <li>
              <strong>{t('seed.topic')}:</strong> {seedTopic.name}
            </li>
            <li>
              <strong>{t('nav.maps')}:</strong> 1 {t('seed.referenceMap')} + 3 {t('seed.studentMaps')}
            </li>
          </ul>
        </div>

        <div className="seed-credentials">
          <h3>{t('seed.credentials')}</h3>
          <table>
            <thead>
              <tr>
                <th>{t('seed.role')}</th>
                <th>{t('auth.email')}</th>
                <th>{t('auth.password')}</th>
              </tr>
            </thead>
            <tbody>
              {seedUsers.map((user) => (
                <tr key={user.email}>
                  <td>{user.role === 'teacher' ? t('seed.teacher') : t('seed.student')}</td>
                  <td>{user.email}</td>
                  <td>{user.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="seed-actions">
          <button
            className="seed-button"
            onClick={handleSeed}
            disabled={isSeeding}
          >
            {isSeeding ? t('seed.seeding') : t('seed.createData')}
          </button>
          <button
            className="login-button"
            onClick={handleGoToLogin}
          >
            {t('seed.goToLogin')}
          </button>
        </div>

        {progress.total > 0 && (
          <div className="seed-progress">
            <div
              className="progress-bar"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
            <span className="progress-text">
              {progress.current} / {progress.total}
            </span>
          </div>
        )}

        {logs.length > 0 && (
          <div className="seed-logs">
            <h3>{t('seed.logs')}</h3>
            <div className="logs-container">
              {logs.map((log, index) => (
                <div key={index} className={`log-entry log-${log.type}`}>
                  {log.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
