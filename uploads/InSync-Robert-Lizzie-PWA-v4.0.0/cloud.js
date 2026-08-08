let firebaseModules = null;
let app = null;
let auth = null;
let db = null;

export function cloudConfigured() {
  return Boolean(window.INSYNC_CONFIG?.firebase?.apiKey && window.INSYNC_CONFIG?.firebase?.projectId);
}

async function loadFirebase() {
  if (!cloudConfigured()) return null;
  if (firebaseModules) return firebaseModules;
  const [appMod, authMod, fireMod] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js')
  ]);
  firebaseModules = { appMod, authMod, fireMod };
  app = appMod.initializeApp(window.INSYNC_CONFIG.firebase);
  auth = authMod.getAuth(app);
  db = fireMod.getFirestore(app);
  return firebaseModules;
}

export async function signInGoogle() {
  const mods = await loadFirebase();
  if (!mods) throw new Error('Firebase is not configured.');
  const provider = new mods.authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await mods.authMod.signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutGoogle() {
  if (!auth) return;
  await firebaseModules.authMod.signOut(auth);
}

export async function watchAuth(callback) {
  const mods = await loadFirebase();
  if (!mods) return () => {};
  return mods.authMod.onAuthStateChanged(auth, callback);
}

export async function pushPrivateProfile(user, profile) {
  const mods = await loadFirebase();
  if (!mods || !user) return;
  const ref = mods.fireMod.doc(db, 'users', user.uid, 'private', 'profile');
  await mods.fireMod.setDoc(ref, { profile, updatedAt: mods.fireMod.serverTimestamp() }, { merge: true });
}

export async function pullPrivateProfile(user) {
  const mods = await loadFirebase();
  if (!mods || !user) return null;
  const ref = mods.fireMod.doc(db, 'users', user.uid, 'private', 'profile');
  const snap = await mods.fireMod.getDoc(ref);
  return snap.exists() ? snap.data().profile : null;
}

export async function pushShared(user, shared) {
  const mods = await loadFirebase();
  if (!mods || !user) return;
  const groupId = window.INSYNC_CONFIG?.groupId || 'robert-lizzie';
  const ref = mods.fireMod.doc(db, 'groups', groupId);
  await mods.fireMod.setDoc(ref, { ...shared, updatedBy: user.uid, updatedAt: mods.fireMod.serverTimestamp() }, { merge: true });
}

export async function pullShared() {
  const mods = await loadFirebase();
  if (!mods) return null;
  const groupId = window.INSYNC_CONFIG?.groupId || 'robert-lizzie';
  const ref = mods.fireMod.doc(db, 'groups', groupId);
  const snap = await mods.fireMod.getDoc(ref);
  return snap.exists() ? snap.data() : null;
}
