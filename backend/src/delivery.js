import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {normalizeTask} from './workflows.js';

const text=z.string().trim().min(1).max(200);
const uuid=z.string().uuid();
const project=z.object({name:text,sponsor:text,description:z.string().trim().max(2000),start:z.iso.date(),end:z.iso.date(),status:z.enum(['planned','active','closed'])}).strict();
const commitment=z.object({title:text,criteria:z.string().trim().min(1).max(1500),required:z.number().int().min(1).max(10)}).strict();
const evidence=z.object({url:z.url().max(1000).refine(s=>/^https?:\/\//i.test(s),'Use an HTTP or HTTPS link').or(z.literal('')),note:z.string().trim().max(500)}).strict().refine(e=>e.url||e.note,'Enter a link or a note');
const revision=z.number().int().positive();
const status=c=>c.decision==='accepted'?'Accepted':c.decision==='revision'?'Revision requested':Object.keys(c.evidence).length>=c.required?'Awaiting partner review':'Evidence incomplete';

export function registerDelivery(app,{db,ref,get,list,mid,role,staff,fail}){
 const projects='delivery_projects';
 const membership=(cid,uid)=>ref('members',mid(cid,uid));
 const from=s=>s.exists?{...s.data(),id:s.id}:null;
 const manager=m=>staff.includes(m?.role);
 const header=p=>({id:p.id,club_id:p.club_id,name:p.name,sponsor:p.sponsor,description:p.description,start:p.start,end:p.end,status:p.status,revision:p.revision});
 const requireProject=p=>{if(!p)fail(404,'Project not found.');return p};
 function item(p,id){const c=p.commitments.find(c=>c.id===id);if(!c)fail(404,'Commitment not found.');return c}
 function dates(b){if(b.end<b.start)fail(400,'End date must be on or after the start date.');return b}
 app.get('/api/delivery/shared',async(req,res)=>{
  const shared=await list(projects,'partner_id',req.user.id);
  const external=await Promise.all(shared.map(async p=>(await membership(p.club_id,req.user.id).get()).exists?null:header(p)));
  res.json(external.filter(Boolean));
 });
 app.get('/api/clubs/:cid/delivery',async(req,res)=>{
  await role(req,req.params.cid,[...staff,'member']);
  res.json((await list(projects,'club_id',req.params.cid)).map(header));
 });
 app.post('/api/clubs/:cid/delivery',async(req,res)=>{
  const b=dates(project.parse(req.body));
  const cid=req.params.cid,id=randomUUID();
  await db.runTransaction(async tx=>{
   if(!manager(from(await tx.get(membership(cid,req.user.id)))))fail(403,'Only club officers can create projects.');
   tx.create(ref(projects,id),{...b,id,club_id:cid,partner_id:null,commitments:[],revision:1});
  });
  res.status(201).json({id});
 });
 app.get('/api/delivery/:id',async(req,res)=>{
  const p=requireProject(await get(projects,req.params.id));
  const member=from(await membership(p.club_id,req.user.id).get());
  const partner=p.partner_id===req.user.id&&!member;
  if(!member&&!partner)fail(403,'This project is private.');
  const tasks=partner?[]:(await list('tasks','delivery_project_id',p.id)).map(normalizeTask);
  const club=await get('clubs',p.club_id);
  res.json({...header(p),club_name:club?.name||'',access:partner?'partner':manager(member)?'manager':'member',
   ...(manager(member)?{partner_id:p.partner_id}:{}),commitments:p.commitments.map(c=>({
    id:c.id,title:c.title,criteria:c.criteria,required:c.required,status:status(c),feedback:c.feedback,
    evidence:Object.entries(c.evidence).map(([task_id,e])=>({...(!partner?{task_id}:{}),url:e.url,note:e.note})),
    ...(partner?{}:{tasks:tasks.filter(t=>t.delivery_commitment_id===c.id).map(t=>({id:t.id,title:t.title,description:t.description,assignee_id:t.assignee_id,due_at:t.due_at,status:t.status,revision:t.revision}))})
   }))});
 });

 async function change(req,res,apply){
  await db.runTransaction(async tx=>{
   const snap=await tx.get(ref(projects,req.params.id)),p=requireProject(from(snap));
   const member=from(await tx.get(membership(p.club_id,req.user.id)));
   const partner=p.partner_id===req.user.id&&!member;
   if(!member&&!partner)fail(403,'This project is private.');
   const officer=()=>{if(!manager(member))fail(403,'Only club officers can make this change.')};
   const changes=await apply({tx,p,member,partner,officer});
   tx.update(snap.ref,{...changes,revision:p.revision+1});
  });
  res.json({ok:true});
 }
 app.patch('/api/delivery/:id',(req,res)=>change(req,res,({officer})=>{officer();return dates(project.parse(req.body))}));
 app.put('/api/delivery/:id/partner',(req,res)=>change(req,res,async({tx,officer,p})=>{
  officer();
  const {partner_id}=z.object({partner_id:uuid.nullable()}).strict().parse(req.body);
  if(partner_id){
   const account=await tx.get(ref('users',partner_id)),member=await tx.get(membership(p.club_id,partner_id));
   if(!account.exists||member.exists)fail(400,'Use the account ID of a registered external partner.');
  }
  return {partner_id};
 }));
 app.post('/api/delivery/:id/commitments',(req,res)=>change(req,res,({p,officer})=>{
  officer();if(p.commitments.length>=12)fail(400,'Maximum of 12 commitments per project.');
  return {commitments:[...p.commitments,{...commitment.parse(req.body),id:randomUUID(),evidence:{},decision:null,feedback:''}]};
 }));
 app.patch('/api/delivery/:id/commitments/:cid',(req,res)=>change(req,res,({p,officer})=>{
  officer();
  const c=item(p,req.params.cid);
  Object.assign(c,commitment.parse(req.body),{decision:null,feedback:''});
  return {commitments:p.commitments};
 }));
 app.put('/api/delivery/:id/tasks/:tid/evidence',(req,res)=>change(req,res,async({p,tx,member})=>{
  const task=from(await tx.get(ref('tasks',req.params.tid)));
  if(!task||task.delivery_project_id!==p.id||task.club_id!==p.club_id)fail(404,'Linked task not found.');
  if(!member||(!manager(member)&&task.assignee_id!==req.user.id))fail(403,'Only the assignee or an officer may submit evidence.');
  const c=item(p,task.delivery_commitment_id),b=evidence.parse(req.body);
  if(Object.entries(c.evidence).some(([id,e])=>id!==task.id&&(b.url?e.url===b.url:!e.url&&e.note===b.note)))fail(400,'Submit distinct evidence for each task.');
  if(!c.evidence[task.id]&&Object.keys(c.evidence).length>=10)fail(400,'Maximum of 10 evidence submissions per commitment.');
  c.evidence[task.id]=b;
  if(c.decision==='accepted')c.feedback='';
  c.decision=null;
  return {commitments:p.commitments};
 }));
 app.post('/api/delivery/:id/commitments/:cid/review',(req,res)=>change(req,res,({p,partner})=>{
  if(!partner)fail(403,'Only the shared partner account may review.');
  const b=z.object({decision:z.enum(['accepted','revision']),feedback:z.string().trim().max(1500),expected_revision:revision}).strict().parse(req.body);
  if(b.expected_revision!==p.revision)fail(409,'This project changed. Reload it before reviewing.');
  const c=item(p,req.params.cid);
  if(b.decision==='accepted'&&Object.keys(c.evidence).length<c.required)fail(409,'The minimum evidence has not been submitted.');
  if(b.decision==='revision'&&!b.feedback)fail(400,'Explain what needs revision.');
  Object.assign(c,{decision:b.decision,feedback:b.feedback});
  return {commitments:p.commitments};
 }));
}
