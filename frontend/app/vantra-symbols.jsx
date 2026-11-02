/** Vantra Symbols · original SVG artwork. 24-unit grid, 1.7-unit round strokes.
 * Functional marks use one optional accent surface; illustrations share the same
 * silhouettes at a larger scale. All interface icons are decorative beside labels.
 */
import {useId} from 'react';
const shapes={
 ArrowUpRight:<><path d="M6 18 18 6M7 6h11v11"/></>,
 ArrowRight:<><path d="M4 12h15m-6-6 6 6-6 6"/></>,
 LayoutDashboard:<><rect className="symbol-fill" x="4" y="4" width="6" height="7" rx="1.5"/><rect x="14" y="4" width="6" height="4" rx="1.5"/><rect x="4" y="15" width="6" height="5" rx="1.5"/><rect x="14" y="12" width="6" height="8" rx="1.5"/></>,
 Users:<><circle className="symbol-fill" cx="9" cy="8" r="3"/><path d="M3.5 20v-2a5.5 5.5 0 0 1 11 0v2M16 5a3 3 0 0 1 0 6m2 3c2 .7 3 2.3 3 4v2"/></>,
 CalendarDays:<><rect className="symbol-fill" x="4" y="5" width="16" height="5" rx="1.5"/><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-12 4h2m4 0h2m-8 3h2"/></>,
 BookOpen:<><path className="symbol-fill" d="M12 6c3-2 6-2 9-1v14c-3-1-6-1-9 1Z"/><path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1m0-14v14M6 9l3 1m-3 3 3 1m6-5 3-1"/></>,
 Repeat2:<><path className="symbol-fill" d="m17 3 4 4-4 4Z"/><path d="M3 10V9a2 2 0 0 1 2-2h16M21 14v1a2 2 0 0 1-2 2H3m4-4-4 4 4 4"/></>,
 Plus:<><path d="M12 5v14M5 12h14"/></>,
 Search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></>,
 LogOut:<><path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5m-1-8h12m-4-4 4 4-4 4"/></>,
 ChevronDown:<path d="m6 9 6 6 6-6"/>,
 Check:<path d="m5 12 4.5 4.5L19 7"/>,
 ClubOSMark:<><path d="M20 6.5a9 9 0 1 0 0 11" strokeWidth="4.3"/><path d="M19.6 6.8h.1" stroke="var(--brand-accent, #30796d)" strokeWidth="4.3"/></>,
 Sparkles:<><path className="symbol-fill" d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3Z"/><path d="M20 3v3m-1.5-1.5h3"/></>,
 Download:<><path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/></>,
 X:<path d="m6 6 12 12M6 18 18 6"/>,
 LoaderCircle:<><path d="M20 12a8 8 0 1 1-8-8"/><circle className="symbol-fill" cx="19" cy="5" r="1.5"/></>,
 MapPin:<><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle className="symbol-fill" cx="12" cy="10" r="2.5"/></>,
 QrCode:<><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15 15h3v3h3v3h-6m6-9v3M12 3v4m-9 5h5m4-2v5"/></>,
 ClipboardList:<><rect x="5" y="4" width="14" height="17" rx="2"/><rect className="symbol-fill" x="9" y="2" width="6" height="5" rx="1.5"/><path d="m8 12 1 1 2-2m3 1h2m-8 5h8"/></>,
 Menu:<path d="M4 6h16M4 12h16M4 18h16"/>,
 petal:<><path className="symbol-fill" d="M12 12C1 12 3 2 8 4c2 1 3 4 4 8Zm0 0c0-11 10-9 8-4-1 2-4 3-8 4Zm0 0c11 0 9 10 4 8-2-1-3-4-4-8Zm0 0c0 11-10 9-8 4 1-2 4-3 8-4Z"/><circle cx="12" cy="12" r="2"/></>,
 bolt:<><path className="symbol-fill" d="m14 2-9 12h6l-1 8 9-13h-6Z"/></>,
 flag:<><path className="symbol-fill" d="m5 4 15 4-15 6Z"/><path d="M5 3v18m-2 0h7"/></>,
 orbit:<><circle className="symbol-fill" cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-35 12 12)"/><path d="m5 4-1-1m15 17 1 1"/></>,
 leaf:<><path className="symbol-fill" d="M4 18C1 8 9 3 21 3c0 12-5 20-15 16"/><path d="m3 21 13-13m-7 7V9m4 2h5"/></>,
};
function symbol(name){return function VantraIcon({size=24,className='',...props}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={`vantra-icon ${className}`} {...props}>{shapes[name]}</svg>;};}
export const ArrowUpRight=symbol('ArrowUpRight'),ArrowRight=symbol('ArrowRight'),LayoutDashboard=symbol('LayoutDashboard'),Users=symbol('Users'),CalendarDays=symbol('CalendarDays'),BookOpen=symbol('BookOpen'),Repeat2=symbol('Repeat2'),Plus=symbol('Plus'),Search=symbol('Search'),LogOut=symbol('LogOut'),ChevronDown=symbol('ChevronDown'),Check=symbol('Check'),ClubOSMark=symbol('ClubOSMark'),Sparkles=symbol('Sparkles'),Download=symbol('Download'),X=symbol('X'),LoaderCircle=symbol('LoaderCircle'),MapPin=symbol('MapPin'),QrCode=symbol('QrCode'),ClipboardList=symbol('ClipboardList'),Menu=symbol('Menu');
export const tones={Overview:'blue',Recruitment:'coral',Members:'mint',Events:'amber',Knowledge:'violet',Handover:'blue'};
/** IDs keep colors stable when the directory is sorted, filtered or expanded. */
export function clubIdentity(club={}){
 const category=(club.category||'').toLowerCase();
 const shape=/tech|cod|robot|comput|engineer/.test(category)?'bolt':/art|music|creat|design|photo/.test(category)?'petal':/sport|athlet|game/.test(category)?'flag':/environment|natur|green/.test(category)?'leaf':/academ|science|research|study/.test(category)?'orbit':'Users';
 const key=club.id||club.name||'vantra';let hash=0;for(const char of key)hash=(hash*31+char.charCodeAt(0))>>>0;
 return {shape,tone:['blue','coral','amber','mint','violet'][hash%5]};
}
export function ClubEmblem({club,size=32,className=''}){
 const {shape,tone}=clubIdentity(club);const Icon=symbol(shape);
 return <span className={`club-emblem tone-${tone} ${className}`}><Icon size={size}/></span>;
}
/** Larger original spot drawings. No stock artwork, fonts, emoji or external assets. */
export function Illustration({scene='welcome',className='',label}){
 const key=useId();const kind=scene.toLowerCase();
 const recruitment=/recruit|appli|campaign/.test(kind),events=/event|attendance/.test(kind),knowledge=/knowledge|task|resource/.test(kind),handover=/handover/.test(kind),members=/member|club/.test(kind);
 return <svg className={`vantra-illustration ${className}`} viewBox="0 0 260 180" fill="none" stroke="var(--drawing-ink, #303438)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" {...(label?{role:'img','aria-labelledby':key}:{'aria-hidden':true})} focusable="false">
 {label&&<title id={key}>{label}</title>}
 <ellipse cx="131" cy="157" rx="91" ry="8" fill="var(--drawing-ground, #eeeae3)" stroke="none"/>
 {handover?<>
 <path d="m18 112 35-14 39 12 25 23-12 13-32-19-34 17Z" fill="#e6b9a3"/>
 <path d="m242 99-34-10-41 21-24 27 13 12 29-27 38 11Z" fill="var(--blue, #c4d0f6)"/>
 <path d="m18 112 20-8 17 35-16 5m203-45-19-6-14 35 14 5" fill="#fffdf7"/>
 <path d="m100 49 55-4 8 77-54 5Z" fill="#fffdf7"/>
 <path d="m100 49 10 78 9-1-10-78Z" fill="var(--blue, #c4d0f6)"/><path d="m120 65 22-2m-20 13 22-2m-20 13 17-1"/>
 <path d="m113 112-15-5c-8-3-9 5-5 9l21 18m39-20 14-12c6-5 11 1 7 6l-18 27" fill="#e6b9a3"/>
 <path d="M116 30c20-17 43-12 53 4m-4-10 5 11-12-1"/>
 </>:events?<>
 <path d="m65 49 114-6 5 100-114 7Z" fill="#fffdf7"/>
 <path d="m65 49 114-6 2 24-114 6Z" fill="var(--amber, #f1d28d)"/>
 <path d="m86 35 2 27m65-31 2 27m-86 15 112-6"/>
 <path d="m88 91 16-1m18-1 16-1m18-1 7-1m-73 24 16-1m18-1 16-1"/>
 <path d="m145 126 18-27 19 12-16 29-21 5Z" fill="var(--mint, #c4dfcf)"/><path d="m154 126 5 5 13-15"/>
 <path d="m47 93-10-2m10 10-7 4m160-52 8-6m-7 16 12-1"/>
 </>:knowledge?<>
 <path d="m48 75 54-7 21 9 61-7 7 67-62 7-23-9-51 7Z" fill="#fffdf7"/>
 <path d="m123 77 6 67m-27-76 4 67m-41-45 27-4m-25 17 27-4m45-10 32-4m-30 18 32-4"/>
 <path d="m160 33 28 4-9 39-10-10-13 5Z" fill="var(--violet, #d7c9ed)"/>
 <path d="m65 146 83-4 20 7-84 7Z" fill="var(--blue, #c4d0f6)"/>
 <path d="m35 53 8-3m-2 13 8-2m160 42 8 4m-12 7 5 7"/>
 </>:recruitment?<>
 <path d="m60 77 62-35 72 28-5 76-122 5Z" fill="#fffdf7"/>
 <path d="m84 41 73-4 5 72-74 5Z" fill="#fffdf7"/>
 <circle cx="122" cy="64" r="12" fill="var(--coral, #efbdac)"/><path d="M104 92c0-18 38-20 38-2m-48 13 58-4"/>
 <path d="m60 77 65 40 69-47m-128 81 43-43m80 38-40-41"/>
 <path d="m157 111 25-4 5 30-24 4Z" fill="var(--mint, #c4dfcf)"/><path d="m166 121 5 5 8-12"/>
 <path d="m49 55-10-5m9 16-13 1m168-34 3-8m2 18 9-2"/>
 </>:members?<>
 <path d="m66 137 1-18c1-25 44-27 50-4l3 23" fill="var(--blue, #c4d0f6)"/>
 <circle cx="89" cy="79" r="19" fill="#fffdf7"/>
 <path d="m128 138 2-21c2-25 44-24 47 0l2 24" fill="var(--mint, #c4dfcf)"/>
 <circle cx="152" cy="75" r="19" fill="#fffdf7"/>
 <path d="m86 83 7 1m55-5 7-1m-38 44 14 1m-7-6-1 12"/>
 <path d="m63 51 6 4m-20 6 8 2m122-17 8-5m-4 15 10-1"/>
 <path d="m104 38 13-7 10 10-13 7Z" fill="var(--amber, #f1d28d)"/>
 </>:<>
 <path d="m57 118 21-65 31 7-14 63Z" fill="var(--coral, #efbdac)"/>
 <path d="m96 123 15-82 34 3-5 80Z" fill="var(--blue, #c4d0f6)"/>
 <path d="m140 124 23-63 32 12-20 64Z" fill="var(--amber, #f1d28d)"/>
 <path d="m51 128 147 10-2 13-145-10Z" fill="#fffdf7"/>
 <path d="m82 70 14 4m-18 8 14 4m28-25 15 1m-17 12 15 1m32 7 14 5"/>
 <path d="M69 43c15-16 33-20 48-15m-7-8 9 9-11 3m81 7 2 12m-8-5 13-1"/>
 <circle cx="209" cy="112" r="10" fill="var(--mint, #c4dfcf)"/><path d="m204 112 4 4 6-8"/>
 </>}
 </svg>;
}
