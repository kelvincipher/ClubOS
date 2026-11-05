import {registerDelivery} from './delivery.js';
import {registerWorkflows,normalizeCampaign,normalizeTask} from './workflows.js';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {z} from 'zod';
const id=()=>randomUUID(), text=z.string().trim().min(1).max(200);
const fail=(status,message)=>{const e=new Error(message);e.status=status;throw e;};
export function createApp(db,secret){
 const app=express();app.set('trust proxy',1);app.use(helmet());app.use(express.json({limit:'512kb'}));
 const ref=(c,i)=>db.collection(c).doc(i);
 const get=async(c,i)=>{const d=await ref(c,i).get();return d.exists?{...d.data(),id:d.id}:null;};
 const list=async(c,k,v)=>{let q=db.collection(c);if(k)q=q.where(k,'==',v);return(await q.get()).docs.map(d=>({...d.data(),id:d.id}));};
 const put=async(c,data)=>{const key=data.id||id();await ref(c,key).set({...data,id:key});return key;};
 const mid=(c,u)=>`${c}_${u}`;
 const role=async(req,c,allowed)=>{const m=await get('members',mid(c,req.user.id));if(!m||!allowed.includes(m.role))fail(403,'You do not have access to this club action.');return m;};
 const staff=['president','officer'],all=[...staff,'member'];
 const safe=({password,...u})=>u;
 const sign=u=>jwt.sign({sub:u.id},secret,{expiresIn:'7d',algorithm:'HS256'});
 const limiter=rateLimit({windowMs:15*60*1000,limit:50,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Too many sign-in attempts. Try again in 15 minutes.'}});
 app.get('/api/health',async(req,res)=>{await db.collection('clubs').limit(1).get();res.json({ok:true,database:'firestore'});});
 app.post('/api/auth/register',limiter,async(req,res)=>{
  const b=z.object({name:text,email:z.email().max(254).transform(s=>s.toLowerCase()),password:z.string().min(10).max(100)}).parse(req.body);
  const u={id:id(),name:b.name,email:b.email,password:await bcrypt.hash(b.password,12)};
  const key=createHash('sha256').update(b.email).digest('hex');
  await db.runTransaction(async t=>{const e=await t.get(ref('emails',key));if(e.exists)fail(409,'This email is already registered.');t.create(ref('emails',key),{user_id:u.id});t.create(ref('users',u.id),u);});res.status(201).json({user:safe(u),token:sign(u)});
 });
 app.post('/api/auth/login',limiter,async(req,res)=>{
  const b=z.object({email:z.email().transform(s=>s.toLowerCase()),password:z.string().max(100)}).parse(req.body);
  const e=await get('emails',createHash('sha256').update(b.email).digest('hex')),u=e?await get('users',e.user_id):null;
  const valid=await bcrypt.compare(b.password,u?.password||'$2b$12$z0SX40T6PMew2kJuPFJDOeHeAfMtIDFJuEAOIhxGX2bRQ.41KkPxW');
  if(!u||!valid)fail(401,'Incorrect email or password.');res.json({user:safe(u),token:sign(u)});
 });
 app.use('/api',async(req,res,next)=>{try{const token=req.headers.authorization?.replace(/^Bearer /,'');const payload=jwt.verify(token,secret,{algorithms:['HS256']});req.user=await get('users',payload.sub);if(!req.user) return res.status(401).json({error:'Please sign in again.'});next();}catch(e){if(['JsonWebTokenError','TokenExpiredError','NotBeforeError'].includes(e.name)||!req.headers.authorization)return res.status(401).json({error:'Please sign in again.'});next(e);}});
 app.get('/api/me',(req,res)=>res.json(safe(req.user)));
 app.get('/api/clubs',async(req,res)=>{const memberships=await list('members','user_id',req.user.id);res.json((await list('clubs')).map(c=>({...c,role:memberships.find(m=>m.club_id===c.id)?.role})).sort((a,b)=>a.name.localeCompare(b.name)));});
 app.post('/api/clubs',async(req,res)=>{
  const b=z.object({name:text,description:z.string().trim().min(10).max(2000),category:text}).parse(req.body),cid=id();
  const batch=db.batch();batch.create(ref('clubs',cid),{...b,id:cid,owner_id:req.user.id});batch.create(ref('members',mid(cid,req.user.id)),{club_id:cid,user_id:req.user.id,name:req.user.name,role:'president',committee:'Leadership'});await batch.commit();res.status(201).json({id:cid});
 });
 app.get('/api/clubs/:cid',async(req,res)=>{
  const cid=req.params.cid,club=await get('clubs',cid);if(!club)fail(404,'Club not found.');const membership=await get('members',mid(cid,req.user.id));
  const [campaigns,events,apps,regs]=await Promise.all([list('campaigns','club_id',cid),list('events','club_id',cid),list('applications','club_id',cid),list('registrations','club_id',cid)]);
  const [members,resources,tasks,handovers]=membership?await Promise.all(['members','resources','tasks','handovers'].map(c=>list(c,'club_id',cid))):[[],[],[],[]];
  res.json({club,membership,campaigns:campaigns.map(normalizeCampaign),events:events.sort((a,b)=>a.starts_at.localeCompare(b.starts_at)),applications:staff.includes(membership?.role)?apps:apps.filter(a=>a.user_id===req.user.id),registrations:regs.filter(r=>r.user_id===req.user.id),members,resources,tasks:tasks.map(normalizeTask),handovers:handovers.sort((a,b)=>b.created_at.localeCompare(a.created_at)),attendance:staff.includes(membership?.role)?regs.map(({token,...r})=>r):[]});
 });
 app.patch('/api/applications/:id',async(req,res)=>{
  const b=z.object({status:z.enum(['interview','accepted','rejected'])}).parse(req.body);
  await db.runTransaction(async t=>{const snap=await t.get(ref('applications',req.params.id));if(!snap.exists)fail(404,'Application not found.');const a=snap.data(),m=await t.get(ref('members',mid(a.club_id,req.user.id))),existing=await t.get(ref('members',mid(a.club_id,a.user_id)));if(!m.exists||!staff.includes(m.data().role))fail(403,'Only club officers can review applications.');if(['accepted','rejected'].includes(a.status))fail(400,'This application already has a final decision.');t.update(snap.ref,b);if(b.status==='accepted'&&!existing.exists)t.create(existing.ref,{club_id:a.club_id,user_id:a.user_id,name:a.name,role:'member',committee:'General'});});res.json({ok:true});
 });
 app.patch('/api/clubs/:cid/members/:uid',async(req,res)=>{
  const b=z.object({role:z.enum(['officer','member']),committee:text}).parse(req.body);
  await db.runTransaction(async t=>{const me=await t.get(ref('members',mid(req.params.cid,req.user.id))),target=await t.get(ref('members',mid(req.params.cid,req.params.uid)));if(!me.exists||me.data().role!=='president')fail(403,'Only the president can change roles.');if(req.params.uid===req.user.id)fail(400,'Use leadership handover to transfer your role.');if(!target.exists)fail(404,'Member not found.');t.update(target.ref,b);});res.json({ok:true});
 });
 app.post('/api/clubs/:cid/events',async(req,res)=>{await role(req,req.params.cid,staff);const b=z.object({title:text,description:z.string().max(2000),location:text,starts_at:z.iso.datetime(),capacity:z.number().int().min(1).max(10000)}).parse(req.body);if(new Date(b.starts_at)<=new Date())fail(400,'Choose a future event date.');await put('events',{...b,club_id:req.params.cid,registered:0});res.status(201).json({ok:true});});
 app.post('/api/events/:id/register',async(req,res)=>{
  await db.runTransaction(async t=>{const snap=await t.get(ref('events',req.params.id));if(!snap.exists)fail(404,'Event not found.');const e=snap.data(),m=await t.get(ref('members',mid(e.club_id,req.user.id))),rid=mid(e.id,req.user.id),r=await t.get(ref('registrations',rid));if(!m.exists)fail(403,'Join this club before registering.');if(r.exists)fail(409,'You already registered.');if(new Date(e.starts_at)<new Date())fail(400,'Registration closed: event has started.');if(e.registered>=e.capacity)fail(400,'This event is full.');const token=randomBytes(24).toString('hex');t.create(ref('tickets',token),{registration_id:rid});t.create(r.ref,{id:rid,event_id:e.id,club_id:e.club_id,user_id:req.user.id,name:req.user.name,title:e.title,token,checked_in_at:null});t.update(snap.ref,{registered:e.registered+1});});res.status(201).json({ok:true});
 });
 app.post('/api/checkin',async(req,res)=>{
  const b=z.object({token:z.string().regex(/^[a-f0-9]{48}$/)}).parse(req.body);
  await db.runTransaction(async t=>{const ticket=await t.get(ref('tickets',b.token));if(!ticket.exists)fail(404,'Invalid attendance ticket.');const r=await t.get(ref('registrations',ticket.data().registration_id));if(!r.exists)fail(404,'Registration not found.');const m=await t.get(ref('members',mid(r.data().club_id,req.user.id)));if(!m.exists||!staff.includes(m.data().role))fail(403,'Only club officers can check in a ticket.');if(r.data().checked_in_at)fail(409,'This ticket has already been checked in.');t.update(r.ref,{checked_in_at:new Date().toISOString()});});res.json({ok:true});
 });
 app.post('/api/clubs/:cid/resources',async(req,res)=>{await role(req,req.params.cid,staff);const b=z.object({title:text,url:z.url().max(2000).refine(s=>/^https?:\/\//.test(s),'Use an HTTP or HTTPS link')}).parse(req.body);await put('resources',{...b,club_id:req.params.cid});res.status(201).json({ok:true});});
 app.post('/api/clubs/:cid/handover',async(req,res)=>{
  const b=z.object({to_id:z.string().uuid(),note:z.string().trim().min(10).max(3000)}).parse(req.body);
  await db.runTransaction(async t=>{const c=await t.get(ref('clubs',req.params.cid));if(!c.exists)fail(404,'Club not found.');if(c.data().owner_id!==req.user.id)fail(403,'Only the current president can transfer leadership.');if(b.to_id===req.user.id)fail(400,'Select another member.');const successor=await t.get(ref('members',mid(c.id,b.to_id)));if(!successor.exists)fail(400,'The successor must already be a member.');t.update(ref('members',mid(c.id,req.user.id)),{role:'officer'});t.update(successor.ref,{role:'president'});t.update(c.ref,{owner_id:b.to_id});t.create(ref('handovers',id()),{club_id:c.id,from_id:req.user.id,to_id:b.to_id,from_name:req.user.name,to_name:successor.data().name,note:b.note,created_at:new Date().toISOString()});});res.json({ok:true});
 });
 registerDelivery(app,{db,ref,get,list,mid,role,staff,fail});
 registerWorkflows(app,{db,ref,get,put,role,mid,fail,staff});
 app.use((req,res)=>res.status(404).json({error:'Endpoint not found.'}));app.use((e,req,res,next)=>{if(e instanceof z.ZodError)return res.status(400).json({error:e.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')});if(e.status)return res.status(e.status).json({error:e.message});if(e.type==='entity.too.large')return res.status(413).json({error:'The form is too large. Shorten the questions or answers.'});if(e.type==='entity.parse.failed')return res.status(400).json({error:'Invalid JSON.'});console.error('API error:',e.code||e.name);res.status(500).json({error:'Something went wrong. Check API logs and database configuration.'});});return app;
}
