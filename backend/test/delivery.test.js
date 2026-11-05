import {test} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import {randomUUID} from 'node:crypto';
import {createApp} from '../src/app.js';
import {database} from '../src/store.js';
import {MemoryFirestore} from './helpers/memory-store.js';

const secret='delivery-tests-only-not-a-real-secret';
const uuid=()=>randomUUID();
const body={name:'Career Week',sponsor:'ABC',description:'Fictional demo',start:'2026-11-01',end:'2026-11-07',status:'active'};
const requirement={title:'Two workshops',criteria:'One distinct summary per workshop',required:2};

test('Delivery from assignment through revision, acceptance, report and revocation',async()=>{
 const emulator=Boolean(process.env.FIRESTORE_EMULATOR_HOST);
 if(emulator)process.env.FIREBASE_PROJECT_ID='demo-clubos';
 const db=emulator?database():new MemoryFirestore();
 try{
  const club=uuid(),leader=uuid(),member=uuid(),partner=uuid(),outsider=uuid();
  const set=(collection,id,data)=>db.collection(collection).doc(id).set(data);
  for(const id of [leader,member,partner,outsider])await set('users',id,{id,name:id,email:id+'@example.test'});
  await set('clubs',club,{name:'Career Club'});
  for(const [id,role] of [[leader,'president'],[member,'member']])await set('members',club+'_'+id,{user_id:id,club_id:club,role});
  const app=createApp(db,secret);
  async function call(uid,method,path,status,data){
   const r=await request(app)[method]('/api/'+path).set('Authorization','Bearer '+jwt.sign({sub:uid},secret)).send(data);
   assert.equal(r.status,status,JSON.stringify(r.body));return r.body;
  }
  await call(member,'post',`clubs/${club}/delivery`,403,body);
  const {id}=await call(leader,'post',`clubs/${club}/delivery`,201,body),p='delivery/'+id;
  await call(partner,'get',p,403);
  await call(leader,'put',p+'/partner',200,{partner_id:partner});
  await call(leader,'post',p+'/commitments',200,requirement);
  const [c]=(await call(leader,'get',p,200)).commitments;
  const commitmentPath=p+'/commitments/'+c.id;
  await call(leader,'patch',commitmentPath,200,{...requirement,criteria:'Two separate attendance summaries'});
  const tasks=[];
  for(const title of ['Workshop 1','Workshop 2']){
   const {id:task}=await call(leader,'post',`clubs/${club}/tasks`,201,{title,scope:'individual',assignee_id:member,due_at:'2026-11-06T10:00:00Z',delivery_project_id:id,delivery_commitment_id:c.id});
   tasks.push(task);
   await call(member,'patch','tasks/'+task,200,{status:'done'});
  }
  await call(partner,'put',p+'/tasks/'+tasks[0]+'/evidence',403,{url:'',note:'Not authorized'});
  await call(member,'put',p+'/tasks/'+tasks[0]+'/evidence',200,{url:'https://example.org/workshop-1',note:'26 participants'});
  let report=await call(partner,'get',p,200);
  assert.equal(report.commitments[0].status,'Evidence incomplete');
  assert.equal(report.commitments[0].tasks,undefined);
  assert.equal(report.commitments[0].evidence[0].task_id,undefined);
  await call(partner,'post',commitmentPath+'/review',409,{decision:'accepted',feedback:'',expected_revision:report.revision});
  await call(partner,'post',commitmentPath+'/review',200,{decision:'revision',feedback:'Workshop 2 is missing',expected_revision:report.revision});
  assert.equal((await call(member,'get',p,200)).commitments[0].status,'Revision requested');
  await call(member,'put',p+'/tasks/'+tasks[1]+'/evidence',400,{url:'https://example.org/workshop-1',note:''});
  await call(member,'put',p+'/tasks/'+tasks[1]+'/evidence',200,{url:'',note:'Workshop 2, mock interviews, 31 participants'});
  await call(partner,'post',commitmentPath+'/review',409,{decision:'accepted',feedback:'',expected_revision:report.revision});
  report=await call(partner,'get',p,200);
  await call(partner,'post',commitmentPath+'/review',200,{decision:'accepted',feedback:'Both summaries received',expected_revision:report.revision});
  report=await call(leader,'get',p,200);
  assert.equal(report.commitments[0].status,'Accepted');
  assert.equal(report.commitments[0].evidence.length,2);
  assert.equal(report.commitments[0].tasks[1].assignee_id,member);
  assert.equal((await db.collection('delivery_projects').doc(id).get()).data().commitments[0].decision,'accepted');
  await call(outsider,'get',p,403);
  await call(leader,'put',p+'/partner',200,{partner_id:null});
  assert.deepEqual(await call(partner,'get','delivery/shared',200),[]);
  await call(partner,'get',p,403);
 }finally{await db.terminate()}
});
