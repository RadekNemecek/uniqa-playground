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
 *
 * Pozor při aktualizaci: z konzole se kopíruje jen obsah složených závorek.
 * Název konstanty musí zůstat `FIREBASE_CONFIG`, ne `firebaseConfig`.
 */
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBJjHlTfuURcjpr1CtpSeDGHkeFQOYci7U',
  authDomain: 'uniqa-playground.firebaseapp.com',
  projectId: 'uniqa-playground',
  storageBucket: 'uniqa-playground.firebasestorage.app',
  messagingSenderId: '91701492627',
  appId: '1:91701492627:web:82ff79168eaf67c4df0666',
}

export function isFirebaseConfigured(): boolean {
  return FIREBASE_CONFIG.projectId.trim().length > 0 && FIREBASE_CONFIG.apiKey.trim().length > 0
}
