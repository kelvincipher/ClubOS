'use client';
import {useEffect,useState} from 'react';
const valid=value=>['system','light','dark'].includes(value);
export default function ThemePicker(){
 const [theme,setTheme]=useState('system');
 useEffect(()=>{
  let saved='system';try{const value=localStorage.getItem('clubos-theme');if(valid(value))saved=value}catch{}
  setTheme(saved);
  const media=window.matchMedia('(prefers-color-scheme: dark)');
  const apply=value=>{document.documentElement.dataset.theme=value==='system'?(media.matches?'dark':'light'):value};
  apply(saved);
  const change=()=>{if(document.documentElement.dataset.themeChoice==='system')apply('system')};
  const storage=e=>{if(e.key==='clubos-theme'||e.key===null){const value=valid(e.newValue)?e.newValue:'system';setTheme(value);document.documentElement.dataset.themeChoice=value;apply(value)}};
  document.documentElement.dataset.themeChoice=saved;
  media.addEventListener('change',change);window.addEventListener('storage',storage);
  return()=>{media.removeEventListener('change',change);window.removeEventListener('storage',storage)};
 },[]);
 function change(e){const value=e.target.value;setTheme(value);document.documentElement.dataset.themeChoice=value;document.documentElement.dataset.theme=value==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):value;try{localStorage.setItem('clubos-theme',value)}catch{}}
 return <label className="theme-picker"><span className="sr-only">Color theme</span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none"/></svg><select aria-label="Color theme" value={theme} onChange={change}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>;
}
