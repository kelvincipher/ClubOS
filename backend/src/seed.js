import bcrypt from 'bcryptjs';
import {randomUUID,createHash} from 'node:crypto';
export async function seed(db){
 if(!process.env.DEMO_PASSWORD||process.env.DEMO_PASSWORD.length<10)throw Error('Set DEMO_PASSWORD (10+ characters) before enabling SEED_DEMO');
 const marker=db.collection('system').doc('demo-seed');if((await marker.get()).exists)return;
 const p=randomUUID(),m=randomUUID(),club=randomUUID(),pass=await bcrypt.hash(process.env.DEMO_PASSWORD,12),batch=db.batch();
 for(const [uid,name,email,role,committee] of [[p,'Alex Nguyen','president@vantra.demo','president','Leadership'],[m,'Jamie Tran','member@vantra.demo','member','Design']]){
 batch.create(db.collection('users').doc(uid),{id:uid,name,email,password:pass});batch.create(db.collection('emails').doc(createHash('sha256').update(email).digest('hex')),{user_id:uid});batch.create(db.collection('members').doc(`${club}_${uid}`),{club_id:club,user_id:uid,name,role,committee});}
 batch.create(db.collection('clubs').doc(club),{id:club,name:'Vantra Creative Society',description:'A home for curious minds. Build projects, share ideas, and make campus a little more creative.',category:'Arts & Culture',owner_id:p});
 const cid=randomUUID(),eid=randomUUID();batch.create(db.collection('campaigns').doc(cid),{id:cid,club_id:club,title:'Your next chapter starts here',deadline:new Date(Date.now()+30*86400000).toISOString(),open:true});
 batch.create(db.collection('events').doc(eid),{id:eid,club_id:club,title:'Ideas after hours',description:'Bring your wildest idea. Leave with your next team.',location:'Innovation Lab · Room 302',starts_at:new Date(Date.now()+7*86400000).toISOString(),capacity:40,registered:0});
 batch.create(db.collection('tasks').doc(randomUUID()),{club_id:club,title:'Prepare the next leadership welcome pack',done:false});batch.create(db.collection('resources').doc(randomUUID()),{club_id:club,title:'Club handbook (replace with your document)',url:'https://docs.google.com/'});batch.create(marker,{created_at:new Date().toISOString()});await batch.commit();console.log('Demo workspace created.');
}
