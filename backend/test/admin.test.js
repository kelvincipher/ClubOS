import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import {createApp} from '../src/app.js';
import {bootstrapAdmin} from '../src/admin.js';
import {createHash} from 'node:crypto';
import {MemoryFirestore} from './helpers/memory-store.js';
const secret='isolated-admin-test-secret-over-32-characters';
const initial='Initial-password-123!';
const call=(app,u,method,path,body)=>request(app)[method]('/api/'+path).set('Authorization','Bearer '+jwt.sign({sub:u.id,platform_role:'admin'},secret)).send(body);
async function person(db,name,platform_role='standard'){const id=randomUUID(),user={id,name,email:id+'@example.test',password:await bcrypt.hash(initial,12),platform_role};await db.collection('users').doc(id).set(user);return user}
async function fixture(){const db=new MemoryFirestore(),app=createApp(db,secret),admin=await person(db,'Administrator','admin');return {db,app,admin}}

test('admin-only account creation; partner, president and member sign in; no password leakage or session replacement',async()=>{
 const {db,app,admin}=await fixture(),ordinary=await person(db,'Ordinary member');
 assert.equal((await request(app).get('/api/admin/accounts')).status,401);
 assert.equal((await call(app,ordinary,'get','admin/accounts')).status,403);
 assert.equal((await call(app,ordinary,'post','admin/accounts',{name:'Escalation',email:'e@example.test',role:'partner'})).status,403);
 const create=(body)=>call(app,admin,'post','admin/accounts',body);
 let r=await create({name:'Campus partner',email:'PARTNER@example.test',role:'partner',organization:'Campus Co'});assert.equal(r.status,201,JSON.stringify(r.body));const partner=r.body.account;assert.equal(partner.platform_role,'partner');assert.equal(partner.email,'partner@example.test');assert.ok(r.body.initial_password.length>=12);assert.equal(r.body.token,undefined);assert.equal(partner.password,undefined);
 const generated=r.body.initial_password;assert.ok(await bcrypt.compare(generated,(await db.collection('users').doc(partner.id).get()).data().password));
 assert.equal((await request(app).post('/api/auth/login').send({email:partner.email,password:generated})).status,200);
 assert.equal((await call(app,partner,'post','clubs',{name:'Privilege escalation',description:'Partners cannot create clubs.',category:'Test'})).status,403);
 r=await create({name:'New president',email:'president@example.test',password:initial,role:'president',new_club:{name:'Science club',description:'A new club for science projects.',category:'Technology'}});assert.equal(r.status,201,JSON.stringify(r.body));const president=r.body.account,cid=r.body.club_id;
 let club=(await call(app,president,'get',`clubs/${cid}`)).body;assert.equal(club.membership.role,'president');assert.equal(club.club.owner_id,president.id);
 r=await create({name:'New member',email:'member@example.test',role:'member',club_id:cid,committee:'Design'});assert.equal(r.status,201,JSON.stringify(r.body));const member=r.body.account;assert.equal((await call(app,member,'get',`clubs/${cid}`)).body.membership.committee,'Design');
 assert.equal((await request(app).post('/api/auth/login').send({email:member.email,password:r.body.initial_password})).status,200);
 assert.equal((await request(app).post('/api/auth/login').send({email:president.email,password:initial})).status,200);
 assert.equal((await call(app,president,'get','admin/accounts')).status,403);assert.equal((await call(app,partner,'get','admin/accounts')).status,403);
 const list=await call(app,admin,'get','admin/accounts');assert.equal(list.status,200);const serialized=JSON.stringify(list.body);assert.ok(!serialized.includes('password'));assert.ok(!serialized.includes(generated));assert.ok(!serialized.includes('$2b$'));assert.equal(list.body.accounts.find(a=>a.id===president.id).memberships[0].role,'president');
 assert.equal((await call(app,admin,'get','me')).body.platform_role,'admin');
 assert.equal((await create({name:'More admins',email:'hack@example.test',role:'admin'})).status,400);
 assert.equal((await create({name:'Invalid password',email:'short@example.test',role:'member',password:'short'})).status,400);
 assert.equal((await create({name:'Invalid club',email:'missing@example.test',role:'member',club_id:randomUUID()})).status,404);
 assert.equal((await create({name:'External',email:'external@example.test',role:'partner',club_id:cid})).status,400);
 const signup=await request(app).post('/api/auth/register').send({name:'Public signup',email:'signup@example.test',password:initial,platform_role:'admin',role:'admin'});assert.equal(signup.status,201);assert.equal(signup.body.user.platform_role,'standard');
 await db.collection('users').doc(admin.id).update({platform_role:'standard'});assert.equal((await call(app,admin,'get','admin/accounts')).status,403);
});

test('explicit president transfer, assigning existing accounts, duplicate-email races and atomic failures',async()=>{
 const {db,app,admin}=await fixture(),first=await person(db,'Current president'),existing=await person(db,'Existing student'),partner=await person(db,'External partner','partner');
 let r=await call(app,first,'post','clubs',{name:'Debate club',description:'Practice debating with students.',category:'Academic'});const cid=r.body.id;
 const body={name:'Next president',email:'next@example.test',role:'president',club_id:cid};
 assert.equal((await call(app,admin,'post','admin/accounts',body)).status,409);
 assert.equal((await call(app,admin,'post','admin/accounts',{...body,replace_president:true,expected_owner_id:randomUUID()})).status,409);
 r=await call(app,admin,'post','admin/accounts',{...body,replace_president:true,expected_owner_id:first.id});assert.equal(r.status,201,JSON.stringify(r.body));const next=r.body.account;
 const state=(await call(app,next,'get',`clubs/${cid}`)).body;assert.equal(state.club.owner_id,next.id);assert.equal(state.members.filter(m=>m.role==='president').length,1);assert.equal(state.members.find(m=>m.user_id===first.id).role,'officer');assert.equal(state.handovers[0].initiated_by,admin.id);
 r=await call(app,admin,'post','admin/assignments',{user_id:existing.id,role:'member',club_id:cid,committee:'Events'});assert.equal(r.status,200);assert.equal((await call(app,existing,'get',`clubs/${cid}`)).body.membership.committee,'Events');
 assert.equal((await call(app,admin,'post','admin/assignments',{user_id:next.id,role:'member',club_id:cid})).status,409);
 assert.equal((await call(app,admin,'post','admin/assignments',{user_id:partner.id,role:'member',club_id:cid})).status,400);
 assert.equal((await call(app,admin,'post','admin/assignments',{user_id:randomUUID(),role:'member',club_id:cid})).status,404);
 const before=(await db.collection('users').get()).docs.length;
 const results=await Promise.all([call(app,admin,'post','admin/accounts',{name:'Unique one',email:'unique@example.test',role:'member'}),call(app,admin,'post','admin/accounts',{name:'Unique two',email:'UNIQUE@example.test',role:'member'})]);assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);assert.equal((await db.collection('users').get()).docs.length,before+1);
 const audit=(await db.collection('account_audit').get()).docs.map(d=>d.data());assert.ok(audit.some(a=>a.action==='club_role_assigned'&&a.target_id===existing.id));assert.ok(!JSON.stringify(audit).includes('password'));
});

test('first admin setup creates once; existing-account promotion verifies password without resetting it',async()=>{
 let db=new MemoryFirestore();
 assert.deepEqual(await bootstrapAdmin(db,{}),{skipped:true});
 const env={BOOTSTRAP_ADMIN_EMAIL:'admin@example.test',BOOTSTRAP_ADMIN_PASSWORD:initial,BOOTSTRAP_ADMIN_NAME:'Owner'};
 const result=await bootstrapAdmin(db,env);assert.equal(result.created,true);const account=(await db.collection('users').doc(result.user_id).get()).data();assert.equal(account.platform_role,'admin');assert.ok(await bcrypt.compare(initial,account.password));
 assert.equal((await bootstrapAdmin(db,{...env,BOOTSTRAP_ADMIN_EMAIL:'second@example.test',BOOTSTRAP_ADMIN_PASSWORD:'Another-password-123!'})).already_configured,true);assert.equal((await db.collection('users').get()).docs.length,1);
 assert.ok(!JSON.stringify((await db.collection('system').get()).docs.map(d=>d.data())).includes(initial));
 db=new MemoryFirestore();const user=await person(db,'Existing owner');const key=createHash('sha256').update(user.email).digest('hex');await db.collection('emails').doc(key).set({user_id:user.id});
 await assert.rejects(bootstrapAdmin(db,{BOOTSTRAP_ADMIN_EMAIL:user.email,BOOTSTRAP_ADMIN_PASSWORD:'Wrong-password-123!'}));assert.equal((await db.collection('users').doc(user.id).get()).data().platform_role,'standard');
 await bootstrapAdmin(db,{BOOTSTRAP_ADMIN_EMAIL:user.email,BOOTSTRAP_ADMIN_PASSWORD:initial});const promoted=(await db.collection('users').doc(user.id).get()).data();assert.equal(promoted.platform_role,'admin');assert.equal(promoted.password,user.password);
});
