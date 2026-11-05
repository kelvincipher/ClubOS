import 'dotenv/config';
import bcrypt from 'bcryptjs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {database} from './store.js';

const key=n=>'da110000-0000-4000-8000-'+String(n).padStart(12,'0');
export const demo={leader:key(1),member:key(2),partner:key(3),club:key(4),project:key(5),commitment:key(6),first:key(7),second:key(8)};
const accounts=[['leader','Linh Nguyen'],['member','Minh Tran'],['partner','ABC Company Reviewer']];

export async function seedDelivery(db,password){
 if(typeof password!=='string'||password.length<12||password.length>100)throw Error('Set DELIVERY_DEMO_PASSWORD to 12–100 characters.');
 const hash=await bcrypt.hash(password,12);
 const {leader,member,club,project,commitment,first,second,partner}=demo;
 const rows=[];
 const add=(collection,id,fields)=>rows.push([db.collection(collection).doc(id),{id,...fields,delivery_demo:true}]);
 for(const [role,name] of accounts){
  const email=`delivery-${role}@example.test`,uid=demo[role];
  add('users',uid,{email,name,password:hash});
  add('emails',createHash('sha256').update(email).digest('hex'),{user_id:uid});
  if(role!=='partner')add('members',club+'_'+uid,{club_id:club,user_id:uid,name,role:role==='leader'?'president':'member',committee:'Career Week'});
 }
 add('clubs',club,{name:'Vantra Career Society (Demo)',description:'Fictional club for the Delivery walkthrough.',category:'Career',owner_id:leader});
 const today=new Date(),end=new Date(today.valueOf()+14*86400000).toISOString();
 for(const [id,title] of [[first,'Workshop 1'],[second,'Workshop 2']]){
  add('tasks',id,{title,description:'Upload the workshop evidence or an aggregate attendance note.',club_id:club,delivery_project_id:project,delivery_commitment_id:commitment,
   scope:'individual',committee:null,assignee_id:member,due_at:end,priority:'normal',status:'done',progress:100,done:true,created_by:leader,revision:1,history:[]});
 }
 add('delivery_projects',project,{name:'University Career Week (Demo)',sponsor:'ABC Company (Fictional)',description:'Illustrative sponsor agreement. All people, activities and evidence are fictional.',club_id:club,partner_id:partner,
  start:today.toISOString().slice(0,10),end:end.slice(0,10),status:'active',revision:1,commitments:[{
   id:commitment,title:'Deliver two career workshops',criteria:'Provide a distinct evidence record for each workshop, including its topic and an aggregate attendance summary.',required:2,
   evidence:{[first]:{url:'https://example.com/',note:'Illustrative Workshop 1: CV clinic, 26 participants.'}},decision:null,feedback:''
  }]});
 await db.runTransaction(async tx=>{
  for(const [ref] of rows){
   const snap=await tx.get(ref);
   if(snap.exists&&!snap.data().delivery_demo)throw Error('Demo ID collides with an existing non-demo record: '+ref.path);
  }
  for(const [ref,data] of rows)tx.set(ref,data);
 });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(!process.env.FIRESTORE_EMULATOR_HOST&&process.env.ALLOW_DELIVERY_DEMO_SEED!=='true')throw Error('Use the Firestore emulator, or explicitly opt in on a dedicated demo database.');
 const db=database();
 try{await seedDelivery(db,process.env.DELIVERY_DEMO_PASSWORD);console.log('Delivery demo restored. Sign in as delivery-leader, delivery-member or delivery-partner @example.test.')}
 finally{await db.terminate()}
}
