'use client';
import {useEffect,useRef,useState} from 'react';
import {Plus,Search,Repeat2,Users,Check,X} from './vantra-symbols';

const roles={admin:'Administrator',partner:'Partner',standard:'Student'};
function AccountForm({clubs,target,busy,onCancel,onSave}){
 const [role,setRole]=useState('member'),[clubId,setClubId]=useState('');
 const selected=clubs.find(c=>c.id===clubId),transfer=role==='president'&&selected?.owner_id&&selected.owner_id!==target?.id;
 function submit(e){
  e.preventDefault();const f=new FormData(e.currentTarget),body={role};
  if(target)body.user_id=target.id;
  else{body.name=f.get('name');body.email=f.get('email');if(f.get('password'))body.password=f.get('password');if(role==='partner'&&f.get('organization'))body.organization=f.get('organization');}
  if(role!=='partner'){
   if(clubId==='new')body.new_club={name:f.get('club_name'),description:f.get('club_description'),category:f.get('club_category')};
   else if(clubId)body.club_id=clubId;
   if(role==='member')body.committee=f.get('committee')||'General';
   if(transfer){body.replace_president=f.get('replace_president')==='on';body.expected_owner_id=selected.owner_id;}
  }
  onSave(body);
 }
 return <form className="workflow-form admin-account-form" onSubmit={submit} aria-busy={busy}>
  <div className="section-title"><h2>{target?'Assign a club role':'Create account'}</h2><button type="button" className="icon-button" aria-label="Close account form" disabled={busy} onClick={onCancel}><X size={20}/></button></div>
  {target?<p className="meta">{target.name} · {target.email}</p>:<><div className="workflow-grid"><label>Full name<input name="name" required maxLength={200} autoComplete="off"/></label><label>Email address<input name="email" type="email" required maxLength={254} autoComplete="off"/></label></div><label>Initial password (optional)<input name="password" type="password" minLength={12} maxLength={72} autoComplete="new-password" placeholder="Leave blank to generate a secure password"/></label><p className="meta">The initial password is shown once after creation. Existing passwords cannot be viewed.</p></>}
  <label>{target?'Club role':'Account type'}<select aria-label={target?'Club role':'Account type'} value={role} onChange={e=>{setRole(e.target.value);setClubId('')}}>{!target&&<option value="partner">Partner</option>}<option value="president">President</option><option value="member">Member</option></select></label>
  {role==='partner'?<><label>Organization (optional)<input name="organization" maxLength={200}/></label><p className="meta">New partners start outside clubs. Share a Delivery project using their account ID after creation.</p></>:<><label>Club<select aria-label="Club for account" value={clubId} required={role==='president'||!!target} onChange={e=>setClubId(e.target.value)}><option value="">{role==='member'&&!target?'No club yet':'Choose a club'}</option>{clubs.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}{role==='president'&&<option value="new">Create a new club</option>}</select></label>{clubId==='new'&&<fieldset className="admin-new-club"><legend>New club</legend><label>Club name<input name="club_name" required maxLength={200}/></label><label>Category<input name="club_category" required maxLength={200}/></label><label>Club description<textarea name="club_description" rows={3} required minLength={10} maxLength={2000}/></label></fieldset>}{role==='member'&&clubId&&<label>Committee<input name="committee" defaultValue="General" maxLength={200}/></label>}{transfer&&<div className="admin-transfer"><p><strong>{selected.president_name||'The current president'}</strong> will become an officer. Club ownership will transfer to {target?.name||'the new account'}.</p><label className="consent-row"><input name="replace_president" type="checkbox" required/><span>I confirm this leadership transfer.</span></label></div>}</>}
  <div className="dialog-actions"><button className="btn" type="button" disabled={busy} onClick={onCancel}>Cancel</button><button className="btn primary" disabled={busy}>{busy?'Saving…':target?'Assign role':'Create account'}</button></div>
 </form>
}

export default function AdminAccounts({api,currentUser,onAccountsChanged}){
 const [data,setData]=useState({accounts:[],clubs:[]}),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[editor,setEditor]=useState(null),[credentials,setCredentials]=useState(null),[reveal,setReveal]=useState(false),[query,setQuery]=useState(''),[filter,setFilter]=useState('all');
 const panel=useRef(null),mounted=useRef(true),generation=useRef(0),saving=useRef(false);
 async function load(){const version=++generation.current;setLoading(true);try{const result=await api('admin/accounts');if(mounted.current&&version===generation.current)setData(result)}catch(e){if(mounted.current&&version===generation.current)setError(e.message)}finally{if(mounted.current&&version===generation.current)setLoading(false)}}
 useEffect(()=>{mounted.current=true;load();return()=>{mounted.current=false;generation.current++}},[]);
 useEffect(()=>{if(editor){panel.current?.scrollIntoView({block:'start',behavior:'auto'});panel.current?.querySelector('input,select')?.focus()}},[editor]);
 function open(target=null){setEditor({target});setCredentials(null);setReveal(false);setError('');setMessage('')}
 async function save(body){
  if(saving.current)return;saving.current=true;setBusy(true);setError('');setMessage('');
  try{const result=await api(editor.target?'admin/assignments':'admin/accounts','POST',body);if(!mounted.current)return;
   if(result.initial_password)setCredentials({email:result.account.email,password:result.initial_password,id:result.account.id});
   setEditor(null);setMessage(editor.target?'Club role assigned.':'Account created.');await load();if(mounted.current)onAccountsChanged?.();
  }catch(e){if(mounted.current)setError(e.message)}finally{saving.current=false;if(mounted.current)setBusy(false)}
 }
 const accounts=data.accounts.filter(a=>(a.name+' '+a.email+' '+(a.organization||'')).toLowerCase().includes(query.toLowerCase())&&(filter==='all'||filter==='partner'&&a.platform_role==='partner'||filter==='admin'&&a.platform_role==='admin'||['president','member'].includes(filter)&&a.memberships.some(m=>m.role===filter)));
 async function copy(value){try{await navigator.clipboard.writeText(value);setMessage('Copied to clipboard.')}catch{setMessage('Clipboard is unavailable. Select the field and copy it manually.')}}
 return <main id="main" className="public-content admin-page"><div className="page-heading admin-heading"><div><p className="eyebrow">Administration</p><h1 tabIndex={-1}>Accounts</h1></div><button className="btn primary" disabled={busy} onClick={()=>open()}><Plus size={18}/>Create account</button></div>
  {error&&<p className="form-error" role="alert">{error}</p>}{message&&<p className="admin-message" role="status"><Check size={17}/>{message}</p>}
  {credentials&&<section className="admin-credentials" aria-label="New account credentials"><div className="section-title"><h2>New account details</h2><button className="icon-button" aria-label="Dismiss account credentials" onClick={()=>{setCredentials(null);setReveal(false)}}><X size={20}/></button></div><p className="meta">Share privately with the account owner. Closing this panel clears the displayed password.</p><label>Email<input value={credentials.email} readOnly onFocus={e=>e.target.select()}/></label><label>Initial password<input aria-label="Initial password" value={credentials.password} readOnly type={reveal?'text':'password'} onFocus={e=>e.target.select()}/></label><div className="button-group"><button className="btn" onClick={()=>setReveal(!reveal)}>{reveal?'Hide password':'Show password'}</button><button className="btn" onClick={()=>copy(credentials.password)}>Copy password</button></div><label>Account ID<input value={credentials.id} readOnly onFocus={e=>e.target.select()}/></label><button className="text-button" onClick={()=>copy(credentials.id)}>Copy account ID for project sharing</button></section>}
  {editor&&<section ref={panel} className="admin-editor"><AccountForm key={editor.target?.id||'new'} clubs={data.clubs} target={editor.target} busy={busy} onCancel={()=>!busy&&setEditor(null)} onSave={save}/></section>}
  <div className="admin-toolbar"><label className="search-box"><Search size={18}/><input aria-label="Search accounts" placeholder="Search accounts" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Filter accounts" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All accounts</option><option value="admin">Administrators</option><option value="partner">Partners</option><option value="president">Presidents</option><option value="member">Members</option></select><button className="btn" disabled={loading||busy} onClick={()=>{setError('');load()}}><Repeat2 size={17}/>{loading?'Loading…':'Refresh'}</button></div>
  <p className="list-caption">{accounts.length} {accounts.length===1?'account':'accounts'}</p><div className="admin-account-list">{accounts.map(a=><article className="admin-account-row" key={a.id}><div className="admin-person"><strong>{a.name}{a.id===currentUser.id?' (you)':''}</strong><span>{a.email}</span>{a.organization&&<span>{a.organization}</span>}</div><div className="admin-roles"><span className="badge">{roles[a.platform_role]||'Student'}</span>{a.memberships.map(m=><span key={m.club_id}><strong>{m.role[0].toUpperCase()+m.role.slice(1)}</strong> · {m.club_name} · {m.committee}</span>)}{!a.memberships.length&&a.platform_role==='standard'&&<span>No club assigned</span>}</div><div className="admin-row-actions">{a.platform_role==='partner'?<button className="text-button" onClick={()=>copy(a.id)}>Copy partner ID</button>:<button className="text-button" disabled={busy} onClick={()=>open(a)}>Assign club role</button>}</div></article>)}</div>{!loading&&!accounts.length&&<div className="empty"><Users size={30}/><h3>No matching accounts</h3><p>Adjust the search or filter, or create an account.</p></div>}
 </main>
}
