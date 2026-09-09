/**
 * Konfigurace Firebase.
 *
 * Tyhle hodnoty jsou veřejné. Firebase je tak navržený: klíč jen říká,
 * ke kterému projektu se klient hlásí, přístup hlídají pravidla na straně
 * Google (soubor `firestore.rules`). Proto mohou být v repozitáři.
 *
 * Postup, jak je získat, je v `DEPLOY.md`. Dokud tu zůstane prázdný
 * `projectId`, aplikace jede v lokálním režimu: všechno funguje, jen se
 * data neukládají do cloudu a nesdílí s kolegy.
 */
export const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
}

export function isFirebaseConfigured(): boolean {
  return FIREBASE_CONFIG.projectId.trim().length > 0 && FIREBASE_CONFIG.apiKey.trim().length > 0
}
