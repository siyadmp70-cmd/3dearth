import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import EarthVideo from './experience/EarthVideo.jsx';
import SpaceField from './experience/SpaceField.jsx';
import './style.css';

const chapters = [
  { id: 'orbit', label: '01 / ORIGIN', title: 'Beyond the\nfamiliar.', copy: 'An exploration of our planet from a different perspective.', align: 'left' },
  { id: 'approach', label: '02 / APPROACH', title: 'One planet.\nCountless perspectives.', copy: 'From up here, every border gives way to a shared horizon.', align: 'left' },
  { id: 'daylight', label: '03 / ORBIT', title: 'A world\nin motion.', copy: 'Clouds gather. Oceans turn. The blue hour keeps moving.', align: 'right' },
  { id: 'terminator', label: '04 / HORIZON', title: 'Where day\nbecomes night.', copy: 'A thousand small lights gather at the edge of the dark.', align: 'left' },
  { id: 'night', label: '05 / SIGNAL', title: 'Still connected.', copy: 'From orbit, even the farthest lights belong to one another.', align: 'right' },
  { id: 'crescent', label: '06 / ECLIPSE', title: 'The thin line\nbetween worlds.', copy: 'One last arc of atmosphere catches the light.', align: 'left' },
  { id: 'distance', label: '07 / DEPARTURE', title: 'Perspective\nchanges everything.', copy: 'Look farther.', align: 'center' },
  { id: 'end', label: '08 / ELSEWHERE', title: 'Explore beyond\nthe obvious.', copy: 'A small place. A wider view.', align: 'center' },
];

const timeline = [0, .12, .27, .42, .57, .72, .87, 1];

function App(){
  const progressRef=useRef(0); const scrollingRef=useRef({active:false}); const pointerRef=useRef({x:0,y:0}); const orbitModeRef=useRef(false); const timeDilationRef=useRef(false); const [progress,setProgress]=useState(0); const [ready,setReady]=useState(false); const [webgl,setWebgl]=useState(true); const [menu,setMenu]=useState(false); const [orbitMode,setOrbitMode]=useState(false); const [orbitLocked,setOrbitLocked]=useState(false); const [timeDilation,setTimeDilation]=useState(false); const [signal,setSignal]=useState(false); const [earthMessage,setEarthMessage]=useState(false); const [edgeNavigation,setEdgeNavigation]=useState(''); const [idleTick,setIdleTick]=useState(0);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(()=>{let raf,idleTimer;const update=()=>{scrollingRef.current.active=true;clearTimeout(idleTimer);idleTimer=setTimeout(()=>{scrollingRef.current.active=false;setIdleTick(v=>v+1);},reduced?650:420);cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const max=document.documentElement.scrollHeight-innerHeight;const p=max>0?window.scrollY/max:0;progressRef.current=p;setProgress(p);});};const pointerMove=e=>{pointerRef.current={x:(e.clientX/innerWidth-.5)*2,y:(e.clientY/innerHeight-.5)*2};if(e.clientX<24)setEdgeNavigation('previous');else if(e.clientX>innerWidth-24)setEdgeNavigation('next');};window.addEventListener('scroll',update,{passive:true});window.addEventListener('pointermove',pointerMove,{passive:true});update();return()=>{window.removeEventListener('scroll',update);window.removeEventListener('pointermove',pointerMove);cancelAnimationFrame(raf);clearTimeout(idleTimer);};},[reduced]);
  useEffect(()=>{orbitModeRef.current=orbitMode;},[orbitMode]);
  useEffect(()=>{timeDilationRef.current=timeDilation;},[timeDilation]);
  useEffect(()=>{let timer,hide;if(progress>=.55&&progress<=.63&&!scrollingRef.current.active){timer=setTimeout(()=>{setSignal(true);hide=setTimeout(()=>setSignal(false),4200);},2400);}else setSignal(false);return()=>{clearTimeout(timer);clearTimeout(hide);};},[progress,idleTick]);
  useEffect(()=>{let holdTimer;const keydown=e=>{const target=e.target;const editing=target instanceof HTMLElement&&(target.isContentEditable||/INPUT|TEXTAREA|SELECT/.test(target.tagName));if(editing||e.metaKey||e.ctrlKey||e.altKey)return;if(e.key.toLowerCase()==='o'){setOrbitMode(v=>!v);return;}if(e.key==='Escape'){setOrbitMode(false);setTimeDilation(false);}};const down=e=>{if(activeChapterRef.current!==2||e.target?.closest?.('a,button'))return;clearTimeout(holdTimer);holdTimer=setTimeout(()=>setTimeDilation(true),850);};const up=()=>{clearTimeout(holdTimer);setTimeDilation(false);};const click=e=>{if(activeChapterRef.current!==2||e.target?.closest?.('a,button,.copy-block'))return;const dx=e.clientX-innerWidth*.53,dy=e.clientY-innerHeight*.49;if(Math.hypot(dx/(innerWidth*.5),dy/(innerHeight*.42))<.62){setEarthMessage(true);setTimeout(()=>setEarthMessage(false),3200);}};window.addEventListener('keydown',keydown);window.addEventListener('pointerdown',down);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);window.addEventListener('click',click);return()=>{window.removeEventListener('keydown',keydown);window.removeEventListener('pointerdown',down);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);window.removeEventListener('click',click);clearTimeout(holdTimer);};},[]);
  const activeChapterRef=useRef(0);
  const active=chapters.reduce((n,c,i)=>progress>=timeline[i]?i:n,0);
  activeChapterRef.current=active;
  const distanceValue=progress<.2?12400000-Math.max(0,(progress-.12)/.08)*3700000:progress<.32?8700000-((progress-.2)/.12)*6300000:progress<.4?2400000*(1-(progress-.32)/.08):0;
  const signalLatency=Math.round(142-Math.max(0,Math.min(1,(progress-.12)/.28))*100);
  const navigateChapter=direction=>{const next=Math.max(0,Math.min(chapters.length-1,active+direction));document.getElementById(chapters[next].id)?.scrollIntoView({behavior:reduced?'auto':'smooth'});};
  const navigateChapterRef=useRef(navigateChapter);navigateChapterRef.current=navigateChapter;
  useEffect(()=>{let startX=0,startY=0,lastY=0,holdTimer,releaseTimer,triggered=false;const touchStart=e=>{clearTimeout(holdTimer);triggered=false;if(e.touches.length===1){startX=e.touches[0].clientX;startY=lastY=e.touches[0].clientY;}};const touchMove=e=>{if(e.touches.length!==1)return;lastY=e.touches[0].clientY;if(startY-lastY>150&&!holdTimer&&!triggered){holdTimer=setTimeout(()=>{triggered=true;setOrbitLocked(true);setOrbitMode(true);releaseTimer=setTimeout(()=>{setOrbitLocked(false);setOrbitMode(false);},2600);},520);}};const touchEnd=e=>{clearTimeout(holdTimer);if(e.changedTouches.length!==1)return;const dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;if(Math.abs(dx)>75&&Math.abs(dx)>Math.abs(dy)*1.3)navigateChapterRef.current(dx<0?1:-1);};window.addEventListener('touchstart',touchStart,{passive:true});window.addEventListener('touchmove',touchMove,{passive:true});window.addEventListener('touchend',touchEnd,{passive:true});return()=>{window.removeEventListener('touchstart',touchStart);window.removeEventListener('touchmove',touchMove);window.removeEventListener('touchend',touchEnd);clearTimeout(holdTimer);clearTimeout(releaseTimer);};},[]);
  return <>
    {!ready&&<div className="loader" aria-label="Loading experience"><div className="loader-word">ELSEWHERE</div><div className="loader-line"><span/></div><div className="loader-foot"><span>PREPARING THE VIEW</span><span>01 — 08</span></div></div>}
    <SpaceField progressRef={progressRef} pointerRef={pointerRef} reduced={reduced} orbitModeRef={orbitModeRef} timeDilationRef={timeDilationRef} onWebglError={()=>setWebgl(false)}/>
    <EarthVideo progressRef={progressRef} scrollingRef={scrollingRef} pointerRef={pointerRef} orbitModeRef={orbitModeRef} timeDilationRef={timeDilationRef} reduced={reduced} onReady={()=>setReady(true)}/>
    <div className="cinematic-vignette" aria-hidden="true"/>
    <svg className={`orbit-graphic ${(orbitMode||(progress>.30&&progress<.47))?'is-visible':''}`} viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true"><defs><path id="orbit-route" d="M210 370 C320 165 715 155 815 350 C715 545 320 570 210 370"/></defs><ellipse className="orbit-halo" cx="512" cy="365" rx="295" ry="155" transform="rotate(-18 512 365)"/><path className="orbit-route" d="M210 370 C320 165 715 155 815 350 C715 545 320 570 210 370" pathLength="100"/><circle className="orbital-craft" r="3.2"><animateMotion dur="18s" repeatCount="indefinite"><mpath href="#orbit-route"/></animateMotion></circle><path className="craft-trail" d="M0 0 L-13 -3 L-8 0 L-13 3 Z"><animateMotion dur="18s" repeatCount="indefinite"><mpath href="#orbit-route"/></animateMotion></path><circle className="orbit-pulse" cx="510" cy="210" r="4"/></svg>
    {(progress>.54&&progress<.66||signal)&&<><svg className={`constellation ${signal?'signal-active':''}`} viewBox="0 0 1000 700" aria-hidden="true"><g><path d="M180 220 280 165 365 212 455 142 535 205 628 170 715 232 790 185M280 165 310 275 455 142 482 296 628 170 650 310M310 275 405 350 482 296 575 372 650 310 735 365"/></g>{[[180,220],[280,165],[365,212],[455,142],[535,205],[628,170],[715,232],[790,185],[310,275],[482,296],[650,310],[405,350],[575,372],[735,365]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i%3===0?2:1.4}/>)}</svg><div className="constellation-label">ELSEWHERE-01 <span>/ DISTANT SIGNAL</span></div></>}
    <div className={`mission-event ${signal?'signal-revealed':''}`} aria-live="polite">{signal&&<><span>UNKNOWN SIGNAL</span><b>SIGNAL DETECTED</b><i/></>}</div>
    <div className={`planet-ripple ${earthMessage?'is-visible':''}`} aria-hidden="true"/>
    {earthMessage&&<aside className="earth-message" role="status"><b>PLANET EARTH</b><span>ONE OF BILLIONS</span><small>HOME</small></aside>}
    {timeDilation&&<div className="time-dilation" role="status">TIME DILATION</div>}
    {orbitMode&&<div className="orbit-mode-label" role="status">{orbitLocked?'ORBIT LOCKED':'ORBIT MODE'} <span>{orbitLocked?'':'PRESS O TO EXIT'}</span></div>}
    <header className={`nav ${orbitMode?'orbit-nav-muted':''}`}><a className="brand" href="#orbit" aria-label="Elsewhere home"><span className="brand-mark">E</span><span>ELSEWHERE</span></a><nav className="desktop-nav" aria-label="Main navigation"><a href="#approach">THE VIEW</a><a href="#night">AFTER DARK</a><a href="#end">ABOUT</a></nav><button className="menu-toggle" onClick={()=>setMenu(!menu)} aria-expanded={menu} aria-label={menu?'Close menu':'Open menu'}>{menu?'CLOSE':'MENU'} <span>{menu?'−':'+'}</span></button></header>
    {menu&&<nav className="mobile-menu" aria-label="Mobile navigation">{[['THE VIEW','#approach'],['AFTER DARK','#night'],['ABOUT','#end']].map(([t,h])=><a key={t} href={h} onClick={()=>setMenu(false)}>{t}<span>↗</span></a>)}</nav>}
    <main className={active===5?'analog-phase':''}>
      {chapters.map((c,i)=><section id={c.id} key={c.id} className={`chapter align-${c.align} chapter-${i}`} aria-label={c.label}>
        <div className="copy-block" style={{'--chapter-opacity':Math.max(0,1-Math.abs(progress-timeline[i])/.105)}}>
          <p className="eyebrow"><span className="eyebrow-dot"/>{c.label}</p><h1>{c.title.split('\n').map((line,j)=><React.Fragment key={j}>{line}{j===0&&<br/>}</React.Fragment>)}</h1><p className="chapter-copy">{c.copy}</p>
          {i===0&&<a className="scroll-cue" href="#approach"><span className="scroll-line"/>SCROLL TO EXPLORE <span className="cue-arrow">↓</span></a>}
          {i===7&&<div className="end-links"><a href="#approach">THE VIEW <span>↗</span></a><a href="#night">AFTER DARK <span>↗</span></a><a href="mailto:hello@example.com">CONTACT <span>↗</span></a></div>}
        </div>
      </section>)}
    </main>
    <aside className="coordinates" aria-hidden="true"><span>EARTH / 01</span><span>35° 41′ N&nbsp;&nbsp; 139° 41′ E</span></aside>
    <aside className={`mission-signal ${active===2?'is-visible':''}`} aria-hidden="true"><span className="signal-pip"/><span>ORBITAL LINK&nbsp; / &nbsp;CONNECTED</span><span className="signal-sync">PLANETARY DATA&nbsp; / &nbsp;SYNCED</span></aside>
    <aside className={`mission-readout ${active===4?'is-visible':''}`} aria-hidden="true"><span>EARTH&nbsp; / &nbsp;PLANET 01</span><span>DISTANCE&nbsp;&nbsp; 412,800 KM</span><span>ORBITAL VELOCITY&nbsp;&nbsp; 28.4 KM/S</span><span>SIGNAL&nbsp;&nbsp; STABLE</span><small>CINEMATIC REFERENCE VALUES</small></aside>
    <aside className={`approach-telemetry ${progress>=.12&&progress<.43?'is-visible':''}`} aria-hidden="true"><span>DISTANCE TO PLANET</span><b>{progress<.4?`${Math.round(distanceValue).toLocaleString('en-US')} KM`:'ORBITAL RANGE'}</b><span>SIGNAL&nbsp; {signalLatency} ms</span><small>FICTIONAL MISSION DATA</small></aside>
    <aside className={`approach-telemetry ${progress>=.12&&progress<.43?'is-visible':''}`} aria-hidden="true"><span>DISTANCE TO PLANET</span><b>{progress<.2?'12,400,000 KM':progress<.32?'8,700,000 KM':progress<.40?'2,400,000 KM':'ORBITAL RANGE'}</b><span>SIGNAL&nbsp; {Math.round(142-progress*150)} ms</span><small>FICTIONAL MISSION DATA</small></aside>
    <nav className={`edge-chapters ${edgeNavigation?'is-visible':''}`} aria-label="Cinematic chapter navigation" onPointerLeave={()=>setEdgeNavigation('')}><button onClick={()=>navigateChapter(-1)} disabled={active===0}>← PREVIOUS</button><button onClick={()=>navigateChapter(1)} disabled={active===7}>NEXT →</button></nav>
    <nav className={`chapter-index ${orbitMode?'is-muted':''}`} aria-label="Journey chapters">{chapters.map((chapter,index)=><button key={chapter.id} aria-label={`Go to ${chapter.label}`} aria-current={index===active?'step':undefined} onClick={()=>navigateChapter(index)}><span>0{index+1}</span></button>)}</nav>
    <aside className={`progress-rail ${orbitMode?'is-muted':''}`} aria-label={`Journey progress ${Math.round(progress*100)} percent`}><span className="rail-caption">A CHANGE IN PERSPECTIVE</span><div className="rail-track"><i style={{transform:`scaleY(${Math.max(.02,progress)})`}}/></div><span className="rail-current">0{active+1}</span><span className="rail-total">08</span></aside>
    <footer className="footer-note"><span>ONE WORLD, SEEN ANEW</span><span>SCROLL TO CONTINUE <i>↓</i></span></footer>
    <div className="sr-only" aria-live="polite">Chapter {active+1} of 8: {chapters[active].label}</div>
  </>;
}

const root=createRoot(document.getElementById('root'));
if(import.meta.hot)import.meta.hot.dispose(()=>root.unmount());
root.render(<App/>);
