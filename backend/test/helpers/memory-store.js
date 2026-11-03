// Isolated transactional test double; production always uses Firebase Admin SDK.
const copy=v=>v===undefined?v:structuredClone(v);
export class MemoryFirestore {
 constructor(){this.rows=new Map();this.tail=Promise.resolve()}
 collection(name){const db=this;
  const query=filters=>({where:(k,op,v)=>{if(op!=='==')throw Error('Only equality supported');return query([...filters,[k,v]])},limit:n=>({...query(filters),get:async()=>{const r=await query(filters).get();return {...r,docs:r.docs.slice(0,n)}}}),get:async()=>({docs:[...db.rows.entries()].filter(([k,v])=>k.startsWith(name+'/')&&filters.every(([f,x])=>v[f]===x)).map(([k])=>db.snapshot(k))})});
  return {...query([]),doc(id){const key=name+'/'+id;return {id,path:key,get:async()=>db.snapshot(key),set:async data=>db.rows.set(key,copy(data)),update:async data=>{if(!db.rows.has(key))throw Error('Missing document');db.rows.set(key,{...db.rows.get(key),...copy(data)})}}}};
 }
 snapshot(key){const v=this.rows.get(key),split=key.indexOf('/'),ref=this.collection(key.slice(0,split)).doc(key.slice(split+1));return {id:ref.id,ref,exists:v!==undefined,data:()=>copy(v)}}
 batch(){const ops=[];const b={create:(r,v)=>{ops.push(['create',r,v]);return b},set:(r,v)=>{ops.push(['set',r,v]);return b},update:(r,v)=>{ops.push(['update',r,v]);return b},commit:async()=>this.commit(ops)};return b}
 commit(ops){const before=new Map(this.rows);try{for(const [op,r,v]of ops){if(op==='create'&&this.rows.has(r.path))throw Error('Already exists');if(op==='update'&&!this.rows.has(r.path))throw Error('Missing document');this.rows.set(r.path,copy(op==='update'?{...this.rows.get(r.path),...v}:v))}}catch(e){this.rows=before;throw e}}
 runTransaction(fn){const run=async()=>{const ops=[];const tx={get:r=>r.get(),create:(r,v)=>ops.push(['create',r,v]),update:(r,v)=>ops.push(['update',r,v])};const result=await fn(tx);this.commit(ops);return result};const next=this.tail.then(run,run);this.tail=next.catch(()=>{});return next}
 async terminate(){}
}
