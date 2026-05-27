import { useState, useEffect, useRef } from "react";
import { SpeedInsights } from '@vercel/speed-insights/react';

/* ─────────────────────── CONSTANTS ─────────────────────────────────────── */
const Depts = ['produccion','tooling','tecnicos','qm','keyposition'];
const DL = { produccion:'Producción', tooling:'Tooling', tecnicos:'Técnicos de Proceso', qm:'Quality Management', keyposition:'Key Position', admin:'Administrador' };
const DC = { produccion:'#38bdf8', tooling:'#f59e0b', tecnicos:'#a78bfa', qm:'#34d399', keyposition:'#f87171', admin:'#94a3b8' };
const DI = { produccion:'ti-building-factory-2', tooling:'ti-tool', tecnicos:'ti-settings-2', qm:'ti-microscope', keyposition:'ti-key', admin:'ti-shield-half' };
const SHIFTS = ['Day shift (06:30–18:30)','Night shift (18:30–06:30)'];
const SK = { U:'cm8u', CL:'cm8cl', CO:'cm8co', PL:'cm8pl' };

const Default_Users = [
  { id:'u0', username:'admin',       password:'Admin2024!', name:'Administrador',      role:'admin',       active:true },
  { id:'u1', username:'produccion',  password:'Prod2024!',  name:'Equipo Producción',  role:'produccion',  active:true },
  { id:'u2', username:'tooling',     password:'Tool2024!',  name:'Equipo Tooling',     role:'tooling',     active:true },
  { id:'u3', username:'tecnicos',    password:'Tec2024!',   name:'Técnicos de Proceso',role:'tecnicos',    active:true },
  { id:'u4', username:'qm',          password:'QM2024!',    name:'Quality Management', role:'qm',          active:true },
  { id:'u5', username:'keyposition', password:'Key2024!',   name:'Key Position',       role:'keyposition', active:true },
];

const Dept_default_checklist = {
  tooling:[
    { id:'tl1', task:'Revisar estado del molde en almacén',        estimatedTime:15, responsible:'Tooling Tech 1' },
    { id:'tl2', task:'Preparar herramental y accesorios',          estimatedTime:20, responsible:'Tooling Tech 1' },
    { id:'tl3', task:'Transportar molde al área de prensa',        estimatedTime:10, responsible:'Tooling Tech 2' },
    { id:'tl4', task:'Instalar y fijar molde en prensa',           estimatedTime:30, responsible:'Tooling Tech 1' },
    { id:'tl5', task:'Verificar anclaje y centraje del molde',     estimatedTime:10, responsible:'Tooling Tech 1' },
    { id:'tl6', task:'Retirar molde saliente y almacenar',         estimatedTime:20, responsible:'Tooling Tech 2' },
  ],
  tecnicos:[
    { id:'tc1', task:'Ajuste de parámetros de prensa',             estimatedTime:20, responsible:'Técnico A' },
    { id:'tc2', task:'Configurar alimentador de tira de aluminio', estimatedTime:15, responsible:'Técnico B' },
    { id:'tc3', task:'Prueba de golpe en vacío (sin material)',    estimatedTime:10, responsible:'Técnico A' },
    { id:'tc4', task:'Producir primera pieza de setup',            estimatedTime:15, responsible:'Técnico A' },
    { id:'tc5', task:'Ajuste fino en conjunto con Tooling',        estimatedTime:20, responsible:'Técnico B' },
    { id:'tc6', task:'Verificar sistemas de seguridad activos',    estimatedTime:10, responsible:'Técnico A' },
  ],
  qm:[
    { id:'q1', task:'Revisión del plan de control del modelo',     estimatedTime:15, responsible:'Inspector QM 1' },
    { id:'q2', task:'Medición dimensional primera pieza (CMM)',    estimatedTime:30, responsible:'Inspector QM 1' },
    { id:'q3', task:'Verificación tolerancias críticas GD&T',     estimatedTime:20, responsible:'Inspector QM 2' },
    { id:'q4', task:'Inspección visual de superficies y acabado',  estimatedTime:10, responsible:'Inspector QM 1' },
    { id:'q5', task:'Registro en base de datos calidad (PPAP)',    estimatedTime:15, responsible:'QM Lead' },
    { id:'q6', task:'Aprobación muestra inicial y etiquetado',     estimatedTime:10, responsible:'QM Lead' },
  ],
  keyposition:[],
};

const Default_pressline = [
  { id:'L1', name:'Línea de Prensa 1', tonnage:'500T', currentPart:'4A-2301-AA', status:'running' },
  { id:'L2', name:'Línea de Prensa 2', tonnage:'1000T', currentPart:'7B-1105-BB', status:'running' },
];

/* ─────────────────────── HELPERS ────────────────────────────────────────── */
const uid = () => 'CO-' + Math.random().toString(36).slice(2,7).toUpperCase();
const fmtMs  = ms  => { if(!ms||ms<0) return '00:00:00'; const s=Math.floor(ms/1e3),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60; return [h,m,sc].map(n=>String(n).padStart(2,'0')).join(':'); };
const fmtDT  = ts  => ts ? new Date(ts).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'}) : '—';
const fmtT   = ts  => ts ? new Date(ts).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}) : '—';
const fmtLoss= min => { if(min==null) return '—'; const a=Math.abs(min),s=min>0?'+':'-'; return `${s}${Math.floor(a)}m${String(Math.round((a%1)*60)).padStart(2,'0')}s`; };
const dbGet  = async (k,fb) => { try{const r=await window.storage.get(k);return r?JSON.parse(r.value):fb}catch{return fb} };
const dbSet  = async (k,v)  => { try{await window.storage.set(k,JSON.stringify(v))}catch{} };

/* ─────────────────────── THEME ──────────────────────────────────────────── */
const T = {
  bg:'#060810', s1:'#0b1018', s2:'#101622', s3:'#161e2c', bd:'#1e293b',
  ak:'#f59e0b', gr:'#22c55e', re:'#ef4444', bl:'#38bdf8', pu:'#a78bfa',
  tx:'#e2e8f0', mu:'#64748b', di:'#94a3b8',
};
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@400;600;700;800;900&family=Share+Tech+Mono&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:#0b1018}
::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px}
input,select,textarea{font-family:'Barlow',sans-serif;background:#101622;border:1px solid #1e293b;color:#e2e8f0;border-radius:6px;padding:8px 12px;outline:none;width:100%;font-size:14px;transition:border-color .2s}
input:focus,select:focus,textarea:focus{border-color:#f59e0b}
input::placeholder,textarea::placeholder{color:#64748b}
select option{background:#101622}
button{cursor:pointer;font-family:'Barlow Condensed',sans-serif;letter-spacing:.07em;border:none;outline:none;transition:all .15s;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.b{padding:7px 16px;border-radius:6px;font-size:13px;font-weight:700;text-transform:uppercase;white-space:nowrap}
.ba{background:#f59e0b;color:#000}.ba:hover{background:#d97706}
.bg{background:transparent;border:1px solid #1e293b;color:#94a3b8}.bg:hover{border-color:#f59e0b;color:#f59e0b}
.bok{background:#052e16;border:1px solid #22c55e55;color:#22c55e}.bok:hover{background:#14532d}
.ber{background:#450a0a;border:1px solid #ef444455;color:#ef4444}.ber:hover{background:#7f1d1d}
.blg{padding:11px 28px;font-size:16px}
.bsm{padding:4px 12px;font-size:12px}
.card{background:#0b1018;border:1px solid #1e293b;border-radius:10px;padding:20px}
.lbl{font-size:11px;font-weight:700;letter-spacing:.1em;color:#64748b;text-transform:uppercase;display:block;margin-bottom:5px}
.tag{display:inline-flex;align-items:center;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap}
@keyframes fIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes spin{to{transform:rotate(360deg)}}
.fi{animation:fIn .3s ease}
.bk{animation:blink 1.4s ease-in-out infinite}
tr:hover td{background:#161e2c}
input[type=file]{padding:6px;cursor:pointer}
`;

/* ═════════════════════ ROOT APP ═════════════════════════════════════════════ */
export default function App() {
  const [rdy,  setRdy]  = useState(false);
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');
  const [users,setUsers]= useState(Default_Users);
  const [cl,   setCl]   = useState(Dept_default_checklist);
  const [cos,  setCos]  = useState([]);
  const [pl,   setPl]   = useState(Default_pressline);
  const [selCO,setSelCO]= useState(null);
  const [elap, setElap] = useState(0);
  const tRef = useRef(null);

  useEffect(() => {
    const lnk = document.createElement('link');
    lnk.rel='stylesheet'; lnk.href='https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3/dist/tabler-icons.min.css';
    document.head.appendChild(lnk);
    Promise.all([dbGet(SK.U,Default_Users),dbGet(SK.CL,Dept_default_checklist),dbGet(SK.CO,[]),dbGet(SK.PL,Default_pressline)])
      .then(([u,c,co,p]) => { setUsers(u);setCl(c);setCos(co);setPl(p);setRdy(true); });
  }, []);

  const activeCO = cos.find(c => c.status==='active');
  useEffect(() => {
    clearInterval(tRef.current);
    if (activeCO) { const t=()=>setElap(Date.now()-activeCO.startTime); t(); tRef.current=setInterval(t,1000); }
    else setElap(0);
    return () => clearInterval(tRef.current);
  }, [activeCO?.id]);

  const saveU   = async u => { setUsers(u); await dbSet(SK.U,u); };
  const saveCl  = async c => { setCl(c);   await dbSet(SK.CL,c); };
  const saveCos = async c => { setCos(c);  await dbSet(SK.CO,c); };
  const savePl  = async p => { setPl(p);   await dbSet(SK.PL,p); };
  const login   = (un,pw) => { const u=users.find(x=>x.username===un&&x.password===pw&&x.active!==false); if(u){setUser(u);setView('dashboard');return true;}return false; };
  const logout  = () => { setUser(null); setView('login'); };

  if (!rdy) return (
    <div style={{background:T.bg,height:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
      <style>{CSS}</style>
      <i className="ti ti-loader" style={{fontSize:40,color:T.ak,animation:'spin 1.5s linear infinite'}} />
      <span style={{fontFamily:'Share Tech Mono',fontSize:13,letterSpacing:'.15em',color:T.mu}}>CARGANDO SISTEMA...</span>
    </div>
  );

  const ctx = { user,view,setView,users,cl,cos,pl,selCO,setSelCO,elap,activeCO,saveU,saveCl,saveCos,savePl,logout };
  return (
    <div style={{fontFamily:"'Barlow',sans-serif",background:T.bg,height:'100vh',display:'flex',flexDirection:'column',overflow:'hidden',color:T.tx}}>
      <style>{CSS}</style>
      {view!=='login' && <Topbar {...ctx}/>}
      <div style={{flex:1,overflowY:'auto'}}>
        {view==='login'     && <LoginView     login={login}/>}
        {view==='dashboard' && <DashboardView {...ctx}/>}
        {view==='workspace' && <WorkspaceView {...ctx}/>}
        {view==='detail'    && <DetailView    {...ctx}/>}
        {view==='admin'     && <AdminView     {...ctx}/>}
      </div>
      <SpeedInsights />
    </div>
  );
}

/* ═════════════════════ LOGIN ════════════════════════════════════════════════ */
function LoginView({ login }) {
  const [u,setU]=useState(''); const [p,setP]=useState(''); const [err,setErr]=useState(''); const [show,setShow]=useState(false);
  const sub=e=>{e.preventDefault();if(!login(u,p))setErr('Usuario o contraseña incorrectos');};
  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:20,position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',inset:0,backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 59px,${T.bd} 59px,${T.bd} 60px),repeating-linear-gradient(90deg,transparent,transparent 59px,${T.bd} 59px,${T.bd} 60px)`,opacity:.1}}/>
      <div style={{position:'relative',zIndex:1,width:'100%',maxWidth:420}} className="fi">
        <div style={{textAlign:'center',marginBottom:32}}>
          <i className="ti ti-bolt" style={{fontSize:54,color:T.ak,display:'block',marginBottom:8}}/>
          <div style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:32,color:T.ak,letterSpacing:'.1em'}}>CAMBIO DE MODELO</div>
          <div style={{fontFamily:'Barlow Condensed',fontWeight:500,fontSize:13,color:T.mu,letterSpacing:'.2em',marginTop:4}}>ESTAMPADO · ALEACIÓN DE ALUMINIO</div>
        </div>
        <form onSubmit={sub} className="card" style={{padding:32}}>
          <div style={{marginBottom:18}}>
            <label className="lbl">Usuario</label>
            <input value={u} onChange={e=>setU(e.target.value)} placeholder="Nombre de usuario" autoFocus/>
          </div>
          <div style={{marginBottom:22}}>
            <label className="lbl">Contraseña</label>
            <input type="password" value={p} onChange={e=>setP(e.target.value)} placeholder="••••••••"/>
          </div>
          {err && <div style={{color:T.re,fontSize:13,marginBottom:16,padding:'8px 12px',background:`${T.re}11`,border:`1px solid ${T.re}33`,borderRadius:6,display:'flex',alignItems:'center',gap:8}}>
            <i className="ti ti-alert-circle"/> {err}</div>}
          <button type="submit" className="b ba blg" style={{width:'100%'}}>
            <i className="ti ti-login-2"/> ACCEDER AL SISTEMA
          </button>
        </form>
        <div style={{textAlign:'center',marginTop:14}}>
          <button className="b bg bsm" onClick={()=>setShow(!show)}><i className={`ti ti-${show?'eye-off':'eye'}`}/> Credenciales demo</button>
        </div>
        {show && <div className="card fi" style={{marginTop:10,padding:16}}>
          <table style={{width:'100%',fontFamily:'Share Tech Mono',fontSize:12,borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:`1px solid ${T.bd}`}}>
              {['USUARIO','CONTRASEÑA','ROL'].map(h=><th key={h} style={{padding:'4px 8px',textAlign:'left',color:T.mu,fontSize:10}}>{h}</th>)}
            </tr></thead>
            <tbody>{[['admin','Admin2024!','Administrador'],['produccion','Prod2024!','Producción'],['tooling','Tool2024!','Tooling'],['tecnicos','Tec2024!','Técnicos'],['qm','QM2024!','QM'],['keyposition','Key2024!','Key Position']].map(([un,pw,n])=>(
              <tr key={un}><td style={{padding:'3px 8px',color:T.ak}}>{un}</td><td style={{padding:'3px 8px',color:T.gr}}>{pw}</td><td style={{padding:'3px 8px',color:T.mu,fontFamily:'Barlow',fontSize:12}}>{n}</td></tr>
            ))}</tbody>
          </table>
        </div>}
      </div>
    </div>
  );
}

/* ═════════════════════ TOPBAR ═══════════════════════════════════════════════ */
function Topbar({ user,view,setView,elap,activeCO,logout }) {
  const color = DC[user?.role]||T.mu;
  return (
    <div style={{background:T.s1,borderBottom:`1px solid ${T.bd}`,display:'flex',alignItems:'center',padding:'0 18px',height:58,gap:10,flexShrink:0}}>
      <div style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:22,color:T.ak,letterSpacing:'.08em',cursor:'pointer',display:'flex',alignItems:'center',gap:8,userSelect:'none'}} onClick={()=>setView('dashboard')}>
        <i className="ti ti-bolt" style={{fontSize:20}}/> ESTAMPADO
      </div>
      <div style={{width:1,height:22,background:T.bd,margin:'0 2px'}}/>
      <div style={{display:'flex',gap:6}}>
        {[['dashboard','Dashboard','ti-layout-dashboard'],['workspace','Área de Trabajo','ti-checklist'],['admin','Admin','ti-settings']].filter(([v])=>v!=='admin'||user?.role==='admin').map(([v,l,ic])=>(
          <button key={v} onClick={()=>setView(v)} className="b bsm" style={{background:view===v?T.s3:'transparent',border:`1px solid ${view===v?T.ak:T.bd}`,color:view===v?T.ak:T.di}}>
            <i className={`ti ${ic}`} style={{fontSize:13}}/> {l.toUpperCase()}
          </button>
        ))}
      </div>
      <div style={{flex:1}}/>
      {activeCO && (
        <div style={{display:'flex',alignItems:'center',gap:10,background:'#1a1200',border:`1px solid ${T.ak}55`,borderRadius:8,padding:'5px 14px'}}>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:9,color:T.mu,letterSpacing:'.1em',fontWeight:700,fontFamily:'Barlow Condensed'}}>CAMBIO ACTIVO</div>
            <div style={{fontSize:11,color:T.di,fontFamily:'Share Tech Mono'}}>{activeCO.modelIn?.partNumber||'—'}</div>
          </div>
          <div style={{fontFamily:'Share Tech Mono',fontSize:26,color:T.ak}} className="bk">{fmtMs(elap)}</div>
        </div>
      )}
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <div style={{background:`${color}22`,border:`1px solid ${color}44`,padding:'3px 10px',borderRadius:20,fontSize:11,color,fontWeight:700,letterSpacing:'.1em',fontFamily:'Barlow Condensed'}}>
          {(DL[user?.role]||'').toUpperCase()}
        </div>
        <button className="b bg bsm" onClick={logout}><i className="ti ti-logout" style={{fontSize:13}}/> SALIR</button>
      </div>
    </div>
  );
}

/* ═════════════════════ DASHBOARD ════════════════════════════════════════════ */
function DashboardView({ user,cos,pl,setView,setSelCO,activeCO,elap }) {
  return (
    <div style={{padding:'24px',maxWidth:1300,margin:'0 auto'}} className="fi">
      <div style={{marginBottom:22}}>
        <h1 style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:36,letterSpacing:'.05em'}}>CAMBIO DE MODELO EN ESTAMPADO</h1>
        <div style={{color:T.mu,fontSize:13,marginTop:4}}>Sistema de gestión · Troquelado aleación de aluminio</div>
      </div>

      {activeCO && user.role!=='produccion' && (
        <div style={{background:`${T.ak}11`,border:`1px solid ${T.ak}44`,borderRadius:8,padding:'12px 18px',marginBottom:20,display:'flex',alignItems:'center',gap:12}} className="fi">
          <i className="ti ti-bell-ringing" style={{fontSize:22,color:T.ak,flexShrink:0}}/>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,color:T.ak,fontSize:14,fontFamily:'Barlow Condensed',letterSpacing:'.04em'}}>CAMBIO INICIADO — {activeCO.modelIn?.partNumber} en {activeCO.pressLine}</div>
            <div style={{fontSize:12,color:T.di,marginTop:2}}>Iniciado por Producción · {fmtDT(activeCO.startTime)}</div>
          </div>
          <button className="b ba bsm" onClick={()=>setView('workspace')}><i className="ti ti-arrow-right"/> IR AL ÁREA DE TRABAJO</button>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:26}}>
        {pl.map(line => {
          const lco = cos.find(c=>c.status==='active'&&c.pressLine===line.id);
          const sc = lco ? T.ak : (line.status==='running' ? T.gr : T.mu);
          return (
            <div key={line.id} className="card" style={{border:`1px solid ${sc}44`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                <div>
                  <div style={{fontFamily:'Barlow Condensed',fontWeight:800,fontSize:20,letterSpacing:'.04em'}}>{line.name}</div>
                  <div style={{color:T.mu,fontSize:12,marginTop:2}}>{line.tonnage} · Aluminio</div>
                </div>
                <span className="tag" style={{background:`${sc}22`,color:sc,border:`1px solid ${sc}44`}}>
                  {lco ? '⟳ CAMBIO ACTIVO' : line.status==='running' ? '▶ PRODUCCIÓN' : '◼ PARADA'}
                </span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:lco?'1fr 1fr':'1fr',gap:10}}>
                <div style={{background:T.s2,border:`1px solid ${T.bd}`,borderRadius:8,padding:12}}>
                  <div style={{fontSize:10,color:T.mu,fontWeight:700,letterSpacing:'.1em',marginBottom:4}}>MODELO ACTUAL</div>
                  <div style={{fontFamily:'Share Tech Mono',fontSize:15,color:T.tx}}>{line.currentPart}</div>
                </div>
                {lco && <div style={{background:'#1a1200',border:`1px solid ${T.ak}33`,borderRadius:8,padding:12}}>
                  <div style={{fontSize:10,color:T.mu,fontWeight:700,letterSpacing:'.1em',marginBottom:4}}>MODELO ENTRANTE</div>
                  <div style={{fontFamily:'Share Tech Mono',fontSize:15,color:T.ak}}>{lco.modelIn?.partNumber||'—'}</div>
                </div>}
              </div>
              {lco && <div style={{marginTop:12,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{fontFamily:'Share Tech Mono',fontSize:22,color:T.ak}}>{fmtMs(elap)}</div>
                <button className="b ba bsm" onClick={()=>{setSelCO(lco.id);setView('detail')}}>
                  <i className="ti ti-list-details"/> VER DETALLE
                </button>
              </div>}
            </div>
          );
        })}
      </div>

      {user.role==='produccion' && !activeCO && (
        <div style={{marginBottom:20}}>
          <button className="b ba blg" onClick={()=>setView('workspace')}><i className="ti ti-plus"/> NUEVO CAMBIO DE MODELO</button>
        </div>
      )}

      <div className="card">
        <div style={{fontFamily:'Barlow Condensed',fontWeight:800,fontSize:18,letterSpacing:'.05em',marginBottom:18,display:'flex',alignItems:'center',gap:10}}>
          <i className="ti ti-history" style={{color:T.ak}}/> HISTORIAL DE CAMBIOS DE MODELO
          <span className="tag" style={{background:T.s2,color:T.mu,border:`1px solid ${T.bd}`}}>{cos.length}</span>
        </div>
        {cos.length===0
          ? <div style={{textAlign:'center',padding:40,color:T.mu}}><i className="ti ti-inbox" style={{fontSize:36,display:'block',marginBottom:10}}/> Sin registros</div>
          : <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead><tr style={{borderBottom:`2px solid ${T.bd}`}}>
                  {['ID','P/N SALIDA','P/N ENTRADA','LÍNEA','INICIO','ESTADO','TIEMPO TOTAL',''].map((h,i)=>(
                    <th key={i} style={{padding:'8px 12px',textAlign:'left',color:T.mu,fontSize:11,fontWeight:700,letterSpacing:'.08em'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{[...cos].reverse().map(co=>(
                  <tr key={co.id} style={{borderBottom:`1px solid ${T.bd}22`,cursor:'pointer'}} onClick={()=>{setSelCO(co.id);setView('detail')}}>
                    <td style={{padding:'10px 12px',fontFamily:'Share Tech Mono',color:T.ak,fontSize:11}}>{co.id}</td>
                    <td style={{padding:'10px 12px',fontFamily:'Share Tech Mono',fontSize:12,color:T.di}}>{co.modelOut?.partNumber||'—'}</td>
                    <td style={{padding:'10px 12px',fontFamily:'Share Tech Mono',fontSize:12}}>{co.modelIn?.partNumber||'—'}</td>
                    <td style={{padding:'10px 12px',color:T.di}}>{co.pressLine}</td>
                    <td style={{padding:'10px 12px',color:T.mu,fontSize:12}}>{fmtDT(co.startTime)}</td>
                    <td style={{padding:'10px 12px'}}><SBadge s={co.status}/></td>
                    <td style={{padding:'10px 12px',fontFamily:'Share Tech Mono',color:co.status==='completed'?T.gr:T.ak}}>
                      {fmtMs(co.status==='completed'?co.totalTime:Date.now()-co.startTime)}
                    </td>
                    <td style={{padding:'10px 12px'}}><button className="b bg bsm" onClick={e=>{e.stopPropagation();setSelCO(co.id);setView('detail')}}><i className="ti ti-chevron-right" style={{fontSize:13}}/></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
        }
      </div>
    </div>
  );
}

function SBadge({ s }) {
  const m = { active:[T.ak,'EN PROGRESO'], completed:[T.gr,'COMPLETADO'], cancelled:[T.re,'CANCELADO'] };
  const [c,l]=m[s]||[T.mu,'—'];
  return <span className="tag" style={{background:`${c}22`,color:c,border:`1px solid ${c}44`}}>{l}</span>;
}

/* ═════════════════════ WORKSPACE (despachador) ══════════════════════════════ */
function WorkspaceView(ctx) {
  const { user, activeCO, cos, cl, elap, saveCos, savePl, pl, setView, setSelCO } = ctx;
  if (user.role==='produccion') return activeCO ? <ProdActive {...{activeCO,elap,setView,setSelCO,cos}} /> : <ProdCreate {...{cos,cl,saveCos,pl,savePl,setView}} />;
  if (!activeCO) return (
    <div style={{padding:60,textAlign:'center',color:T.mu,maxWidth:500,margin:'0 auto'}} className="fi">
      <i className="ti ti-clock-pause" style={{fontSize:56,display:'block',marginBottom:16}}/>
      <div style={{fontFamily:'Barlow Condensed',fontSize:24,fontWeight:800,marginBottom:8}}>SIN CAMBIO ACTIVO</div>
      <div>Esperando que Producción inicie un cambio de modelo</div>
    </div>
  );
  if (user.role==='tooling')     return <DeptChecklist dept="tooling"    {...{activeCO,cos,saveCos,elap}}/>;
  if (user.role==='tecnicos')    return <DeptChecklist dept="tecnicos"   {...{activeCO,cos,saveCos,elap}}/>;
  if (user.role==='qm')          return <DeptChecklist dept="qm"         {...{activeCO,cos,saveCos,elap}}/>;
  if (user.role==='keyposition') return <KeyPos {...{activeCO,cos,saveCos,elap,pl,savePl,setView}}/>;
  if (user.role==='admin')       return <DeptChecklist dept="tooling"    {...{activeCO,cos,saveCos,elap}}/>;
  return null;
}

/* ═════════════════════ PRODUCCION – CREAR ════════════════��══════════════════ */
function ProdCreate({ cos, cl, saveCos, pl, savePl, setView }) {
  const [form,setForm] = useState({
    pressLine:pl[0]?.id||'L1',
    outPN:'', outSz:'', outDate:new Date().toISOString().slice(0,10), outShift:SHIFTS[0],
    inPN:'',  inSz:'',  inShift:SHIFTS[0],
  });
  const [errs,setErrs] = useState({});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const validate=()=>{ const e={}; if(!form.inPN.trim())e.inPN='Requerido'; if(!form.inSz.trim())e.inSz='Requerido'; if(!form.outPN.trim())e.outPN='Requerido'; return e; };

  const submit=async()=>{
    const e=validate(); if(Object.keys(e).length){setErrs(e);return;}
    const now=Date.now(), id=uid();
    const mkTasks=d=>(cl[d]||[]).map(t=>({...t,completed:false,startedAt:null,completedAt:null,actualTime:null,lossTime:null}));
    const newCO={
      id,status:'active',pressLine:form.pressLine,startTime:now,endTime:null,totalTime:null,createdAt:now,
      modelOut:{partNumber:form.outPN,size:form.outSz,pressLine:form.pressLine,date:form.outDate,shift:form.outShift},
      modelIn: {partNumber:form.inPN, size:form.inSz, pressLine:form.pressLine,shift:form.inShift},
      departments:{
        produccion: {status:'completed',startTime:now,endTime:now,tasks:[]},
        tooling:    {status:'active',startTime:now,endTime:null,tasks:mkTasks('tooling')},
        tecnicos:   {status:'active',startTime:now,endTime:null,tasks:mkTasks('tecnicos')},
        qm:         {status:'active',startTime:now,endTime:null,tasks:mkTasks('qm')},
        keyposition:{status:'active',startTime:now,endTime:null,tasks:mkTasks('keyposition'),decision:null,defectNotes:'',defectImages:[]},
      },
    };
    await saveCos([...cos,newCO]);
    await savePl(pl.map(l=>l.id===form.pressLine?{...l,status:'changeover'}:l));
    setView('dashboard');
  };

  const F=({lbl,k,type='text',opts={}})=>(
    <div style={{marginBottom:16}}>
      <label className="lbl">{lbl} {opts.req!==false&&<span style={{color:T.re}}>*</span>}</label>
      {type==='select'
        ?<select value={form[k]} onChange={e=>set(k,e.target.value)}>{opts.options.map(o=><option key={o}>{o}</option>)}</select>
        :<input type={type} value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={opts.ph} style={{borderColor:errs[k]?T.re:undefined}}/>
      }
      {errs[k]&&<div style={{color:T.re,fontSize:12,marginTop:4}}><i className="ti ti-alert-triangle"/> {errs[k]}</div>}
    </div>
  );

  return (
    <div style={{padding:24,maxWidth:960,margin:'0 auto'}} className="fi">
      <div style={{marginBottom:22}}>
        <h2 style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:30,letterSpacing:'.05em'}}>NUEVO CAMBIO DE MODELO</h2>
        <p style={{color:T.mu,fontSize:13,marginTop:4}}>Complete los campos para iniciar el proceso. Se notificará a todos los departamentos y el cronómetro iniciará automáticamente.</p>
      </div>

      <div className="card" style={{marginBottom:18}}>
        <div style={{fontFamily:'Barlow Condensed',fontWeight:800,fontSize:15,letterSpacing:'.06em',marginBottom:14,color:T.ak}}>
          <i className="ti ti-building-factory-2"/> SELECCIONAR LÍNEA DE PRENSA
        </div>
        <div style={{display:'flex',gap:12}}>
          {pl.map(l=>(
            <button key={l.id} onClick={()=>set('pressLine',l.id)} style={{
              flex:1,padding:16,borderRadius:8,fontFamily:'Barlow Condensed',fontWeight:700,fontSize:15,textAlign:'left',
              background:form.pressLine===l.id?`${T.ak}22`:T.s2,
              border:`2px solid ${form.pressLine===l.id?T.ak:T.bd}`,
              color:form.pressLine===l.id?T.ak:T.di,
            }}>
              <div style={{fontSize:18,marginBottom:4}}>{l.name}</div>
              <div style={{fontSize:12,fontWeight:400,color:T.mu}}>{l.tonnage} · Actual: {l.currentPart}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
        <div className="card" style={{border:`1px solid ${T.re}33`}}>
          <div style={{fontFamily:'Barlow Condensed',fontWeight:800,fontSize:15,marginBottom:16,color:T.re,display:'flex',alignItems:'center',gap:8}}>
            <i className="ti ti-arrow-up-circle"/> MODELO SALIENTE (OUT)
          </div>
          <F lbl="Número de parte" k="outPN" opts={{ph:'Ej: 4A-2301-AA'}}/>
          <F lbl="Tamaño / Dimensiones" k="outSz" opts={{ph:'Ej: 450×280×2.5mm'}}/>
          <F lbl="Fecha" k="outDate" type="date"/>
          <F lbl="Turno" k="outShift" type="select" opts={{options:SHIFTS,req:false}}/>
        </div>
        <div className="card" style={{border:`1px solid ${T.gr}33`}}>
          <div style={{fontFamily:'Barlow Condensed',fontWeight:800,fontSize:15,marginBottom:16,color:T.gr,display:'flex',alignItems:'center',gap:8}}>
            <i className="ti ti-arrow-down-circle"/> MODELO ENTRANTE (IN)
          </div>
          <F lbl="Número de parte" k="inPN" opts={{ph:'Ej: 5C-3102-BB'}}/>
          <F lbl="Tamaño / Dimensiones" k="inSz" opts={{ph:'Ej: 380×200×3.0mm'}}/>
          <F lbl="Turno de inicio" k="inShift" type="select" opts={{options:SHIFTS,req:false}}/>
        </div>
      </div>

      <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
        <button className="b bg" onClick={()=>setView('dashboard')}><i className="ti ti-x"/> CANCELAR</button>
        <button className="b ba blg" onClick={submit}><i className="ti ti-check"/> CONFIRMAR CAMBIO DE MODELO</button>
      </div>
    </div>
  );
}

/* ═════════════════════ PRODUCCION – ACTIVO ══════════════════════════════════ */
function ProdActive({ activeCO, elap, setView, setSelCO, cos }) {
  const dpts = Depts.slice(1);
  return (
    <div style={{padding:24,maxWidth:900,margin:'0 auto'}} className="fi">
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
        <i className="ti ti-building-factory-2" style={{fontSize:28,color:DC.produccion}}/>
        <h2 style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:28,letterSpacing:'.05em'}}>PRODUCCIÓN</h2>
        <span className="tag" style={{background:`${T.gr}22`,color:T.gr,border:`1px solid ${T.gr}44`}}>✓ CAMBIO INICIADO</span>
      </div>
      <p style={{color:T.mu,fontSize:13,marginBottom:24}}>El cambio de modelo ha sido registrado. Todos los departamentos han sido notificados.</p>

      <div style={{display:'flex',justifyContent:'center',marginBottom:28}}>
        <div style={{textAlign:'center',background:'#1a1200',border:`1px solid ${T.ak}44`,borderRadius:12,padding:'20px 48px'}}>
          <div style={{fontSize:11,color:T.mu,letterSpacing:'.14em',fontFamily:'Barlow Condensed',marginBottom:6}}>TIEMPO TRANSCURRIDO</div>
          <div style={{fontFamily:'Share Tech Mono',fontSize:52,color:T.ak}} className="bk">{fmtMs(elap)}</div>
          <div style={{fontSize:12,color:T.mu,marginTop:4}}>{fmtDT(activeCO.startTime)}</div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
        <MiniModel lbl="MODELO SALIENTE" m={activeCO.modelOut} c={T.re}/>
        <MiniModel lbl="MODELO ENTRANTE" m={activeCO.modelIn}  c={T.gr}/>
      </div>

      <div className="card">
        <div style={{fontFamily:'Barlow Condensed',fontWeight:800,fontSize:16,marginBottom:16}}>ESTADO POR DEPARTAMENTO</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {dpts.map(d => {
            const dd=activeCO.departments[d]; const tasks=dd?.tasks||[]; const done=tasks.filter(t=>t.completed).length; const pct=tasks.length?(done/tasks.length)*100:0; const c=DC[d];
            return (
              <div key={d} style={{background:T.s2,border:`1px solid ${T.bd}`,borderRadius:8,padding:14}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <i className={`ti ${DI[d]}`} style={{color:c,fontSize:16}}/>
                    <span style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:14}}>{DL[d]}</span>
                  </div>
                  <span style={{fontFamily:'Share Tech Mono',fontSize:12,color:c}}>{done}/{tasks.length}</span>
                </div>
                <div style={{height:4,background:T.bd,borderRadius:2,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pct}%`,background:pct===100?T.gr:c,transition:'width .5s'}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{marginTop:20,display:'flex',gap:10,justifyContent:'flex-end'}}>
        <button className="b bg" onClick={()=>{setSelCO(activeCO.id);setView('detail')}}><i className="ti ti-list-details"/> VER DETALLE COMPLETO</button>
      </div>
    </div>
  );
}

/* ═════════════════════ DEPT CHECKLIST ═══════════════════════════════════════ */
function DeptChecklist({ dept, activeCO, cos, saveCos, elap }) {
  const dd   = activeCO.departments[dept];
  const tasks= dd?.tasks||[];
  const color= DC[dept];
  const done = tasks.filter(t=>t.completed).length;
  const pct  = tasks.length ? (done/tasks.length)*100 : 0;

  const updateCO = async (newDepts) => {
    const nc=cos.map(c=>c.id!==activeCO.id?c:{...c,departments:{...c.departments,...newDepts}});
    await saveCos(nc);
  };

  const startTask = async (taskId) => {
    const ntasks=tasks.map(t=>t.id===taskId?{...t,startedAt:Date.now()}:t);
    await updateCO({[dept]:{...dd,tasks:ntasks}});
  };

  const completeTask = async (task) => {
    const now=Date.now();
    const sa=task.startedAt||(now-task.estimatedTime*60000);
    const actual=(now-sa)/60000;
    const loss=actual-task.estimatedTime;
    const ntasks=tasks.map(t=>t.id===task.id?{...t,completed:true,completedAt:now,actualTime:actual,lossTime:loss}:t);
    const allDone=ntasks.every(t=>t.completed);
    const nd={...dd,tasks:ntasks,...(allDone?{status:'completed',endTime:now}:{})};
    await updateCO({[dept]:nd});
  };

  return (
    <div style={{padding:24,maxWidth:960,margin:'0 auto'}} className="fi">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
            <i className={`ti ${DI[dept]}`} style={{fontSize:30,color}}/>
            <h2 style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:30}}>{DL[dept].toUpperCase()}</h2>
            <span className="tag" style={{background:`${color}22`,color,border:`1px solid ${color}44`}}>{done}/{tasks.length} TAREAS</span>
          </div>
          <div style={{color:T.mu,fontSize:13}}>
            P/N: <span style={{color:T.ak,fontFamily:'Share Tech Mono'}}>{activeCO.modelIn?.partNumber}</span>
            &nbsp;·&nbsp;Línea: <span style={{color:T.tx}}>{activeCO.pressLine}</span>
            &nbsp;·&nbsp;Inicio: <span style={{color:T.tx}}>{fmtDT(activeCO.startTime)}</span>
          </div>
        </div>
        <div style={{fontFamily:'Share Tech Mono',fontSize:26,color:T.ak,background:'#1a1200',border:`1px solid ${T.ak}44`,padding:'8px 16px',borderRadius:8}}>{fmtMs(elap)}</div>
      </div>

      <div style={{height:6,background:T.bd,borderRadius:3,marginBottom:22,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${pct}%`,background:pct===100?T.gr:color,borderRadius:3,transition:'width .6s ease'}}/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:22}}>
        <MiniModel lbl="MODELO SALIENTE" m={activeCO.modelOut} c={T.re}/>
        <MiniModel lbl="MODELO ENTRANTE" m={activeCO.modelIn}  c={T.gr}/>
      </div>

      <div className="card">
        <div style={{fontFamily:'Barlow Condensed',fontWeight:800,fontSize:16,marginBottom:18,color}}>
          <i className={`ti ${DI[dept]}`}/> LISTA DE TAREAS — {DL[dept].toUpperCase()}
        </div>
        {tasks.length===0
          ? <div style={{textAlign:'center',padding:32,color:T.mu}}>Sin tareas configuradas. Solicite al Administrador agregar tareas.</div>
          : <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {tasks.map((task,i)=><TaskRow key={task.id} task={task} index={i} color={color} onStart={()=>startTask(task.id)} onComplete={()=>completeTask(task)}/>)}
            </div>
        }
      </div>

      {pct===100 && (
        <div style={{marginTop:18,padding:20,background:`${T.gr}0d`,border:`1px solid ${T.gr}44`,borderRadius:10,textAlign:'center'}} className="fi">
          <i className="ti ti-circle-check-filled" style={{fontSize:40,color:T.gr,display:'block',marginBottom:8}}/>
          <div style={{fontFamily:'Barlow Condensed',fontSize:22,fontWeight:800,color:T.gr}}>TAREAS COMPLETADAS</div>
          <div style={{color:T.mu,fontSize:13,marginTop:4}}>{DL[dept]} · Finalizado a las {fmtT(dd?.endTime||Date.now())}</div>
        </div>
      )}
    </div>
  );
}

/* ─── TaskRow ──────────────────────────────────────────────────────────────── */
function TaskRow({ task, index, color, onStart, onComplete }) {
  const over = task.lossTime > 0;
  return (
    <div style={{
      background:task.completed?`${T.gr}08`:T.s2,
      border:`1px solid ${task.completed?T.gr+'44':T.bd}`,
      borderRadius:8,padding:'12px 14px',
      display:'grid',gridTemplateColumns:'28px 1fr 80px 90px 110px',gap:10,alignItems:'center',
    }}>
      <div style={{width:26,height:26,borderRadius:'50%',background:task.completed?T.gr:`${color}22`,border:`1px solid ${task.completed?T.gr:color+'44'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:task.completed?'#000':color,flexShrink:0}}>
        {task.completed ? <i className="ti ti-check" style={{fontSize:13,fontFamily:'sans-serif'}}/> : index+1}
      </div>
      <div>
        <div style={{fontSize:14,fontWeight:500,color:task.completed?T.mu:T.tx,textDecoration:task.completed?'line-through':'none'}}>{task.task}</div>
        <div style={{fontSize:11,color:T.mu,marginTop:3}}>
          <i className="ti ti-user" style={{fontSize:11}}/> {task.responsible}
          {task.completedAt && <span style={{color:T.di}}> · Completado: {fmtT(task.completedAt)}</span>}
        </div>
      </div>
      <div style={{textAlign:'right'}}>
        <div style={{fontSize:10,color:T.mu,fontWeight:700,letterSpacing:'.08em',marginBottom:2}}>OBJETIVO</div>
        <div style={{fontFamily:'Share Tech Mono',fontSize:13,color:T.di}}>{task.estimatedTime}m</div>
      </div>
      <div style={{textAlign:'right'}}>
        {task.completed && task.lossTime!=null && <>
          <div style={{fontSize:10,color:T.mu,fontWeight:700,letterSpacing:'.08em',marginBottom:2}}>LOSS TIME</div>
          <div style={{fontFamily:'Share Tech Mono',fontSize:13,color:over?T.re:T.gr,fontWeight:700}}>{fmtLoss(task.lossTime)}</div>
        </>}
      </div>
      <div style={{justifySelf:'end'}}>
        {!task.startedAt && !task.completed && <button className="b bg bsm" onClick={onStart}><i className="ti ti-player-play"/> INICIAR</button>}
        {task.startedAt && !task.completed   && <button className="b bok bsm" onClick={onComplete}><i className="ti ti-check"/> COMPLETAR</button>}
        {task.completed && <span style={{color:T.gr,fontSize:13,fontWeight:700,fontFamily:'Barlow Condensed',letterSpacing:'.06em'}}><i className="ti ti-circle-check"/> HECHO</span>}
      </div>
    </div>
  );
}

/* ═════════════════════ KEY POSITION ═════════════════════════════════════════ */
function KeyPos({ activeCO, cos, saveCos, elap, pl, savePl, setView }) {
  const kd = activeCO.departments.keyposition;
  const tasks = kd?.tasks||[];
  const done  = tasks.filter(t=>t.completed).length;
  const color = DC.keyposition;

  const [dec,   setDec]    = useState(kd?.decision||null);
  const [notes, setNotes]  = useState(kd?.defectNotes||'');
  const [imgs,  setImgs]   = useState(kd?.defectImages||[]);
  const [conf,  setConf]   = useState(false);
  const fileRef = useRef();

  const updateCO = async (ndepts) => { await saveCos(cos.map(c=>c.id!==activeCO.id?c:{...c,departments:{...c.departments,...ndepts}})); };

  const startTask = async (taskId) => {
    await updateCO({keyposition:{...kd,tasks:tasks.map(t=>t.id===taskId?{...t,startedAt:Date.now()}:t)}});
  };

  const completeTask = async (task) => {
    const now=Date.now(),sa=task.startedAt||(now-task.estimatedTime*60000),actual=(now-sa)/60000,loss=actual-task.estimatedTime;
    const nt=tasks.map(t=>t.id===task.id?{...t,completed:true,completedAt:now,actualTime:actual,lossTime:loss}:t);
    const allDone=nt.every(t=>t.completed);
    await updateCO({keyposition:{...kd,tasks:nt,...(allDone?{status:'completed',endTime:now}:{})}});
  };

  const saveEval = async () => {
    await updateCO({keyposition:{...kd,decision:dec,defectNotes:notes,defectImages:imgs}});
  };

  const finalize = async () => {
    const now=Date.now();
    const nc=cos.map(c=>c.id!==activeCO.id?c:{...c,status:'completed',endTime:now,totalTime:now-c.startTime,
      departments:{...c.departments,keyposition:{...c.departments.keyposition,status:'completed',endTime:now,decision:dec,defectNotes:notes,defectImages:imgs}}});
    await saveCos(nc);
    await savePl(pl.map(l=>l.id!==activeCO.pressLine?l:{...l,currentPart:activeCO.modelIn?.partNumber||l.currentPart,status:'running'}));
    setView('dashboard');
  };

  const handleImgs = (e) => {
    Array.from(e.target.files).forEach(file => {
      const r=new FileReader(); r.onload=ev=>setImgs(p=>[...p,{name:file.name,data:ev.target.result,uploadedAt:Date.now()}]);
      r.readAsDataURL(file);
    });
  };

  const qmOK = activeCO.departments.qm?.status==='completed';

  return (
    <div style={{padding:24,maxWidth:960,margin:'0 auto'}} className="fi">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
            <i className="ti ti-key" style={{fontSize:30,color}}/><h2 style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:30}}>KEY POSITION</h2>
            <span className="tag" style={{background:`${color}22`,color,border:`1px solid ${color}44`}}>LIBERACIÓN FINAL</span>
          </div>
          <p style={{color:T.mu,fontSize:13}}>Validación final en conjunto con QM. Detendrá el cronómetro al liberar.</p>
        </div>
        <div style={{fontFamily:'Share Tech Mono',fontSize:26,color:T.ak,background:'#1a1200',border:`1px solid ${T.ak}44`,padding:'8px 16px',borderRadius:8}} className="bk">{fmtMs(elap)}</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:18}}>
        <MiniModel lbl="MODELO SALIENTE" m={activeCO.modelOut} c={T.re}/>
        <MiniModel lbl="MODELO ENTRANTE" m={activeCO.modelIn}  c={T.gr}/>
      </div>

      <div style={{marginBottom:18,padding:'12px 16px',background:qmOK?`${T.gr}0d`:`${T.ak}0d`,border:`1px solid ${qmOK?T.gr:T.ak}33`,borderRadius:8,display:'flex',alignItems:'center',gap:12}}>
        <i className={`ti ti-${qmOK?'circle-check-filled':'clock'}`} style={{fontSize:22,color:qmOK?T.gr:T.ak}}/>
        <div>
          <div style={{fontWeight:700,color:qmOK?T.gr:T.ak,fontSize:14}}>{qmOK?'QM: Revisión completada':'QM: En proceso'}</div>
          <div style={{fontSize:12,color:T.mu}}>{qmOK?`Finalizado a las ${fmtT(activeCO.departments.qm?.endTime)}`:'Esperando que Quality Management complete su checklist'}</div>
        </div>
      </div>

      {/* Tasks (if any configured) */}
      {tasks.length>0 && (
        <div className="card" style={{marginBottom:18}}>
          <div style={{fontFamily:'Barlow Condensed',fontWeight:800,fontSize:15,marginBottom:14,color}}>TAREAS PREVIAS</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {tasks.map((t,i)=><TaskRow key={t.id} task={t} index={i} color={color} onStart={()=>startTask(t.id)} onComplete={()=>completeTask(t)}/>)}
          </div>
        </div>
      )}

      {/* Decision */}
      <div className="card" style={{marginBottom:18}}>
        <div style={{fontFamily:'Barlow Condensed',fontWeight:800,fontSize:16,marginBottom:18,color}}>
          <i className="ti ti-clipboard-check"/> EVALUACIÓN DE LA PIEZA
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:18}}>
          {[['ok',T.gr,'ti-circle-check-filled','DIMENSIONES CORRECTAS','La pieza cumple con todas las dimensiones y tolerancias'],
            ['defects',T.re,'ti-alert-triangle','DEFECTOS DETECTADOS','La pieza presenta defectos estructurales o de riesgo']].map(([v,c,ic,lbl,desc])=>(
            <button key={v} onClick={()=>setDec(v)} style={{
              padding:'22px 16px',borderRadius:10,textAlign:'center',cursor:'pointer',
              background:dec===v?`${c}1a`:T.s2, border:`2px solid ${dec===v?c:T.bd}`,
              color:dec===v?c:T.di, fontFamily:'Barlow Condensed',fontSize:17,fontWeight:700,
              display:'flex',flexDirection:'column',alignItems:'center',gap:10,
            }}>
              <i className={`ti ${ic}`} style={{fontSize:38}}/>
              <span>{lbl}</span>
              <span style={{fontSize:12,fontWeight:400,color:T.mu}}>{desc}</span>
            </button>
          ))}
        </div>

        {dec==='defects' && (
          <div style={{background:`${T.re}08`,border:`1px solid ${T.re}33`,borderRadius:8,padding:16}} className="fi">
            <div style={{marginBottom:12}}>
              <label className="lbl">Descripción de defectos</label>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Describa los defectos encontrados..." style={{resize:'vertical'}}/>
            </div>
            <div>
              <label className="lbl">Evidencia fotográfica</label>
              <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleImgs} style={{display:'none'}}/>
              <button className="b bg bsm" style={{marginBottom:10}} onClick={()=>fileRef.current?.click()}>
                <i className="ti ti-camera"/> ADJUNTAR FOTO
              </button>
              {imgs.length>0 && (
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
                  {imgs.map((img,i)=>(
                    <div key={i} style={{position:'relative',width:90,height:90,borderRadius:6,overflow:'hidden',border:`1px solid ${T.bd}`}}>
                      <img src={img.data} alt={img.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                      <button onClick={()=>setImgs(p=>p.filter((_,j)=>j!==i))} style={{position:'absolute',top:2,right:2,background:'#000a',border:'none',color:'white',borderRadius:'50%',width:18,height:18,fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
        <button className="b bg" onClick={saveEval}><i className="ti ti-device-floppy"/> GUARDAR EVALUACIÓN</button>
        {dec==='defects' && <button className="b ber" onClick={saveEval}><i className="ti ti-alert-triangle"/> REGISTRAR DEFECTOS</button>}
        {dec==='ok' && <button className="b bok blg" onClick={()=>setConf(true)}><i className="ti ti-flag-3"/> LIBERAR — FINALIZAR CAMBIO</button>}
      </div>

      {conf && (
        <div style={{position:'fixed',inset:0,background:'#000c',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}} onClick={()=>setConf(false)}>
          <div className="card fi" style={{padding:36,maxWidth:400,width:'90%',textAlign:'center',border:`1px solid ${T.gr}`}} onClick={e=>e.stopPropagation()}>
            <i className="ti ti-flag-3" style={{fontSize:52,color:T.gr,display:'block',marginBottom:16}}/>
            <div style={{fontFamily:'Barlow Condensed',fontSize:26,fontWeight:900,marginBottom:8}}>CONFIRMAR LIBERACIÓN</div>
            <p style={{color:T.mu,fontSize:13,marginBottom:24}}>Esto finalizará el cambio de modelo, detendrá el cronómetro y registrará todos los tiempos de proceso.</p>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <button className="b bg" onClick={()=>setConf(false)}>CANCELAR</button>
              <button className="b bok" style={{padding:'10px 24px'}} onClick={finalize}><i className="ti ti-check"/> CONFIRMAR LIBERACIÓN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═════════════════════ DETAIL VIEW ══════════════════════════════════════════ */
function DetailView({ selCO, cos, setView }) {
  const co = cos.find(c=>c.id===selCO);
  if (!co) return <div style={{padding:40,textAlign:'center',color:T.mu}}>Registro no encontrado</div>;
  const total = co.status==='completed' ? co.totalTime : (Date.now()-co.startTime);

  return (
    <div style={{padding:24,maxWidth:1100,margin:'0 auto'}} className="fi">
      <div style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:24}}>
        <div style={{flex:1}}>
          <button className="b bg bsm" style={{marginBottom:10}} onClick={()=>setView('dashboard')}><i className="ti ti-arrow-left"/> Volver al Dashboard</button>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <h2 style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:32}}>CAMBIO #{co.id}</h2>
            <SBadge s={co.status}/>
          </div>
          <div style={{color:T.mu,fontSize:13,marginTop:4}}>
            Línea {co.pressLine} · Inicio: {fmtDT(co.startTime)}
            {co.endTime && ` · Fin: ${fmtDT(co.endTime)}`}
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:10,color:T.mu,letterSpacing:'.1em',fontWeight:700,marginBottom:4}}>TIEMPO TOTAL</div>
          <div style={{fontFamily:'Share Tech Mono',fontSize:32,color:co.status==='completed'?T.gr:T.ak}}>{fmtMs(total)}</div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:22}}>
        <ModelCard lbl="MODELO SALIENTE" m={co.modelOut} c={T.re}/>
        <ModelCard lbl="MODELO ENTRANTE" m={co.modelIn}  c={T.gr}/>
      </div>

      <div className="card">
        <div style={{fontFamily:'Barlow Condensed',fontWeight:800,fontSize:17,marginBottom:20}}>HISTORIAL POR DEPARTAMENTO</div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {Depts.map(dept=>{
            const dd=co.departments[dept]; if(!dd) return null;
            const c=DC[dept]; const tasks=dd.tasks||[]; const done=tasks.filter(t=>t.completed).length;
            const dElap=(dd.endTime&&dd.startTime)?(dd.endTime-dd.startTime):0;
            return (
              <div key={dept} style={{background:T.s2,border:`1px solid ${T.bd}`,borderRadius:8,padding:16}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:tasks.length?12:0}}>
                  <i className={`ti ${DI[dept]}`} style={{color:c,fontSize:18}}/>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:'Barlow Condensed',fontWeight:800,fontSize:16}}>{DL[dept]}</div>
                    {tasks.length>0&&<div style={{fontSize:12,color:T.mu}}>{done}/{tasks.length} tareas · Iniciado: {fmtT(dd.startTime)}</div>}
                  </div>
                  <span className="tag" style={{background:`${c}22`,color:c,border:`1px solid ${c}44`}}>
                    {dd.status==='completed'?'✓ COMPLETADO':dd.status==='active'?'▶ ACTIVO':'PENDIENTE'}
                  </span>
                  {dElap>0 && <span style={{fontFamily:'Share Tech Mono',fontSize:13,color:c}}>{fmtMs(dElap)}</span>}
                </div>
                {tasks.length>0 && (
                  <div style={{borderTop:`1px solid ${T.bd}`,paddingTop:10,display:'flex',flexDirection:'column',gap:4}}>
                    {tasks.map(t=>(
                      <div key={t.id} style={{display:'grid',gridTemplateColumns:'22px 1fr 70px 80px 90px',gap:8,alignItems:'center',padding:'5px 0',borderBottom:`1px solid ${T.bd}11`,fontSize:13}}>
                        <span style={{color:t.completed?T.gr:T.mu}}>{t.completed?<i className="ti ti-check"/>:'○'}</span>
                        <div>
                          <div style={{color:t.completed?T.mu:T.tx,textDecoration:t.completed?'line-through':'none',fontSize:13}}>{t.task}</div>
                          <div style={{fontSize:11,color:T.mu}}><i className="ti ti-user" style={{fontSize:10}}/> {t.responsible}</div>
                        </div>
                        <div style={{textAlign:'right',fontFamily:'Share Tech Mono',fontSize:11,color:T.mu}}>{t.estimatedTime}m obj.</div>
                        <div style={{textAlign:'right',fontSize:11,color:T.di}}>{t.completedAt?fmtT(t.completedAt):'—'}</div>
                        <div style={{textAlign:'right',fontFamily:'Share Tech Mono',fontSize:12,color:t.lossTime>0?T.re:T.gr}}>
                          {t.lossTime!=null?fmtLoss(t.lossTime):'—'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {dept==='keyposition' && dd.decision && (
                  <div style={{borderTop:`1px solid ${T.bd}`,paddingTop:12,marginTop:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                      <i className={`ti ti-${dd.decision==='ok'?'circle-check-filled':'alert-triangle'}`} style={{fontSize:20,color:dd.decision==='ok'?T.gr:T.re}}/>
                      <span style={{fontWeight:700,color:dd.decision==='ok'?T.gr:T.re,fontFamily:'Barlow Condensed',fontSize:16,letterSpacing:'.04em'}}>
                        {dd.decision==='ok'?'DIMENSIONES CORRECTAS — PIEZA LIBERADA':'DEFECTOS DETECTADOS'}
                      </span>
                    </div>
                    {dd.defectNotes && <div style={{fontSize:13,color:T.di,marginBottom:8}}>{dd.defectNotes}</div>}
                    {dd.defectImages?.length>0 && (
                      <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                        {dd.defectImages.map((img,i)=>(
                          <img key={i} src={img.data} alt={img.name} style={{width:80,height:80,objectFit:'cover',borderRadius:4,border:`1px solid ${T.bd}`}}/>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════ ADMIN ════════════════════════════════════════════════ */
function AdminView({ users, cl, saveU, saveCl }) {
  const [tab, setTab] = useState('users');
  return (
    <div style={{padding:24,maxWidth:1000,margin:'0 auto'}} className="fi">
      <h2 style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:28,marginBottom:6}}>PANEL DE ADMINISTRACIÓN</h2>
      <p style={{color:T.mu,fontSize:13,marginBottom:20}}>Gestión de usuarios y configuración de checklists por departamento</p>
      <div style={{display:'flex',gap:6,marginBottom:22,borderBottom:`1px solid ${T.bd}`,paddingBottom:1}}>
        {[['users','ti-users','Usuarios'],['checklists','ti-list-check','Checklists']].map(([t,ic,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:'9px 20px',background:'transparent',border:'none',borderBottom:`2px solid ${tab===t?T.ak:'transparent'}`,color:tab===t?T.ak:T.mu,fontFamily:'Barlow Condensed',fontWeight:700,fontSize:15,letterSpacing:'.05em',display:'flex',alignItems:'center',gap:6}}>
            <i className={`ti ${ic}`}/> {l.toUpperCase()}
          </button>
        ))}
      </div>
      {tab==='users'      && <UserMgmt users={users} saveU={saveU}/>}
      {tab==='checklists' && <CLMgmt cl={cl} saveCl={saveCl}/>}
    </div>
  );
}

/* ─── USER MANAGEMENT ─────────────────────────────────────────────────────── */
function UserMgmt({ users, saveU }) {
  const [editing,setEditing] = useState(null);
  const [adding, setAdding]  = useState(false);
  const [newU,   setNewU]    = useState({username:'',password:'',name:'',role:'tooling',active:true});
  const [delId,  setDelId]   = useState(null);

  const add    = async () => { if(!newU.username||!newU.password) return; await saveU([...users,{...newU,id:'u'+Date.now()}]); setNewU({username:'',password:'',name:'',role:'tooling',active:true}); setAdding(false); };
  const upd    = async () => { await saveU(users.map(u=>u.id===editing.id?editing:u)); setEditing(null); };
  const del    = async ()  => { await saveU(users.filter(u=>u.id!==delId)); setDelId(null); };
  const toggle = async (id)=> { await saveU(users.map(u=>u.id===id?{...u,active:!u.active}:u)); };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <span style={{color:T.mu,fontSize:13}}>{users.length} usuarios registrados</span>
        <button className="b ba bsm" onClick={()=>setAdding(true)}><i className="ti ti-user-plus"/> NUEVO USUARIO</button>
      </div>
      <div className="card">
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead><tr style={{borderBottom:`1px solid ${T.bd}`}}>
            {['Usuario','Nombre','Contraseña','Departamento','Estado',''].map((h,i)=><th key={i} style={{padding:'8px 12px',textAlign:'left',color:T.mu,fontSize:11,fontWeight:700,letterSpacing:'.08em'}}>{h}</th>)}
          </tr></thead>
          <tbody>{users.map(u=>(
            <tr key={u.id} style={{borderBottom:`1px solid ${T.bd}22`}}>
              <td style={{padding:'10px 12px',fontFamily:'Share Tech Mono',color:T.ak}}>{u.username}</td>
              <td style={{padding:'10px 12px'}}>{u.name}</td>
              <td style={{padding:'10px 12px',fontFamily:'Share Tech Mono',color:T.mu,fontSize:12}}>{'•'.repeat(Math.min(u.password.length,12))}</td>
              <td style={{padding:'10px 12px'}}>
                <span className="tag" style={{background:`${DC[u.role]||T.mu}22`,color:DC[u.role]||T.mu,border:`1px solid ${DC[u.role]||T.mu}44`}}>{DL[u.role]}</span>
              </td>
              <td style={{padding:'10px 12px'}}>
                <button onClick={()=>toggle(u.id)} style={{background:'transparent',border:`1px solid ${u.active?T.gr:T.re}44`,color:u.active?T.gr:T.re,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,fontFamily:'Barlow Condensed'}}>
                  {u.active?'ACTIVO':'INACTIVO'}
                </button>
              </td>
              <td style={{padding:'10px 12px',display:'flex',gap:6}}>
                <button className="b bg bsm" onClick={()=>setEditing({...u})}><i className="ti ti-pencil"/></button>
                {u.role!=='admin'&&<button className="b ber bsm" onClick={()=>setDelId(u.id)}><i className="ti ti-trash"/></button>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {editing && <Modal title="EDITAR USUARIO" onClose={()=>setEditing(null)}><UForm u={editing} setU={setEditing} onSave={upd} onCancel={()=>setEditing(null)} lbl="GUARDAR CAMBIOS"/></Modal>}
      {adding  && <Modal title="NUEVO USUARIO"  onClose={()=>setAdding(false)}><UForm u={newU} setU={setNewU} onSave={add} onCancel={()=>setAdding(false)} lbl="CREAR USUARIO"/></Modal>}
      {delId   && <Modal title="CONFIRMAR ELIMINACIÓN" onClose={()=>setDelId(null)}>
        <p style={{color:T.di,marginBottom:20}}>¿Eliminar este usuario? Esta acción no se puede deshacer.</p>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button className="b bg" onClick={()=>setDelId(null)}>CANCELAR</button>
          <button className="b ber" onClick={del}><i className="ti ti-trash"/> ELIMINAR</button>
        </div>
      </Modal>}
    </div>
  );
}
function UForm({ u, setU, onSave, onCancel, lbl }) {
  const set=(k,v)=>setU(x=>({...x,[k]:v}));
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
        <div><label className="lbl">Usuario</label><input value={u.username} onChange={e=>set('username',e.target.value)}/></div>
        <div><label className="lbl">Contraseña</label><input value={u.password} onChange={e=>set('password',e.target.value)}/></div>
        <div><label className="lbl">Nombre completo</label><input value={u.name} onChange={e=>set('name',e.target.value)}/></div>
        <div><label className="lbl">Departamento</label>
          <select value={u.role} onChange={e=>set('role',e.target.value)}>
            {Depts.map(d=><option key={d} value={d}>{DL[d]}</option>)}
          </select>
        </div>
      </div>
      <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
        <button className="b bg" onClick={onCancel}>CANCELAR</button>
        <button className="b ba" onClick={onSave}><i className="ti ti-check"/> {lbl}</button>
      </div>
    </div>
  );
}

/* ─── CHECKLIST MANAGEMENT ────────���────────────────────���──────────────────── */
function CLMgmt({ cl, saveCl }) {
  const [dept,    setDept]    = useState('tooling');
  const [adding,  setAdding]  = useState(false);
  const [editing, setEditing] = useState(null);
  const [newT,    setNewT]    = useState({task:'',estimatedTime:15,responsible:''});
  const tasks = cl[dept]||[];

  const add  = async () => { if(!newT.task.trim()) return; await saveCl({...cl,[dept]:[...tasks,{id:'t'+Date.now(),...newT,estimatedTime:Number(newT.estimatedTime)}]}); setNewT({task:'',estimatedTime:15,responsible:''}); setAdding(false); };
  const del  = async id  => { await saveCl({...cl,[dept]:tasks.filter(t=>t.id!==id)}); };
  const save = async () => { await saveCl({...cl,[dept]:tasks.map(t=>t.id===editing.id?{...editing,estimatedTime:Number(editing.estimatedTime)}:t)}); setEditing(null); };

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:18,flexWrap:'wrap'}}>
        {[...Depts.slice(1)].map(d=>(
          <button key={d} onClick={()=>setDept(d)} style={{padding:'7px 16px',borderRadius:6,border:'none',fontFamily:'Barlow Condensed',fontWeight:700,fontSize:14,display:'flex',alignItems:'center',gap:6,background:dept===d?DC[d]:`${DC[d]}22`,color:dept===d?'#000':DC[d]}}>
            <i className={`ti ${DI[d]}`}/> {DL[d]}
          </button>
        ))}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <span style={{color:T.mu,fontSize:13}}>{tasks.length} tareas · {DL[dept]}</span>
        <button className="b ba bsm" onClick={()=>setAdding(true)}><i className="ti ti-plus"/> AGREGAR TAREA</button>
      </div>
      <div className="card">
        {tasks.length===0
          ? <div style={{textAlign:'center',padding:32,color:T.mu}}>Sin tareas. Agregue la primera tarea.</div>
          : <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {tasks.map((t,i)=>(
                <div key={t.id} style={{background:T.s2,border:`1px solid ${T.bd}`,borderRadius:8,padding:'12px 14px',display:'grid',gridTemplateColumns:'26px 1fr 70px 120px auto',gap:10,alignItems:'center'}}>
                  <div style={{width:24,height:24,borderRadius:'50%',background:`${DC[dept]}22`,border:`1px solid ${DC[dept]}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:DC[dept],flexShrink:0}}>{i+1}</div>
                  <div>
                    <div style={{fontSize:14}}>{t.task}</div>
                    <div style={{fontSize:11,color:T.mu,marginTop:3}}><i className="ti ti-user" style={{fontSize:11}}/> {t.responsible||'Sin asignar'}</div>
                  </div>
                  <div style={{textAlign:'right',fontFamily:'Share Tech Mono',fontSize:12,color:T.di}}>{t.estimatedTime}m</div>
                  <div style={{height:4,background:T.bd,borderRadius:2,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${Math.min((t.estimatedTime/60)*100,100)}%`,background:DC[dept]}}/>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button className="b bg bsm" onClick={()=>setEditing({...t})}><i className="ti ti-pencil"/></button>
                    <button className="b ber bsm" onClick={()=>del(t.id)}><i className="ti ti-trash"/></button>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>
      {adding  && <Modal title={`NUEVA TAREA — ${DL[dept].toUpperCase()}`} onClose={()=>setAdding(false)}><TForm t={newT} setT={setNewT} onSave={add} onCancel={()=>setAdding(false)} lbl="AGREGAR"/></Modal>}
      {editing && <Modal title="EDITAR TAREA" onClose={()=>setEditing(null)}><TForm t={editing} setT={setEditing} onSave={save} onCancel={()=>setEditing(null)} lbl="GUARDAR"/></Modal>}
    </div>
  );
}
function TForm({ t, setT, onSave, onCancel, lbl }) {
  const set=(k,v)=>setT(x=>({...x,[k]:v}));
  return (
    <div>
      <div style={{marginBottom:14}}><label className="lbl">Descripción <span style={{color:T.re}}>*</span></label><textarea value={t.task} onChange={e=>set('task',e.target.value)} rows={2} style={{resize:'vertical'}} placeholder="Descripción detallada de la tarea..."/></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
        <div><label className="lbl">Tiempo estimado (min) <span style={{color:T.re}}>*</span></label><input type="number" min={1} max={999} value={t.estimatedTime} onChange={e=>set('estimatedTime',e.target.value)}/></div>
        <div><label className="lbl">Responsable</label><input value={t.responsible} onChange={e=>set('responsible',e.target.value)} placeholder="Nombre o rol..."/></div>
      </div>
      <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
        <button className="b bg" onClick={onCancel}>CANCELAR</button>
        <button className="b ba" onClick={onSave}><i className="ti ti-check"/> {lbl}</button>
      </div>
    </div>
  );
}

/* ═════════════════════ SHARED COMPONENTS ════════════════════════════════════ */
function Modal({ title, children, onClose }) {
  return (
    <div style={{position:'fixed',inset:0,background:'#000b',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}} onClick={onClose}>
      <div className="card fi" style={{padding:28,maxWidth:580,width:'90%',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:18,letterSpacing:'.05em'}}>{title}</div>
          <button onClick={onClose} style={{background:'transparent',color:T.mu,fontSize:22,lineHeight:1,padding:'2px 6px'}}><i className="ti ti-x" style={{fontSize:18}}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MiniModel({ lbl, m, c }) {
  if (!m) return null;
  return (
    <div style={{background:T.s2,border:`1px solid ${c}22`,borderRadius:8,padding:12}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:'.1em',color:c,marginBottom:8}}>{lbl}</div>
      <div style={{fontFamily:'Share Tech Mono',fontSize:15,color:T.tx,marginBottom:4}}>{m.partNumber||'—'}</div>
      <div style={{fontSize:12,color:T.mu}}>{m.size} {m.size&&m.shift?'·':''} {m.shift?.split(' ')[0]}</div>
    </div>
  );
}

function ModelCard({ lbl, m, c }) {
  if (!m) return null;
  const rows = [['Número de Parte',m.partNumber],['Tamaño',m.size],['Línea de Prensa',m.pressLine],['Fecha',m.date],['Turno',m.shift]];
  return (
    <div className="card" style={{border:`1px solid ${c}22`}}>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:'.1em',color:c,marginBottom:14}}>{lbl}</div>
      {rows.map(([k,v])=>v&&(
        <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${T.bd}22`,fontSize:13}}>
          <span style={{color:T.mu}}>{k}</span>
          <span style={{fontFamily:'Share Tech Mono',color:T.tx,fontSize:12}}>{v}</span>
        </div>
      ))}
    </div>
  );
}
