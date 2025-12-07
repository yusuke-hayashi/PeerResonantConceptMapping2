import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBWnaCZ-s-k414uJuN7tt6QEz0Z4Y5KgI0',
  authDomain: 'peer-resonant-concept-map2.firebaseapp.com',
  projectId: 'peer-resonant-concept-map2',
  storageBucket: 'peer-resonant-concept-map2.firebasestorage.app',
  messagingSenderId: '425105905170',
  appId: '1:425105905170:web:baddde17e82ef703fd2acb',
  measurementId: 'G-VP0YY4KN0R',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
