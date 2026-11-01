import {getApps,initializeApp,cert,applicationDefault} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
export function database(){
 if(!getApps().length){
  const projectId=process.env.FIREBASE_PROJECT_ID;
  if(!projectId)throw Error('Set FIREBASE_PROJECT_ID');
  initializeApp(process.env.FIRESTORE_EMULATOR_HOST?{projectId}:{projectId,credential:process.env.FIREBASE_PRIVATE_KEY?cert({projectId,clientEmail:process.env.FIREBASE_CLIENT_EMAIL,privateKey:process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g,'\n')}):applicationDefault()});
 }
 return getFirestore();
}
