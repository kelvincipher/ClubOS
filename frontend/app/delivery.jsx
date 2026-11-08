'use client';
import {useEffect,useState} from 'react';

const statuses={planned:'Planned',active:'Active',closed:'Closed',todo:'To do',in_progress:'In progress',blocked:'Blocked',review:'In review',done:'Done'};
const label=s=>statuses[s]||s;
const fields=e=>Object.fromEntries(new FormData(e.currentTarget));
function Save({children='Save',busy}){return <button className="btn primary" disabled={busy}>{children}</button>}
function Field({name,title,value,type='text',required=true,...props}){
 return <label>{title}<input name={name} type={type} required={required} defaultValue={value} {...props}/></label>;
}
function ProjectForm({project:p,onSave,busy}){
 return <form className="delivery-form" onSubmit={e=>{e.preventDefault();onSave(fields(e))}}>
  <Field title="Project name" name="name" value={p?.name} maxLength={200}/>
  <Field title="Sponsor or partner" name="sponsor" value={p?.sponsor} maxLength={200}/>
  <label>Description<textarea name="description" maxLength={2000} defaultValue={p?.description}/></label>
  <div className="delivery-grid"><Field title="Start date" name="start" type="date" value={p?.start}/><Field title="End date" name="end" type="date" value={p?.end}/></div>
  <label>Project status<select name="status" defaultValue={p?.status||'planned'}>{['planned','active','closed'].map(s=><option key={s} value={s}>{label(s)}</option>)}</select></label>
  <Save busy={busy}>{p?'Save project':'Create project'}</Save>
 </form>;
}
function CommitmentForm({item,onSave,busy}){
 return <form className="delivery-form" onSubmit={e=>{e.preventDefault();const b=fields(e);onSave({...b,required:Number(b.required)})}}>
  <Field title="Commitment" name="title" value={item?.title} maxLength={200}/>
  <label>Acceptance criteria<textarea name="criteria" required maxLength={1500} defaultValue={item?.criteria}/></label>
  <Field title="Minimum distinct evidence submissions" name="required" type="number" value={item?.required||1} min="1" max="10"/>
  {item&&<p className="meta">Editing a commitment reopens partner review.</p>}
  <Save busy={busy}>{item?'Save commitment':'Add commitment'}</Save>
 </form>;
}
function Evidence({items}){
 return items.length?<ul className="delivery-evidence">{items.map((e,i)=><li key={i}>{e.url&&<a href={e.url} target="_blank" rel="noopener noreferrer">{e.url}</a>}{e.note&&<p>{e.note}</p>}</li>)}</ul>:<p className="meta">No evidence submitted.</p>;
}
export default function Delivery({api,user,clubs,cache}){
 const [club,setClub]=useState(''),[id,setId]=useState(''),[p,setProject]=useState(null),[projects,setProjects]=useState([]),[shared,setShared]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[report,setReport]=useState(false),[version,setVersion]=useState(0);
 const selected=club||clubs[0]?.id||'';
 const active=clubs.find(c=>c.id===selected);
 const members=cache[p?.club_id]?.members||[];
 const name=uid=>members.find(m=>m.user_id===uid)?.name||'Unassigned';
 const canCreate=['president','officer'].includes(active?.role);
 useEffect(()=>{let live=true;
  Promise.all([api('delivery/shared'),selected?api('clubs/'+selected+'/delivery'):[]]).then(([s,l])=>{if(live){setShared(s);setProjects(l)}}).catch(e=>{if(live)setError(e.message)});
  return()=>{live=false};
 },[api,selected,version]);
 useEffect(()=>{let live=true;
  if(id)api('delivery/'+id).then(x=>{if(live)setProject(x)}).catch(e=>{if(live){setProject(null);setError(e.message)}});
  return()=>{live=false};
 },[api,id,version]);
 function open(next){setProject(null);setReport(false);setError('');setId(next)}
 async function save(path,method,body,after){
  setBusy(true);setError('');
  try{const out=await api(path,method,body);after?.(out);setVersion(v=>v+1)}
  catch(e){setError(e.message);if(e.status===409)setVersion(v=>v+1)}
  finally{setBusy(false)}
 }
 const path='delivery/'+id;
 const manager=p?.access==='manager',partner=p?.access==='partner';
 return <div className="delivery">
  {error&&<p role="alert" className="notice error">{error}</p>}
  {!id?<><p className="reading">Manage sponsor commitments, assigned work and partner acceptance.</p>
   <details className="delivery-card"><summary>Partner account ID</summary><p>Share this ID with a club officer to receive access.</p><code>{user.id}</code></details>
   {clubs.length>0&&<section className="delivery-card"><h2>Club projects</h2><label>Club<select value={selected} onChange={e=>{setProjects([]);setClub(e.target.value)}}>{clubs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    {projects.map(x=><button key={x.id} className="btn" onClick={()=>open(x.id)}>{x.name} · {label(x.status)}</button>)}
    {!projects.length&&<p className="meta">No projects in this club.</p>}
    {canCreate&&<details><summary>New sponsored project</summary><ProjectForm busy={busy} onSave={b=>save('clubs/'+selected+'/delivery','POST',b,x=>open(x.id))}/></details>}
   </section>}
   <section className="delivery-card"><h2>Shared with you</h2>{shared.map(x=><button key={x.id} className="btn" onClick={()=>open(x.id)}>{x.name} · {x.sponsor}</button>)}{!shared.length&&<p className="meta">No shared projects.</p>}</section>
  </>:<>
   <div className="delivery-controls"><button className="btn" onClick={()=>open('')}>Back to projects</button><button className="btn" onClick={()=>setVersion(v=>v+1)}>Refresh</button>
    {p&&<button className="btn" onClick={()=>setReport(!report)}>{report?'Back to project':'Final report'}</button>}
    {p&&report&&<button className="btn primary" onClick={()=>window.print()}>Print / Save as PDF</button>}
   </div>
   {!p&&!error&&<p role="status">Loading project…</p>}
   {p&&<article className={report?'delivery-report':''}>
    <header className="delivery-card"><h2>{p.name}</h2><p>{p.club_name} · {p.sponsor}</p><p>{p.start} to {p.end} · {label(p.status)}</p><p>{p.description}</p>
     <p><strong>{p.commitments.filter(c=>c.status==='Accepted').length} / {p.commitments.length} commitments accepted</strong></p></header>
    {manager&&!report&&<section className="delivery-card">
     <details><summary>Edit project</summary><ProjectForm key={p.revision} project={p} busy={busy} onSave={b=>save(path,'PATCH',b)}/></details>
     <details><summary>Share with partner</summary><form key={p.partner_id||''} className="delivery-form" onSubmit={e=>{e.preventDefault();const {partner_id}=fields(e);save(path+'/partner','PUT',{partner_id:partner_id.trim()||null})}}>
      <Field name="partner_id" title="Registered external account ID (blank to revoke)" value={p.partner_id||''} required={false}/>
      <Save busy={busy}>Save partner access</Save>
     </form></details>
     <details><summary>New commitment</summary><CommitmentForm key={p.commitments.length} busy={busy} onSave={b=>save(path+'/commitments','POST',b)}/></details>
    </section>}
    {!p.commitments.length&&<p>No commitments recorded.</p>}
    {p.commitments.map(c=><section className="delivery-card" key={c.id}>
     <h3>{c.title}</h3><p><span className={'badge '+(c.status==='Accepted'?'good':'wait')}>{c.status}</span> · {c.evidence.length} / {c.required} evidence minimum</p>
     <p><strong>Acceptance criteria</strong> {c.criteria}</p>{c.feedback&&<p><strong>Partner feedback</strong> {c.feedback}</p>}
     <Evidence items={c.evidence}/>
     {!report&&manager&&<details><summary>Edit commitment</summary><CommitmentForm key={p.revision} item={c} busy={busy} onSave={b=>save(path+'/commitments/'+c.id,'PATCH',b)}/></details>}
     {c.tasks?.map(t=><div className="delivery-task" key={t.id}>
      <h4>{t.title}</h4><p>{t.description}</p><p>{name(t.assignee_id)} · {t.due_at?new Date(t.due_at).toLocaleString():'No deadline'} · {label(t.status)}</p>
      {!report&&(manager||t.assignee_id===user.id)&&<details><summary>Update task or submit evidence</summary>
       <form className="delivery-form" key={`task-${t.revision}`} onSubmit={e=>{e.preventDefault();save('tasks/'+t.id,'PATCH',{...fields(e),expected_revision:t.revision})}}>
        <label>Task status<select name="status" defaultValue={t.status}>{['todo','in_progress','blocked','review','done'].map(s=><option key={s} value={s}>{label(s)}</option>)}</select></label><Save busy={busy}>Update task</Save>
       </form>
       <form className="delivery-form" key={`evidence-${p.revision}`} onSubmit={e=>{e.preventDefault();save(path+'/tasks/'+t.id+'/evidence','PUT',fields(e))}}>
        <Field title="Shareable evidence URL" name="url" type="url" required={false} maxLength={1000} value={c.evidence.find(x=>x.task_id===t.id)?.url}/>
        <label>Completion note or aggregate attendance<textarea name="note" maxLength={500} defaultValue={c.evidence.find(x=>x.task_id===t.id)?.note}/></label>
        <p className="meta">Evidence is visible to the shared partner. Use aggregate figures and links approved for sharing.</p><Save busy={busy}>Submit evidence</Save>
       </form>
      </details>}
     </div>)}
     {!report&&manager&&<details><summary>Assign a linked task</summary><form className="delivery-form" key={c.tasks?.length} onSubmit={e=>{e.preventDefault();const b=fields(e);save('clubs/'+p.club_id+'/tasks','POST',{...b,due_at:new Date(b.due_at).toISOString(),scope:'individual',delivery_project_id:id,delivery_commitment_id:c.id})}}>
      <Field title="Task title" name="title" maxLength={200}/><label>Description<textarea name="description" maxLength={4000}/></label>
      <label>Assigned member<select name="assignee_id" required defaultValue=""><option value="" disabled>Select member</option>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.name}</option>)}</select></label>
      <Field title="Deadline" name="due_at" type="datetime-local"/><Save busy={busy}>Assign task</Save>
     </form></details>}
     {!report&&partner&&<form className="delivery-form" key={p.revision} onSubmit={e=>{e.preventDefault();const b=fields(e);save(path+'/commitments/'+c.id+'/review','POST',{...b,decision:e.nativeEvent.submitter?.value||'revision',expected_revision:p.revision})}}>
      <label>Partner feedback<textarea name="feedback" maxLength={1500} defaultValue={c.feedback}/></label>
      <div className="delivery-controls"><button className="btn" value="revision" disabled={busy}>Request revision</button><button className="btn primary" value="accepted" disabled={busy||c.evidence.length<c.required}>Accept commitment</button></div>
     </form>}
    </section>)}
   </article>}
  </>}
 </div>;
}
