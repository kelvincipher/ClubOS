import './globals.css';
export const metadata={title:'ClubOS',description:'University club membership, events, and management.'};
const themeScript=`(()=>{let t='system';try{const v=localStorage.getItem('clubos-theme');if(['light','dark','system'].includes(v))t=v}catch{}document.documentElement.dataset.themeChoice=t;document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t})()`;
export default function Layout({children}){return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}}/></head><body>{children}</body></html>}
