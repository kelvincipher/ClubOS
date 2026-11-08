import {cookies} from 'next/headers';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function proxy(request, context) {
  const jar = await cookies();
  if (request.method !== 'GET') {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return Response.json({error:'Invalid origin'}, {status:403});
  }
  const {path} = await context.params;
  if (path.join('/') === 'auth/logout') {
    jar.delete('clubos_session'); return Response.json({ok:true});
  }
  if (path.join('/') === 'me' && !jar.get('clubos_session')) return Response.json({error:'Please sign in again.'},{status:401});
  const base = process.env.API_URL;
  if (!base) return Response.json({error:'Set API_URL in the Vercel environment and redeploy.'},{status:503});
  try {
    const response = await fetch(`${base.replace(/\/$/,'')}/api/${path.map(encodeURIComponent).join('/')}${new URL(request.url).search}`, {
      method:request.method, headers:{'Content-Type':'application/json', ...(jar.get('clubos_session') ? {Authorization:`Bearer ${jar.get('clubos_session').value}`} : {})},
      ...(request.method !== 'GET' ? {body: await request.text()}:{}), cache:'no-store', signal:AbortSignal.timeout(90000)
    });
    const data = await response.json();
    if (data.token) { jar.set('clubos_session',data.token,{httpOnly:true, secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*7}); delete data.token; }
    if(response.status===401) jar.delete('clubos_session');
    return Response.json(data,{status:response.status,headers:{'Cache-Control':'private, no-store'}});
  } catch { return Response.json({error:'API unavailable. Render may be waking up; wait about a minute and try again.'},{status:503}); }
}
export {proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE};
