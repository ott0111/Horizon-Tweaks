import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyAX7AMem_7bEOg_oBUS-pYmIqJKv5WYJAY',
  authDomain: 'photorecipe-7mf5z.firebaseapp.com',
  projectId: 'photorecipe-7mf5z',
  storageBucket: 'photorecipe-7mf5z.appspot.com',
  messagingSenderId: '326503955270',
  appId: '1:326503955270:web:a70be1d29744644d4df432',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export default app;
