import {randomUUID} from 'node:crypto';
import {z} from 'zod';
const text=z.string().trim().min(1).max(200);
const question=z.object({id:z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/).refine(v=>!['__proto__','prototype','constructor'].includes(v),'Use a different question ID'),label:text,type:z.enum(['short_text','long_text','single_choice','multiple_choice']),required:z.boolean(),options:z.array(text).max(20).default([])}).strict();
const questions=z.array(question).min(1).max(20).superRefine((qs,ctx)=>{
 if(new Set(qs.map(q=>q.id)).size!==qs.length)ctx.addIssue({code:'custom',message:'Question IDs must be unique.'});
 for(const q of qs)if(q.type.endsWith('choice')&&(q.options.length<2||new Set(q.options).size!==q.options.length))ctx.addIssue({code:'custom',message:'Choice questions need 2–20 unique options.'});
});
const campaignFields=z.object({title:text,deadline:z.iso.datetime(),description:z.string().trim().max(3000),questions});
const defaultQuestions=()=>[{id:'motivation',label:'Why would you like to join?',type:'long_text',required:true,options:[]}];
export const normalizeCampaign=c=>({...c,description:c.description||'',questions:c.questions||defaultQuestions(),form_revision:c.form_revision||1});
export const normalizeTask=t=>({...t,description:t.description||'',scope:t.scope||'club',committee:t.committee||null,assignee_id:t.assignee_id||null,status:t.status||(t.done?'done':'todo'),progress:t.progress??(t.done?100:0),priority:t.priority||'normal',due_at:t.due_at||null,history:t.history||[],revision:t.revision||1});
const taskFields=z.object({title:text,description:z.string().trim().max(4000),scope:z.enum(['club','committee','individual']),committee:text.nullable(),assignee_id:z.string().uuid().nullable(),due_at:z.iso.datetime().nullable(),priority:z.enum(['low','normal','high','urgent'])});
const status=z.enum(['todo','in_progress','blocked','review','done']);
const now=()=>new Date().toISOString();
export function registerWorkflows(app,{db,ref,get,put,role,mid,fail,staff}){
 const draftAnswers=(c,body)=>{
  const b=z.object({form_revision:z.number().int().positive().optional(),answers:z.record(z.string(),z.union([z.string().max(3000),z.array(z.string().max(200)).max(20)])).optional(),motivation:z.string().trim().min(10).max(3000).optional()}).strict().parse(body);
  if(b.form_revision!==undefined&&b.form_revision!==c.form_revision)fail(409,'This application form has changed. Reopen it before submitting.');
  const a=b.answers||{motivation:b.motivation||''};
  if(Object.keys(a).some(k=>!c.questions.some(q=>q.id===k)))fail(400,'The form contains an unknown question.');
  const answers={};
  for(const q of c.questions){let value=a[q.id]??(q.type==='multiple_choice'?[]:'');
   if(q.type==='multiple_choice'){if(!Array.isArray(value)||value.some(v=>!q.options.includes(v))||new Set(value).size!==value.length)fail(400,`Choose valid options for: ${q.label}`);}
   else {if(typeof value!=='string')fail(400,`Enter text for: ${q.label}`);value=value.trim();if(q.type==='short_text'&&value.length>500)fail(400,`${q.label}: maximum 500 characters.`);if(q.type==='single_choice'&&value&&!q.options.includes(value))fail(400,`Choose a valid option for: ${q.label}`);}
   if(q.required&&!value.length)fail(400,`Required: ${q.label}`);
   answers[q.id]=value;
  }
  return {answers,questions:c.questions,form_revision:c.form_revision,motivation:typeof answers.motivation==='string'?answers.motivation:''};
 };
 app.post('/api/clubs/:cid/campaigns',async(req,res)=>{
  await role(req,req.params.cid,staff);
  const b=campaignFields.parse({description:'',...req.body,questions:req.body.questions??defaultQuestions()});
  if(new Date(b.deadline)<=new Date())fail(400,'Choose a future deadline.');
  const id=await put('campaigns',{...b,club_id:req.params.cid,open:true,form_revision:1,created_at:now(),updated_at:now()});res.status(201).json({ok:true,id});
 });
 app.patch('/api/campaigns/:id',async(req,res)=>{
  const b=campaignFields.partial().extend({open:z.boolean().optional(),expected_revision:z.number().int().positive().optional()}).strict().parse(req.body);
  if(!Object.keys(b).some(k=>k!=='expected_revision'))fail(400,'No changes supplied.');
  await db.runTransaction(async tx=>{
   const snap=await tx.get(ref('campaigns',req.params.id));if(!snap.exists)fail(404,'Campaign not found.');const c=normalizeCampaign({...snap.data(),id:snap.id});
   const m=await tx.get(ref('members',mid(c.club_id,req.user.id)));if(!m.exists||!staff.includes(m.data().role))fail(403,'Only club officers can edit campaigns.');
   if(b.expected_revision!==undefined&&b.expected_revision!==c.form_revision)fail(409,'Campaign changed. Refresh before editing.');
   if(b.open===true&&new Date(b.deadline||c.deadline)<=new Date())fail(400,'Extend the deadline before reopening this campaign.');
   const {expected_revision,...changes}=b;tx.update(snap.ref,{...changes,updated_at:now(),form_revision:c.form_revision+1});
  });res.json({ok:true});
 });
 async function apply(req,res,editing){
  await db.runTransaction(async tx=>{
   const snap=await tx.get(ref('campaigns',req.params.id));if(!snap.exists)fail(404,'Campaign not found.');const c=normalizeCampaign({...snap.data(),id:snap.id});
   const aid=mid(c.id,req.user.id),member=await tx.get(ref('members',mid(c.club_id,req.user.id))),existing=await tx.get(ref('applications',aid));
   if(member.exists)fail(400,'You are already a member.');
   if(!c.open||new Date(c.deadline)<=new Date())fail(400,'This campaign is closed.');
   if(editing&&(!existing.exists||existing.data().status!=='applied'))fail(409,'Only your own applications awaiting review can be edited.');
   if(!editing&&existing.exists)fail(409,'You already applied.');
   const data={...draftAnswers(c,req.body),updated_at:now()};
   if(editing)tx.update(existing.ref,data);
   else tx.create(ref('applications',aid),{...data,id:aid,campaign_id:c.id,club_id:c.club_id,user_id:req.user.id,name:req.user.name,email:req.user.email,title:c.title,status:'applied',created_at:now()});
  });res.status(editing?200:201).json({ok:true});
 }
 app.post('/api/campaigns/:id/apply',(req,res)=>apply(req,res,false));
 app.put('/api/campaigns/:id/apply',(req,res)=>apply(req,res,true));
 // Assignment targets are checked inside the same transaction as task writes.
 async function assignment(tx,cid,b){
  if(b.scope==='committee'&&!b.committee)fail(400,'Choose a committee.');
  if(b.scope==='individual'&&!b.assignee_id)fail(400,'Choose an assignee.');
  if(b.scope!=='committee')b.committee=null;
  if(b.scope==='committee'){
   const members=await tx.get(db.collection('members').where('club_id','==',cid));
   if(!members.docs.some(m=>m.data().committee===b.committee))fail(400,'Committee must exist in this club. Assign members to it first.');
  }
  if(b.assignee_id){const m=await tx.get(ref('members',mid(cid,b.assignee_id)));if(!m.exists)fail(400,'Assignee must be a member of this club.');if(b.scope==='committee'&&m.data().committee!==b.committee)fail(400,'Assignee must belong to the selected committee.');}
  return b;
 }
 app.post('/api/clubs/:cid/tasks',async(req,res)=>{
  const {delivery_project_id,delivery_commitment_id,...b}=taskFields.extend({delivery_project_id:z.string().uuid().optional(),delivery_commitment_id:z.string().uuid().optional()}).strict().parse({description:'',scope:'club',committee:null,assignee_id:null,due_at:null,priority:'normal',...req.body}),id=randomUUID();
  await db.runTransaction(async tx=>{
   const m=await tx.get(ref('members',mid(req.params.cid,req.user.id)));if(!m.exists||!staff.includes(m.data().role))fail(403,'Only club officers can assign work.');
   const link={};
   if(delivery_project_id||delivery_commitment_id){
    if(!delivery_project_id||!delivery_commitment_id||b.scope!=='individual'||!b.due_at)fail(400,'Linked tasks require a commitment, an individual assignee and a deadline.');
    const p=await tx.get(ref('delivery_projects',delivery_project_id));
    if(!p.exists||p.data().club_id!==req.params.cid||!p.data().commitments.some(c=>c.id===delivery_commitment_id))fail(400,'Select a commitment from this club.');
    Object.assign(link,{delivery_project_id,delivery_commitment_id});
   }
   await assignment(tx,req.params.cid,b);
   const timestamp=now();tx.create(ref('tasks',id),{...b,...link,id,club_id:req.params.cid,status:'todo',progress:0,done:false,created_by:req.user.id,created_at:timestamp,updated_at:timestamp,revision:1,history:[{id:randomUUID(),actor_id:req.user.id,actor_name:req.user.name,at:timestamp,kind:'created',comment:'',status:'todo',progress:0}]});
  });res.status(201).json({ok:true,id});
 });
 app.patch('/api/tasks/:id',async(req,res)=>{
  const b=taskFields.partial().extend({status:status.optional(),progress:z.number().int().min(0).max(100).optional(),done:z.boolean().optional(),comment:z.string().trim().max(3000).optional(),expected_revision:z.number().int().positive().optional()}).strict().parse(req.body);
  if(!Object.keys(b).some(k=>k!=='expected_revision'&&(k!=='comment'||b.comment)))fail(400,'No changes supplied.');
  await db.runTransaction(async tx=>{
   const snap=await tx.get(ref('tasks',req.params.id));if(!snap.exists)fail(404,'Task not found.');const t=normalizeTask({...snap.data(),id:snap.id});
   const m=await tx.get(ref('members',mid(t.club_id,req.user.id)));if(!m.exists)fail(403,'Join this club to access its work.');const member=m.data(),manager=staff.includes(member.role);
   const owns=t.assignee_id?req.user.id===t.assignee_id:t.scope==='committee'?member.committee===t.committee:t.scope==='club';
   if(!manager&&!owns)fail(403,'Only assigned contributors or club officers can update this task.');
   const metadata=Object.keys(taskFields.shape).filter(k=>k in b);
   if(!manager&&metadata.length)fail(403,'Only club officers can change task assignments or details.');
   if(b.expected_revision!==undefined&&b.expected_revision!==t.revision)fail(409,'Task changed. Reopen it before saving.');
   const {expected_revision,comment,done,...changes}=b;
   if(t.delivery_project_id&&metadata.length&&((b.scope??t.scope)!=='individual'||('assignee_id' in b&&!b.assignee_id)||('due_at' in b&&!b.due_at)))fail(400,'Delivery tasks must retain an individual assignee and deadline.');
   if(metadata.length)await assignment(tx,t.club_id,{...t,...changes}).then(v=>{for(const k of Object.keys(taskFields.shape))changes[k]=v[k]});
   let nextStatus=b.status??(done!==undefined?(done?'done':'todo'):t.status),progress=b.progress??(done===false?0:t.progress);
   if(b.status===undefined&&done===undefined&&b.progress!==undefined){if(progress===100)nextStatus='done';else if(progress>0&&nextStatus==='todo')nextStatus='in_progress';}
   if(nextStatus==='done')progress=100;else if(nextStatus==='todo')progress=0;else if(progress===100)progress=99;
   const timestamp=now(),entry={id:randomUUID(),actor_id:req.user.id,actor_name:req.user.name,at:timestamp,kind:metadata.length?'edited':'progress',comment:comment||'',status:nextStatus,progress};
   tx.update(snap.ref,{...changes,status:nextStatus,progress,done:nextStatus==='done',revision:t.revision+1,updated_at:timestamp,history:[...t.history,entry].slice(-50)});
  });res.json({ok:true});
 });
}
