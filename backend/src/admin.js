import bcrypt from 'bcryptjs';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {z} from 'zod';

const text=z.string().trim().min(1).max(200);
const email=z.string().trim().max(254).pipe(z.email()).transform(v=>v.toLowerCase());
const password=z.string().min(12).max(72).refine(v=>Buffer.byteLength(v,'utf8')<=72,'Use at most 72 UTF-8 bytes.');
const club=z.object({name:text,description:z.string().trim().min(10).max(2000),category:text}).strict();
const assignment={role:z.enum(['partner','president','member']),club_id:z.string().uuid().optional(),new_club:club.optional(),committee:text.optional(),replace_president:z.boolean().optional(),expected_owner_id:z.string().uuid().nullable().optional()};
const emailKey=v=>createHash('sha256').update(v).digest('hex');
const now=()=>new Date().toISOString();
export function publicUser(u){return {id:u.id,name:u.name,email:u.email,platform_role:['admin','partner'].includes(u.platform_role)?u.platform_role:'standard',...(u.organization?{organization:u.organization}:{}),...(u.created_at?{created_at:u.created_at}:{})};}

// Runs only during trusted server startup. The marker makes setup one-time:
// later restarts or changed env values cannot reset accounts or add more admins.
export async function bootstrapAdmin(db,env=process.env){
 if(!env.BOOTSTRAP_ADMIN_EMAIL&&!env.BOOTSTRAP_ADMIN_PASSWORD)return {skipped:true};
 if(!env.BOOTSTRAP_ADMIN_EMAIL||!env.BOOTSTRAP_ADMIN_PASSWORD)throw Error('Set both BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD for first admin setup.');
 const address=email.parse(env.BOOTSTRAP_ADMIN_EMAIL),secret=env.BOOTSTRAP_ADMIN_PASSWORD;
 const name=text.parse(env.BOOTSTRAP_ADMIN_NAME||'ClubOS Administrator');
 const marker=db.collection('system').doc('initial_admin_v1');
 return db.runTransaction(async tx=>{
  if((await tx.get(marker)).exists)return {already_configured:true};
  const lookup=db.collection('emails').doc(emailKey(address)),existing=await tx.get(lookup);
  let uid=existing.exists?existing.data().user_id:randomUUID();
  const userRef=db.collection('users').doc(uid),user=existing.exists?await tx.get(userRef):null;
  if(existing.exists){
   if(!user.exists||typeof user.data().password!=='string'||typeof secret!=='string'||secret.length>100||!await bcrypt.compare(secret,user.data().password))throw Error('For an existing account, BOOTSTRAP_ADMIN_PASSWORD must match its current password.');
   tx.update(userRef,{platform_role:'admin'});
  }else{
   password.parse(secret);
   tx.create(lookup,{user_id:uid});
   tx.create(userRef,{id:uid,name,email:address,password:await bcrypt.hash(secret,12),platform_role:'admin',created_at:now()});
  }
  tx.create(marker,{user_id:uid,created_at:now()});
  tx.create(db.collection('account_audit').doc(randomUUID()),{action:'admin_bootstrapped',target_id:uid,actor_id:uid,created_at:now()});
  return {created:true,user_id:uid};
 });
}

export function registerAdmin(app,{db,ref,get,list,mid,fail}){
 app.use('/api/admin',(req,res,next)=>{if(req.user.platform_role!=='admin')return res.status(403).json({error:'Administrator access required.'});next();});

 app.get('/api/admin/accounts',async(req,res)=>{
  const [users,members,clubs]=await Promise.all([list('users'),list('members'),list('clubs')]);
  res.json({accounts:users.map(u=>({...publicUser(u),memberships:members.filter(m=>m.user_id===u.id).map(m=>({club_id:m.club_id,club_name:clubs.find(c=>c.id===m.club_id)?.name||'Unknown club',role:m.role,committee:m.committee||'General'}))})).sort((a,b)=>a.name.localeCompare(b.name)),clubs:clubs.map(c=>({id:c.id,name:c.name,owner_id:c.owner_id||null,president_name:users.find(u=>u.id===c.owner_id)?.name||''}))});
 });

 // All reads and validation happen before any writes in a Firestore transaction.
 async function planAssignment(tx,b,u){
  if(b.club_id&&b.new_club)fail(400,'Choose an existing club or a new club, not both.');
  if(b.role==='partner'){
   if(b.club_id||b.new_club)fail(400,'Partner accounts stay external to clubs. Share a Delivery project using their account ID.');
   return null;
  }
  if(u.platform_role==='partner')fail(400,'Use a separate student account for club membership; this account is an external partner.');
  if(b.role==='president'&&!b.club_id&&!b.new_club)fail(400,'Choose a club or create a club for this president.');
  if(b.role==='member'&&b.new_club)fail(400,'Create a new club with a president first.');
  if(!b.club_id&&!b.new_club)return null; // Unassigned student/member account.
  if(b.new_club){const cid=randomUUID();return {club_id:cid,write(){tx.create(ref('clubs',cid),{id:cid,...b.new_club,owner_id:u.id});tx.create(ref('members',mid(cid,u.id)),{club_id:cid,user_id:u.id,name:u.name,role:'president',committee:'Leadership'});}};}
  const c=await tx.get(ref('clubs',b.club_id));if(!c.exists)fail(404,'Club not found.');
  const target=await tx.get(ref('members',mid(c.id,u.id))),owner=c.data().owner_id;
  if(b.role==='member'&&(owner===u.id||target.exists&&target.data().role==='president'))fail(409,'Transfer the presidency before assigning this person as a member.');
  let previous=null;
  if(b.role==='president'&&owner&&owner!==u.id){
   if(!b.replace_president)fail(409,'This club already has a president. Confirm the leadership transfer.');
   if(b.expected_owner_id!==owner)fail(409,'The club president changed. Refresh and confirm the current president.');
   previous=await tx.get(ref('members',mid(c.id,owner)));
   if(!previous.exists||previous.data().role!=='president')fail(409,'Club leadership records are inconsistent. Repair them before replacing the president.');
  }
  return {club_id:c.id,write(actor){
   const data={club_id:c.id,user_id:u.id,name:u.name,role:b.role,committee:b.role==='president'?'Leadership':b.committee||'General'};
   if(previous){tx.update(previous.ref,{role:'officer'});tx.create(ref('handovers',randomUUID()),{club_id:c.id,from_id:owner,from_name:previous.data().name,to_id:u.id,to_name:u.name,note:'Leadership assigned by a platform administrator.',initiated_by:actor.id,created_at:now()});}
   if(b.role==='president')tx.update(c.ref,{owner_id:u.id});
   if(target.exists)tx.update(target.ref,data);else tx.create(ref('members',mid(c.id,u.id)),data);
  }};
 }

 app.post('/api/admin/accounts',async(req,res)=>{
  const b=z.object({name:text,email,password:password.optional(),organization:text.optional(),...assignment}).strict().parse(req.body);
  const initial=b.password||randomBytes(18).toString('base64url');
  const u={id:randomUUID(),name:b.name,email:b.email,password:await bcrypt.hash(initial,12),platform_role:b.role==='partner'?'partner':'standard',...(b.organization?{organization:b.organization}:{}),created_at:now(),created_by:req.user.id};
  let clubId=null;
  await db.runTransaction(async tx=>{
   const actor=await tx.get(ref('users',req.user.id));if(!actor.exists||actor.data().platform_role!=='admin')fail(403,'Administrator access required.');
   const lookup=ref('emails',emailKey(b.email));if((await tx.get(lookup)).exists)fail(409,'This email is already registered. Use Assign club role for an existing account.');
   const plan=await planAssignment(tx,b,u);clubId=plan?.club_id||null;
   tx.create(lookup,{user_id:u.id});tx.create(ref('users',u.id),u);plan?.write(req.user);
   tx.create(ref('account_audit',randomUUID()),{action:'account_created',actor_id:req.user.id,target_id:u.id,assigned_role:b.role,club_id:clubId,created_at:now()});
  });
  res.status(201).json({account:publicUser(u),club_id:clubId,initial_password:initial});
 });

 app.post('/api/admin/assignments',async(req,res)=>{
  const b=z.object({...assignment,role:z.enum(['president','member']),user_id:z.string().uuid()}).strict().parse(req.body);
  if(!b.club_id&&!b.new_club)fail(400,'Choose a club.');
  let clubId;
  await db.runTransaction(async tx=>{
   const actor=await tx.get(ref('users',req.user.id));if(!actor.exists||actor.data().platform_role!=='admin')fail(403,'Administrator access required.');
   const user=await tx.get(ref('users',b.user_id));if(!user.exists)fail(404,'Account not found.');
   const plan=await planAssignment(tx,b,{...user.data(),id:user.id});clubId=plan.club_id;plan.write(req.user);
   tx.create(ref('account_audit',randomUUID()),{action:'club_role_assigned',actor_id:req.user.id,target_id:user.id,assigned_role:b.role,club_id:clubId,created_at:now()});
  });res.json({ok:true,club_id:clubId});
 });
}
