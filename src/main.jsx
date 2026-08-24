import React,{useEffect,useMemo,useRef,useState}from'react';
import{createRoot}from'react-dom/client';
import{createClient}from'@supabase/supabase-js';
import{CalendarDays,PartyPopper,Star,ScanLine,Gamepad2,Gift,ArrowLeft,Phone,Users,Clock,Newspaper,UserRound,History,LogIn,CheckCircle2,ShieldCheck,RefreshCw,UserCog}from'lucide-react';
import'./style.css';

const sb=createClient('https://riknzyfgcxkuwnpmnvbq.supabase.co','sb_publishable_qdXF0R9dswggsk9ZFKhNYA_yATpLC6D');
const RESTAURANT_ID='e429f470-29f9-44af-bbdb-549068f64019';
const T=(lang,th,en,zh)=>lang==='en'?en:lang==='zh'?zh:th;
const localText=(obj,base,lang)=>{
 if(!obj)return'';
 const th=obj[`${base}_th`]??obj[base]??'';
 const en=obj[`${base}_en`]??'';
 const zh=obj[`${base}_zh`]??'';
 return lang==='en'?(en||th):lang==='zh'?(zh||th):th;
};
const SAMPLE_I18N={
 'ยินดีต้อนรับสู่บ้านต้นกล้า':{en:'Welcome to LekHub',zh:'欢迎来到 LekHub'},
 'กิจกรรมสนุกสำหรับเด็กและครอบครัว':{en:'Fun activities for kids and families',zh:'适合儿童和家庭的有趣活动'},
 'สนุกกับกิจกรรมสำหรับเด็ก สะสมแต้ม และเกมล่าตัวอักษรใน LINE OA ของร้าน':{en:'Enjoy kids activities, collect points, and play the letter hunt game in our LINE OA.',zh:'参与儿童活动、累积积分，并在店铺 LINE OA 中体验字母寻宝游戏。'},
 'ส่วนลด 50 บาท':{en:'50 THB Discount',zh:'50 泰铢优惠'},
 'ส่วนลด 100 บาท':{en:'100 THB Discount',zh:'100 泰铢优惠'},
 'เครื่องดื่มฟรี 1 แก้ว':{en:'1 Free Drink',zh:'免费饮品 1 杯'},
 'ไอศกรีมฟรี 1 ลูก':{en:'1 Free Ice Cream Scoop',zh:'免费冰淇淋 1 球'},
 'วันเกิด':{en:'Birthday',zh:'生日'},
 'งานครอบครัว':{en:'Family Event',zh:'家庭活动'},
 'โรงเรียน / กลุ่มเด็ก':{en:'School / Kids Group',zh:'学校 / 儿童团体'},
 'งานบริษัท':{en:'Company Event',zh:'公司活动'},
 'อื่น ๆ':{en:'Other',zh:'其他'}
};
const translatedValue=(value,lang)=>{
 if(lang==='th'||value==null)return value??'';
 const hit=SAMPLE_I18N[String(value).trim()];
 return hit?(lang==='en'?hit.en:hit.zh):value;
};

const customerMenus=lang=>[
 [T(lang,'จองโต๊ะ','Book a table','预订座位'),CalendarDays,'booking','🍽️'],
 [T(lang,'จองห้องไพรเวท','Private room','预订私人包间'),PartyPopper,'event','🎉'],
 [T(lang,'สมาชิก','Member','会员'),Star,'member','⭐'],
 [T(lang,'เล่นเกมส์','Play game','玩游戏'),Gamepad2,'game','🎮'],
 [T(lang,'แต้ม & รางวัล','Points & Rewards','积分与奖励'),Gift,'rewards','🎁'],
 [T(lang,'เรียก Grab','Call Grab','叫 Grab'),null,'grab','🚕']
];
const DIRECT_PAGES=new Set(['home','booking','event','member','game','rewards','rules','report']);
function initialDirectPage(){
 const params=new URLSearchParams(window.location.search);
 const view=params.get('view');
 const page=params.get('page');
 const map={rules:'rules',report:'report',admin:'admin'};
 if(view&&map[view])return map[view];
 return DIRECT_PAGES.has(page)?page:'home';
}
function initialGrabOpen(){return new URLSearchParams(window.location.search).get('page')==='grab';}

function LangBar({lang,setLang}){return <div className="langBar"><button className={lang==='th'?'active':''} onClick={()=>setLang('th')}>🇹🇭 TH</button><button className={lang==='en'?'active':''} onClick={()=>setLang('en')}>🇬🇧 EN</button><button className={lang==='zh'?'active':''} onClick={()=>setLang('zh')}>🇨🇳 中文</button></div>}



const STAFF_ROLES=new Set(['staff','admin','owner','super_admin']);
const LIFF_ID=(import.meta.env.VITE_LINE_LIFF_ID||'2011199813-swdN7h10').trim();
function cachedLineProfile(){try{return JSON.parse(localStorage.getItem('lekhub_line_profile')||'null')}catch(e){return null}}
async function loadLineProfile(){
 const cached=cachedLineProfile();
 if(!LIFF_ID||!window.liff)return cached;
 try{
  await window.liff.init({liffId:LIFF_ID,withLoginOnExternalBrowser:false});
  if(!window.liff.isLoggedIn())return cached;
  const p=await window.liff.getProfile();
  const line={userId:p.userId||'',displayName:p.displayName||'',pictureUrl:p.pictureUrl||'',accessToken:window.liff.getAccessToken?.()||''};
  localStorage.setItem('lekhub_line_profile',JSON.stringify({userId:line.userId,displayName:line.displayName,pictureUrl:line.pictureUrl}));
  return line;
 }catch(e){return cached}
}

async function verifyLineIdentity(bindToken=''){
 const lp=await loadLineProfile();
 if(!lp?.accessToken)return {ok:false,reason:'line_not_ready'};
 let {data:{session}}=await sb.auth.getSession();
 if(!session){
  const{error}=await sb.auth.signInAnonymously({options:{data:{name:lp.displayName||'LINE Member',restaurant_slug:'lekhub',source:'line_oa'}}});
  if(error)return {ok:false,reason:'supabase_session_failed'};
  await new Promise(r=>setTimeout(r,200));
 }
 const{data,error}=await sb.functions.invoke('line-identity',{body:{access_token:lp.accessToken,bind_token:bindToken||undefined}});
 if(error)return {ok:false,reason:error.message||'line_identity_failed'};
 return data||{ok:false,reason:'empty_identity_result'};
}
function App(){
 const[page,setPage]=useState(()=>initialDirectPage()),[news,setNews]=useState([]),[session,setSession]=useState(null),[profile,setProfile]=useState(null),[lineProfile,setLineProfile]=useState(()=>cachedLineProfile()),[lang,setLang]=useState(()=>localStorage.getItem('LekHub_LekHub_lang')||'th'),[adminGateOpen,setAdminGateOpen]=useState(false),[adminPassword,setAdminPassword]=useState(''),[adminGateMsg,setAdminGateMsg]=useState(''),[adminGateBusy,setAdminGateBusy]=useState(false),[adminDevice,setAdminDevice]=useState(()=>localStorage.getItem('LekHub_LekHub_admin_device')==='1');
 useEffect(()=>{localStorage.setItem('LekHub_LekHub_lang',lang);document.documentElement.lang=lang==='zh'?'zh-CN':lang},[lang]);
 async function loadProfile(s=session){if(!s?.user){setProfile(null);return}const{data}=await sb.from('profiles').select('*').eq('id',s.user.id).maybeSingle();setProfile(data||null)}
 useEffect(()=>{
  sb.from('news_posts').select('*').eq('published',true).order('pinned',{ascending:false}).limit(5).then(({data})=>setNews(data||[]));
  loadLineProfile().then(lp=>{if(lp)setLineProfile(lp)});
  sb.auth.getSession().then(({data})=>{setSession(data.session||null);if(data.session)loadProfile(data.session)});
  const{data:sub}=sb.auth.onAuthStateChange((_e,s)=>{setSession(s);if(s)setTimeout(()=>loadProfile(s),0);else setProfile(null)});
  return()=>sub.subscription.unsubscribe()
 },[]);
 useEffect(()=>{
  if(!session?.user||!lineProfile)return;
  const patch={};
  if(lineProfile.displayName)patch.display_name=lineProfile.displayName;
  if(lineProfile.pictureUrl)patch.avatar_url=lineProfile.pictureUrl;
  if(lineProfile.userId)patch.line_user_id=lineProfile.userId;
  if(Object.keys(patch).length)sb.from('profiles').update(patch).eq('id',session.user.id).then(()=>loadProfile(session));
 },[session?.user?.id,lineProfile?.userId,lineProfile?.displayName,lineProfile?.pictureUrl]);
 const menus=customerMenus(lang);
 function openPage(safe){
  setPage(safe);
  const u=new URL(window.location.href);
  if(safe==='home'||safe==='admin')u.searchParams.delete('page'); else u.searchParams.set('page',safe);
  window.history.replaceState({},'',u);
 }
 function goPage(next){
  const internalAllowed=next==='admin'||DIRECT_PAGES.has(next);
  const safe=internalAllowed?next:'home';
  if(safe==='admin'){
   if(adminDevice){openPage('admin');return}
   setAdminPassword('');setAdminGateMsg('');setAdminGateOpen(true);return
  }
  openPage(safe)
 }
 async function unlockAdmin(e){
  e?.preventDefault();
  if(!adminPassword){setAdminGateMsg('กรุณาใส่รหัสผ่าน');return}
  setAdminGateBusy(true);setAdminGateMsg('กำลังตรวจรหัส...');
  let activeSession=session;
  if(!activeSession?.user){
   const{data,error}=await sb.auth.signInAnonymously();
   if(error||!data?.session){setAdminGateMsg('เปิดบัญชีแอดมินไม่สำเร็จ กรุณาลองใหม่');setAdminGateBusy(false);return}
   activeSession=data.session;setSession(activeSession);
   await new Promise(r=>setTimeout(r,250));
  }
  const{data,error}=await sb.rpc('claim_LekHub_LekHub_admin',{p_password:adminPassword});
  if(error){setAdminGateMsg('ตรวจรหัสไม่สำเร็จ กรุณาลองใหม่');setAdminGateBusy(false);return}
  if(!data?.success){setAdminGateMsg(data?.reason==='wrong_password'?'รหัสผ่านไม่ถูกต้อง':'เปิดสิทธิ์แอดมินไม่สำเร็จ');setAdminGateBusy(false);return}
  localStorage.setItem('LekHub_LekHub_admin_device','1');setAdminDevice(true);
  await loadProfile(activeSession);
  setAdminGateBusy(false);setAdminGateOpen(false);setAdminPassword('');setAdminGateMsg('');openPage('admin');window.scrollTo({top:0,behavior:'auto'});
 }
 function exitAdminMode(){localStorage.removeItem('LekHub_LekHub_admin_device');setAdminDevice(false);openPage('home')}
 return <main>{page!=='admin'&&<LangBar lang={lang} setLang={setLang}/>}
 {page!=='home'&&<button className="back" onClick={()=>goPage('home')}><ArrowLeft/> {T(lang,'กลับหน้าหลัก','Home','返回首页')}</button>}
 {page==='home'?<Home setPage={goPage} news={news} profile={profile} lang={lang} initialGrab={initialGrabOpen()}/>:page==='booking'?<Booking profile={profile} session={session} lang={lang}/>:page==='event'?<Event profile={profile} lang={lang}/>:page==='member'?<Member session={session} profile={profile} lineProfile={lineProfile} reload={()=>loadProfile()} setPage={goPage} lang={lang}/>:page==='game'?<Game session={session} lang={lang}/>:page==='rewards'?<Rewards session={session} profile={profile} reload={()=>loadProfile()} lang={lang}/>:page==='admin'?<Admin session={session} profile={profile} forceAdmin={adminDevice} onExitAdmin={exitAdminMode}/>:<Coming title={menus.find(x=>x[2]===page)?.[0]}/>}{adminGateOpen&&<div className="adminPassOverlay" role="dialog" aria-modal="true" aria-label="ใส่รหัสหลังบ้าน"><form className="adminPassModal" onSubmit={unlockAdmin}><button type="button" className="adminPassClose" onClick={()=>{if(!adminGateBusy)setAdminGateOpen(false)}}>×</button><div className="adminPassIcon"><ShieldCheck/></div><h3>เข้าสู่หลังบ้าน</h3><p>ใส่รหัสผ่านแอดมิน</p><input autoFocus type="password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} placeholder="รหัสผ่าน" autoComplete="current-password"/><button className="primary" disabled={adminGateBusy}>{adminGateBusy?'กำลังตรวจ...':'เข้าหลังบ้าน'}</button>{adminGateMsg&&<div className="adminPassMsg">{adminGateMsg}</div>}<small>ใส่ถูกครั้งเดียว เครื่องนี้จะจำว่าเป็นแอดมิน</small></form></div>}</main>
}
function Home({setPage,news,profile,lang,initialGrab=false}){
 const isStaff=['staff','admin','owner','super_admin'].includes(profile?.role),menus=customerMenus(lang),[grabOpen,setGrabOpen]=useState(initialGrab),[rideFrom,setRideFrom]=useState('home'),[homeAddress,setHomeAddress]=useState(()=>localStorage.getItem('LekHub_LekHub_home_address')||''),[grabMsg,setGrabMsg]=useState('');
 function saveHomeAddress(v){setHomeAddress(v);localStorage.setItem('LekHub_LekHub_home_address',v)}
 async function callGrab(){
  const shop=T(lang,'บ้านต้นกล้า คาเฟ่ แอนด์ คิดส์ สเปซ','LekHub & Kids Space','LekHub & Kids Space');
  const destination=rideFrom==='home'?shop:homeAddress.trim();
  if(rideFrom==='shop'&&!destination){setGrabMsg(T(lang,'กรุณาใส่ที่อยู่บ้านก่อน','Enter your home address first','请先填写家庭地址'));return}
  try{await navigator.clipboard?.writeText(destination)}catch(e){}
  setGrabMsg(T(lang,`คัดลอกปลายทางแล้ว: ${destination}`,`Destination copied: ${destination}`,`已复制目的地：${destination}`));
  window.open('https://www.grab.com/th/transport/','_blank','noopener')
 }
 return <><section className="hero"><img className="storeLogo homeStoreLogo" src="/LekHub-logo.png" alt="LekHub & Kids Space"/><span className="bubble">{profile?`⭐ ${profile.points_balance||0} ${T(lang,'แต้ม','points','积分')}`:T(lang,'สนุก • อร่อย • ได้แต้ม','Fun • Delicious • Earn points','好玩 • 美味 • 赚积分')}</span></section>
 <section className="news"><Newspaper/><div><b>{news[0]?translatedValue(localText(news[0],'title',lang),lang):T(lang,'ยินดีต้อนรับสู่บ้านต้นกล้า','Welcome to LekHub','欢迎来到 LekHub')}</b><p>{news[0]?translatedValue(localText(news[0],'body',lang),lang):T(lang,'กิจกรรมสนุกสำหรับเด็กและครอบครัว','Fun activities for kids and families','适合儿童和家庭的有趣活动')}</p></div></section>
 <div className="homeMenuHead"><h2>{T(lang,'เมนูหลัก','Main Menu','主菜单')}</h2><small>{T(lang,'เลือกสิ่งที่ต้องการได้เลย','Choose what you need','请选择功能')}</small></div>
 <section className="homeIconGrid">{menus.map(([t,I,p,emoji])=><button className={'homeIconCard '+(p==='grab'?'grabTile':'')} key={p} onClick={()=>p==='grab'?setGrabOpen(true):setPage(p)}><span className="homeIconBubble">{I?<I/>:<span className="emojiIcon">{emoji}</span>}</span><b>{t}</b></button>)}</section>
 <section className="quest"><div>🗺️</div><div><b>{T(lang,'ล่าคำตามลายแทงสมบัติ','Treasure Word Hunt','寻宝拼字游戏')}</b><p>{T(lang,'ตามคำใบ้ หา QR เก็บตัวอักษร แล้วเรียงคำให้ถูกต้อง','Follow clues, find QR codes and solve the word','根据提示寻找 QR，收集字母并拼出正确答案')}</p></div><button onClick={()=>setPage('game')}>{T(lang,'เริ่มเล่น','Play','开始游戏')}</button></section>
 <button className="adminEntry" onClick={()=>setPage('admin')}><ShieldCheck/><span><b>{T(lang,'หลังบ้านร้าน','Admin','后台管理')}</b><small>{isStaff?T(lang,'จัดการร้าน','Manage store','管理店铺'):T(lang,'เข้าสู่หน้าหลังบ้าน','Open admin','进入后台')}</small></span></button>
 {grabOpen&&<div className="homeGrabModal"><div className="homeGrabSheet"><button className="closeGrab" onClick={()=>setGrabOpen(false)}>×</button><div className="grabSheetHead"><div className="grabBigIcon">🚕</div><div><h3>{T(lang,'เรียก Grab','Call Grab','叫 Grab')}</h3><p>{T(lang,'เลือกต้นทาง แล้วระบบเตรียมปลายทางให้','Choose where you are now','选择你现在的位置')}</p></div></div><div className="grabMode"><button className={rideFrom==='home'?'active':''} onClick={()=>setRideFrom('home')}>🏠 {T(lang,'อยู่บ้าน → ไปร้าน','Home → Cafe','家 → 店')}</button><button className={rideFrom==='shop'?'active':''} onClick={()=>setRideFrom('shop')}>🌱 {T(lang,'อยู่ร้าน → กลับบ้าน','Cafe → Home','店 → 家')}</button></div><label className="grabHomeField"><span>{T(lang,'ที่อยู่บ้าน','Home address','家庭地址')}</span><textarea rows="2" value={homeAddress} onChange={e=>saveHomeAddress(e.target.value)} placeholder={T(lang,'บันทึกที่อยู่บ้านไว้ครั้งเดียว','Save your home address once','保存家庭地址')}/></label><div className="grabDestination"><small>{T(lang,'ปลายทาง','Destination','目的地')}</small><b>{rideFrom==='home'?T(lang,'บ้านต้นกล้า คาเฟ่ แอนด์ คิดส์ สเปซ','LekHub & Kids Space','LekHub & Kids Space'):(homeAddress||T(lang,'กรุณาใส่ที่อยู่บ้าน','Enter home address','请输入家庭地址'))}</b></div><button className="grabCallBtn" onClick={callGrab}>🚕 {T(lang,'เปิด Grab','Open Grab','打开 Grab')}</button>{grabMsg&&<p className="grabModalMsg">{grabMsg}</p>}</div></div>}
 </>}

function Field({icon:Icon,label,...p}){return <label><span>{Icon&&<Icon/>}{label}</span><input {...p}/></label>}
function Booking({profile,session,lang}){const[f,setF]=useState({name:profile?.display_name||'',phone:profile?.phone||'',date:'',time:'',size:2,note:''});const[msg,setMsg]=useState('');const[history,setHistory]=useState([]);useEffect(()=>{if(profile)setF(x=>({...x,name:x.name||profile.display_name||'',phone:x.phone||profile.phone||''}));if(session)sb.from('table_reservations').select('id,booking_code,booking_date,booking_time,party_size,status').order('created_at',{ascending:false}).limit(5).then(({data})=>setHistory(data||[]))},[profile,session]);async function go(e){e.preventDefault();setMsg(T(lang,'กำลังส่ง...','Sending...','正在提交...'));const{data,error}=await sb.rpc('create_table_booking',{p_restaurant_slug:'lekhub',p_customer_name:f.name,p_phone:f.phone,p_booking_date:f.date,p_booking_time:f.time,p_party_size:+f.size,p_note:f.note||null});if(error){setMsg(T(lang,'ส่งไม่สำเร็จ: ','Could not submit: ','提交失败：')+friendly(error.message,lang));return}setMsg(T(lang,`จองสำเร็จ เลขที่ ${data.booking_code} • รอร้านยืนยัน`,`Booked! ${data.booking_code} • Waiting for confirmation`,`预订成功 ${data.booking_code} • 等待店家确认`));if(session){const{data:h}=await sb.from('table_reservations').select('id,booking_code,booking_date,booking_time,party_size,status').order('created_at',{ascending:false}).limit(5);setHistory(h||[])}}return <Panel title={T(lang,'🍽️ จองโต๊ะ','🍽️ Book a table','🍽️ 预订座位')} sub={T(lang,'เลือกวัน เวลา จำนวนคน แล้วรอร้านยืนยัน','Choose date, time and guests, then wait for confirmation','选择日期、时间和人数，然后等待确认')}><form onSubmit={go}><Field label={T(lang,'ชื่อผู้จอง','Name','预订人姓名')} required value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><Field icon={Phone} label={T(lang,'เบอร์ติดต่อ','Phone','联系电话')} required type="tel" inputMode="tel" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/><div className="row"><Field icon={CalendarDays} label={T(lang,'วันที่','Date','日期')} required type="date" min={new Date().toISOString().slice(0,10)} value={f.date} onChange={e=>setF({...f,date:e.target.value})}/><Field icon={Clock} label={T(lang,'เวลา','Time','时间')} required type="time" value={f.time} onChange={e=>setF({...f,time:e.target.value})}/></div><Field icon={Users} label={T(lang,'จำนวนคน','Guests','人数')} required type="number" min="1" max="100" value={f.size} onChange={e=>setF({...f,size:e.target.value})}/><Field label={T(lang,'หมายเหตุ เช่น มีเด็กเล็ก / รถเข็น','Note e.g. child / stroller','备注，例如儿童 / 婴儿车')} value={f.note} onChange={e=>setF({...f,note:e.target.value})}/><button className="primary">{T(lang,'ส่งคำขอจองโต๊ะ','Request booking','提交预订')}</button><p className="msg">{msg}</p></form>{session&&<BookingHistory history={history} lang={lang}/>}</Panel>}
function BookingHistory({history,lang}){return <section className="history"><h3><History/> {T(lang,'การจองของฉัน','My bookings','我的预订')}</h3>{history.length?history.map(x=><div className="historyItem" key={x.id}><div><b>{x.booking_code}</b><small>{dateL(x.booking_date,lang)} • {String(x.booking_time).slice(0,5)} • {x.party_size} {T(lang,'คน','guests','人')}</small></div><Status status={x.status} lang={lang}/></div>):<p className="empty">{T(lang,'ยังไม่มีประวัติการจอง','No booking history yet','暂无预订记录')}</p>}</section>}
function Status({status,lang='th'}){const labels={pending:['รอยืนยัน','Pending','待确认'],confirmed:['ยืนยันแล้ว','Confirmed','已确认'],seated:['เข้าร้านแล้ว','Arrived','已到店'],cancelled:['ยกเลิก','Cancelled','已取消'],completed:['ใช้บริการแล้ว','Completed','已完成'],no_show:['ไม่มา','No show','未到店'],approved:['อนุมัติแล้ว','Approved','已批准'],rejected:['ไม่อนุมัติ','Rejected','未批准'],contacted:['ติดต่อแล้ว','Contacted','已联系'],quoted:['เสนอราคาแล้ว','Quoted','已报价'],used:['ใช้แล้ว','Used','已使用'],reserved:['รอใช้','Reserved','待使用']};const cssMap={pending:'pending',confirmed:'confirmed',seated:'seated',cancelled:'cancelled',completed:'completed',no_show:'no_show',approved:'confirmed',rejected:'cancelled',contacted:'seated',quoted:'confirmed',used:'completed',reserved:'pending'};const a=labels[status]||[status,status,status];return <span className={'status '+(cssMap[status]||'pending')}>{lang==='en'?a[1]:lang==='zh'?a[2]:a[0]}</span>}
function Member({session,profile,lineProfile,reload,setPage,lang}){
 const[msg,setMsg]=useState(''),[points,setPoints]=useState([]),[autoLoading,setAutoLoading]=useState(!session);
 const isStaff=STAFF_ROLES.has(profile?.role);
 const memberName=lineProfile?.displayName||profile?.display_name||T(lang,'สมาชิก LINE','LINE Member','LINE 会员');
 const fallbackAvatar='/member-child-avatar.jpg';
 useEffect(()=>{
  let active=true;
  async function ensureMember(){
   setAutoLoading(true);
   const bindToken=new URLSearchParams(window.location.search).get('bind_admin')||'';
   const result=await verifyLineIdentity(bindToken);
   if(!active)return;
   if(!result?.ok){
    if(!session){
     const{error}=await sb.auth.signInAnonymously({options:{data:{name:'LINE Member',restaurant_slug:'lekhub',source:'line_oa'}}});
     if(error){setMsg(T(lang,'เข้าใช้งานสมาชิกไม่สำเร็จ กรุณาลองใหม่','Could not open member account. Please try again.','无法打开会员账户，请重试'));setAutoLoading(false);return}
    }
    if(result?.reason==='line_not_ready')setMsg(T(lang,'ยังไม่ได้เชื่อม LINE LIFF จึงตรวจสิทธิ์แอดมินไม่ได้','LINE LIFF is not connected yet, so admin access cannot be verified','尚未连接 LINE LIFF，无法验证管理员权限'));
   }else if(result.admin){
    setMsg(T(lang,'ตรวจพบสิทธิ์แอดมิน กำลังเปิดหลังบ้าน...','Admin access verified. Opening admin...','已验证管理员权限，正在打开后台...'));
   }
   await new Promise(r=>setTimeout(r,200));
   await reload();
   if(bindToken){const u=new URL(window.location.href);u.searchParams.delete('bind_admin');window.history.replaceState({},'',u)}
   setAutoLoading(false)
  }
  ensureMember();return()=>{active=false}
 },[session]);
 useEffect(()=>{if(profile)sb.from('point_transactions').select('id,amount,type,description,created_at').order('created_at',{ascending:false}).limit(8).then(({data})=>setPoints(data||[]))},[profile]);
 if(autoLoading||!session)return <Panel title={T(lang,'⭐ สมาชิกบ้านต้นกล้า','⭐ LekHub Member','⭐ LekHub 会员')} sub={T(lang,'กำลังเปิดข้อมูลสมาชิกจาก LINE...','Opening your LINE member card...','正在打开 LINE 会员卡...')}><div className="memberAutoLoading"><div className="memberAutoSpinner">⭐</div><b>{T(lang,'กำลังเปิดบัตรสมาชิก','Opening member card','正在打开会员卡')}</b><small>{T(lang,'ไม่ต้องกรอกชื่อหรือเบอร์โทร','No name or phone form required','无需填写姓名或电话')}</small>{msg&&<p className="msg">{msg}</p>}</div></Panel>;
 return <Panel title={T(lang,'⭐ บัตรสมาชิกบ้านต้นกล้า','⭐ LekHub Member Card','⭐ LekHub 会员卡')} sub={T(lang,'ชื่อสมาชิกมาจาก LINE อัตโนมัติ','Your member name comes from LINE automatically','会员姓名自动来自 LINE')}>
  <section className="memberCard memberIdCard"><img className="memberIdPhoto" src={fallbackAvatar} alt="Member"/><div className="memberIdentity"><small>{T(lang,'สมาชิกบ้านต้นกล้า','LekHub Member','LekHub 会员')}</small><h3>{memberName}</h3><span>{T(lang,'สมาชิกผ่าน LINE OA','LINE OA Member','LINE OA 会员')}</span></div><strong>{profile?.points_balance||0}<small>{T(lang,'แต้ม','points','积分')}</small></strong></section>
  <section className="memberReceipt"><div className="memberSectionHead"><ScanLine/><div><b>{T(lang,'สแกนบิล รับแต้ม','Scan receipt for points','扫描小票赚积分')}</b><small>{T(lang,'ถ่ายรูปใบเสร็จแล้วรับแต้มตามยอดเงิน','Scan a receipt and earn points automatically','扫描小票并按消费金额自动获得积分')}</small></div></div><Receipt session={session} profile={profile} reload={reload} embedded={true} lang={lang}/></section>
  <section className="history"><h3><Star/> {T(lang,'ประวัติแต้มล่าสุด','Recent points','最近积分记录')}</h3>{points.length?points.map(x=><div className="pointItem" key={x.id}><div><b>{x.description||x.type}</b><small>{new Date(x.created_at).toLocaleDateString(lang==='zh'?'zh-CN':lang==='en'?'en-GB':'th-TH')}</small></div><strong className={x.amount>=0?'plus':'minus'}>{x.amount>=0?'+':''}{x.amount}</strong></div>):<p className="empty">{T(lang,'ยังไม่มีรายการแต้ม','No point activity yet','暂无积分记录')}</p>}</section>
  <button type="button" className="adminMemberBtn memberAdminBottom" onClick={()=>setPage('admin')}><ShieldCheck/><span><b>{T(lang,'หลังบ้านร้าน','Admin','后台管理')}</b><small>{T(lang,'ใส่รหัสเพื่อเข้าหลังบ้าน','Enter admin password','输入后台密码')}</small></span></button>
 </Panel>
}
function Event({profile,lang}){const[f,setF]=useState({name:profile?.display_name||'',phone:profile?.phone||'',date:'',time:'',size:10,type:'birthday',note:''});const[msg,setMsg]=useState('');async function go(e){e.preventDefault();setMsg(T(lang,'กำลังส่ง...','Sending...','正在提交...'));const{data,error}=await sb.rpc('create_event_booking',{p_restaurant_slug:'lekhub',p_customer_name:f.name,p_phone:f.phone,p_event_date:f.date,p_start_time:f.time||null,p_guest_count:+f.size,p_event_type:f.type,p_note:f.note||null});setMsg(error?T(lang,'ส่งไม่สำเร็จ: ','Could not submit: ','提交失败：')+friendly(error.message,lang):T(lang,`รับคำขอแล้ว ${data.booking_code} • ร้านจะติดต่อกลับ`,`Request received ${data.booking_code} • We will contact you`,`已收到申请 ${data.booking_code} • 店家将联系您`))}return <Panel title={T(lang,'🎉 จองห้องไพรเวท','🎉 Private room','🎉 预订私人包间')} sub={T(lang,'สำหรับวันเกิด ครอบครัว กลุ่มเด็ก และกิจกรรม','For birthdays, families, kids groups and activities','适合生日、家庭、儿童团体及活动')}><form onSubmit={go}><Field label={T(lang,'ชื่อผู้ติดต่อ','Contact name','联系人姓名')} required value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><Field label={T(lang,'เบอร์ติดต่อ','Phone','联系电话')} required value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/><div className="row"><Field label={T(lang,'วันที่','Date','日期')} required type="date" min={new Date().toISOString().slice(0,10)} value={f.date} onChange={e=>setF({...f,date:e.target.value})}/><Field label={T(lang,'เวลาเริ่ม','Start time','开始时间')} type="time" value={f.time} onChange={e=>setF({...f,time:e.target.value})}/></div><Field label={T(lang,'จำนวนแขก','Guests','人数')} type="number" min="1" value={f.size} onChange={e=>setF({...f,size:e.target.value})}/><label><span>{T(lang,'ประเภทงาน','Event type','活动类型')}</span><select value={f.type} onChange={e=>setF({...f,type:e.target.value})}><option value="birthday">{T(lang,'วันเกิด','Birthday','生日')}</option><option value="family">{T(lang,'งานครอบครัว','Family','家庭聚会')}</option><option value="kids">{T(lang,'โรงเรียน / กลุ่มเด็ก','School / Kids group','学校 / 儿童团体')}</option><option value="company">{T(lang,'งานบริษัท','Company','公司活动')}</option><option value="other">{T(lang,'อื่น ๆ','Other','其他')}</option></select></label><Field label={T(lang,'รายละเอียดเพิ่มเติม','Additional details','补充说明')} value={f.note} onChange={e=>setF({...f,note:e.target.value})}/><button className="primary">{T(lang,'ส่งคำขอจองห้อง','Request private room','提交包间预订')}</button><p className="msg">{msg}</p></form></Panel>}
function Receipt({session,profile,reload,embedded=false,lang='th'}){
 const[msg,setMsg]=useState(''),[items,setItems]=useState([]),[scanning,setScanning]=useState(false),[progress,setProgress]=useState(0),[preview,setPreview]=useState(''),[rule,setRule]=useState({baht:10,points:1}),[pop,setPop]=useState(null);
 const locale=lang==='zh'?'zh-CN':lang==='en'?'en-US':'th-TH';
 const money=n=>Number(n||0).toLocaleString(locale,{minimumFractionDigits:2,maximumFractionDigits:2});
 async function load(){if(!session)return;const [{data},{data:r}]=await Promise.all([sb.from('receipts').select('id,receipt_no,receipt_date,amount,status,points_awarded,created_at').order('created_at',{ascending:false}).limit(10),sb.from('restaurants').select('points_baht_unit,points_reward_unit').eq('id',RESTAURANT_ID).maybeSingle()]);setItems(data||[]);if(r)setRule({baht:Number(r.points_baht_unit||10),points:Number(r.points_reward_unit||1)})}
 useEffect(()=>{load()},[session]);
 function parseAmount(text){
  const t=(text||'').replace(/฿/g,' ').replace(/\s+/g,' ');
  const keys=[/ยอดสุทธิ[^\d]{0,25}([\d,]+(?:\.\d{2})?)/i,/ยอดรวม[^\d]{0,25}([\d,]+(?:\.\d{2})?)/i,/รวมทั้งสิ้น[^\d]{0,25}([\d,]+(?:\.\d{2})?)/i,/grand\s*total[^\d]{0,25}([\d,]+(?:\.\d{2})?)/i,/\btotal\b[^\d]{0,25}([\d,]+(?:\.\d{2})?)/i,/\bnet\b[^\d]{0,25}([\d,]+(?:\.\d{2})?)/i];
  for(const r of keys){const m=t.match(r);if(m){const v=Number(m[1].replace(/,/g,''));if(v>0)return v}}
  const nums=[...t.matchAll(/\b(\d{1,6}(?:,\d{3})*(?:\.\d{2}))\b/g)].map(x=>Number(x[1].replace(/,/g,''))).filter(x=>x>0&&x<1000000);
  return nums.length?Math.max(...nums):null
 }
 function parseNo(text){const t=(text||'').replace(/\s+/g,' ');for(const r of [/(?:เลขที่ใบเสร็จ|เลขที่|receipt\s*(?:no|#)?|invoice\s*(?:no|#)?|bill\s*(?:no|#)?)[^A-Z0-9]{0,15}([A-Z0-9][A-Z0-9\-\/]{3,})/i,/\b([A-Z]{1,4}\-?\d{5,})\b/i]){const m=t.match(r);if(m)return m[1]}return ''}
 function parseDate(text){const m=(text||'').match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/);if(!m)return new Date().toISOString().slice(0,10);let y=Number(m[3]);if(y>2400)y-=543;return `${String(y).padStart(4,'0')}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`}
 async function ensureOCR(){if(window.Tesseract)return window.Tesseract;await new Promise((ok,bad)=>{const x=document.createElement('script');x.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';x.onload=ok;x.onerror=()=>bad(new Error('ocr_load_failed'));document.head.appendChild(x)});return window.Tesseract}
 async function award(file,no,date,amount){
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase(),path=`${session.user.id}/${Date.now()}.${ext}`;
  setMsg(T(lang,'อ่านบิลสำเร็จ กำลังเพิ่มแต้มอัตโนมัติ...','Receipt read. Adding points automatically...','小票识别成功，正在自动添加积分...'));
  const up=await sb.storage.from('receipt-images').upload(path,file,{upsert:false});
  if(up.error){setMsg(T(lang,'อัปโหลดรูปไม่สำเร็จ: ','Upload failed: ','上传失败：')+up.error.message);return}
  const{data,error}=await sb.rpc('submit_receipt_auto_points',{p_receipt_no:no,p_receipt_date:date,p_amount:Number(amount),p_image_url:path});
  if(error){setMsg(T(lang,'เพิ่มแต้มไม่สำเร็จ: ','Could not add points: ','添加积分失败：')+error.message);return}
  if(!data?.success){setMsg(data?.reason==='duplicate_receipt'?T(lang,'ใบเสร็จนี้เคยรับแต้มแล้ว','This receipt has already been used','此小票已领取过积分'):T(lang,'เพิ่มแต้มไม่สำเร็จ','Could not add points','添加积分失败'));return}
  setPop({points:data.points||0,amount:Number(amount)});setMsg(T(lang,`เพิ่ม +${data.points||0} แต้มเข้าบัญชีแล้ว`,`+${data.points||0} points added`,`已添加 +${data.points||0} 积分`));await load();await reload?.();setTimeout(()=>setPop(null),2800)
 }
 async function scanFile(file){
  if(!file||!session)return;setPreview(URL.createObjectURL(file));setScanning(true);setProgress(0);setMsg(T(lang,'กำลังอ่านใบเสร็จ...','Reading receipt...','正在识别小票...'));
  try{
   const OCR=await ensureOCR();const out=await OCR.recognize(file,'tha+eng',{logger:m=>{if(m.status==='recognizing text')setProgress(Math.round((m.progress||0)*100))}});const text=out?.data?.text||'',amount=parseAmount(text),no=parseNo(text),date=parseDate(text);
   if(!amount){setMsg(T(lang,'อ่านยอดเงินไม่ชัด กรุณาถ่ายใบเสร็จใหม่ให้เห็นยอดรวมชัดเจน','Could not read the total. Please retake the receipt clearly','无法识别总金额，请重新拍摄清晰的小票'));return}
   if(!no){setMsg(T(lang,'อ่านเลขใบเสร็จไม่ชัด กรุณาถ่ายใหม่ให้เห็นเลขใบเสร็จ','Could not read the receipt number. Please retake the photo','无法识别小票编号，请重新拍摄'));return}
   await award(file,no,date,amount)
  }catch(e){setMsg(T(lang,'อ่านบิลอัตโนมัติไม่สำเร็จ กรุณาถ่ายใหม่อีกครั้ง','Automatic receipt reading failed. Please try again','自动识别失败，请重新拍摄'))}
  finally{setScanning(false)}
 }
 const body=<>
  {!session?<div className="adminDenied"><ScanLine/><h3>{T(lang,'ต้องเป็นสมาชิกก่อน','Membership required','请先注册会员')}</h3><p>{T(lang,'แต้มจากใบเสร็จจะเข้าบัญชีสมาชิกโดยอัตโนมัติ','Receipt points are added automatically','小票积分会自动加入会员账户')}</p></div>:<>
   <label className="receiptCamera"><span>{preview?<img src={preview} alt={T(lang,'ใบเสร็จ','Receipt','小票')}/>:<ScanLine/>}<b>{scanning?T(lang,'กำลังอ่านใบเสร็จ...','Reading receipt...','正在识别小票...'):T(lang,'ถ่ายรูป / เลือกใบเสร็จ','Take / choose receipt photo','拍摄 / 选择小票照片')}</b><small>{T(lang,'สแกนสำเร็จแล้วแต้มจะเข้าทันที ไม่ต้องกดรับ','Points are added automatically after scanning','扫描成功后积分会自动到账，无需点击领取')}</small></span><input disabled={scanning} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>scanFile(e.target.files?.[0]||null)}/></label>
   {scanning&&<div className="ocrProgress"><div style={{width:`${progress}%`}}/><span>{T(lang,`กำลังอ่านบิล ${progress}%`,`Reading ${progress}%`,`正在识别 ${progress}%`)}</span></div>}
   <div className="pointEstimate"><Star/><div><small>{T(lang,'สูตรแต้มที่ร้านกำหนด','Store point rate','店铺积分规则')}</small><b>{rule.baht.toLocaleString(locale)} {T(lang,'บาท','THB','泰铢')} = {rule.points.toLocaleString(locale)} {T(lang,'แต้ม','points','积分')}</b></div></div>
   <p className="scanHint">{T(lang,'เมื่อระบบอ่านยอดและเลขใบเสร็จได้ จะเพิ่มแต้มเข้าบัญชีอัตโนมัติ และใบเสร็จเดิมใช้ซ้ำไม่ได้','When the total and receipt number are recognized, points are added automatically. A receipt cannot be reused.','识别到金额和小票编号后会自动添加积分，同一张小票不能重复使用。')}</p><p className="msg">{msg}</p>
   {pop&&<div className="pointsPop"><Star/><strong>+{pop.points}</strong><b>{T(lang,'แต้มเข้าแล้ว!','Points added!','积分已到账！')}</b><small>{T(lang,'ยอดบิล','Receipt total','小票金额')} {money(pop.amount)} {T(lang,'บาท','THB','泰铢')}</small></div>}
  </>}
  {session&&<section className="history"><h3><History/> {T(lang,'บิลที่รับแต้มล่าสุด','Recent receipts','最近积分小票')}</h3>{items.length?items.map(x=><div className="historyItem" key={x.id}><div><b>{x.receipt_no}</b><small>{dateL(x.receipt_date,lang)} • {money(x.amount)} {T(lang,'บาท','THB','泰铢')}</small></div><div><Status status={x.status} lang={lang}/><small className="pointBadge">+{x.points_awarded} {T(lang,'แต้ม','points','积分')}</small></div></div>):<p className="empty">{T(lang,'ยังไม่มีบิลที่รับแต้ม','No receipt history yet','暂无积分小票记录')}</p>}</section>}
 </>;
 return embedded?body:<Panel title={T(lang,'🧾 สแกนบิล รับแต้มอัตโนมัติ','🧾 Scan receipt for points','🧾 扫描小票赚积分')} sub={profile?`${profile.display_name||''} • ${profile.points_balance||0} ${T(lang,'แต้ม','points','积分')}`:T(lang,'สมัครสมาชิกก่อนเพื่อรับแต้ม','Join as a member to earn points','注册会员后即可获得积分')}>{body}</Panel>
}
function Game({session,lang='th'}){
 const[campaign,setCampaign]=useState(null),[spots,setSpots]=useState([]),[collects,setCollects]=useState([]),[submissions,setSubmissions]=useState([]),[token,setToken]=useState(''),[word,setWord]=useState(''),[msg,setMsg]=useState(''),[level,setLevel]=useState(1),[lastCatch,setLastCatch]=useState(null),[scorePop,setScorePop]=useState(null),[scannerOpen,setScannerOpen]=useState(false),[scannerMsg,setScannerMsg]=useState('');
 const videoRef=useRef(null),streamRef=useRef(null),rafRef=useRef(null);
 const [showDino,setShowDino]=useState(false);
 const clueOf=x=>{if(lang==='en')return x.clue_en||'';if(lang==='zh')return x.clue_zh||'';return x.clue_th||x.clue||''};
 const revealCfg=raw=>{try{const o=JSON.parse(raw||'{}');return {char:o.char||'✨',style:o.style||'cute',size:o.size||'large',motion:o.motion||'pop',sound:o.sound||'pop',volume:o.volume||'medium',screen_fx:o.screen_fx||'none'}}catch(e){return {char:'✨',style:'cute',size:'large',motion:'pop',sound:'pop',volume:'medium',screen_fx:'none'}}};
 function playRevealSound(cfg){if(cfg.sound==='none')return;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const ctx=new C(),gain=ctx.createGain(),osc=ctx.createOscillator();const vols={low:.025,medium:.06,loud:.12};gain.gain.value=vols[cfg.volume]||.05;osc.connect(gain);gain.connect(ctx.destination);const tones={pop:[520,.12],coin:[880,.22],laugh:[330,.32],roar:[120,.4]};const[t,d]=tones[cfg.sound]||tones.pop;osc.frequency.setValueAtTime(t,ctx.currentTime);if(cfg.sound==='coin')osc.frequency.exponentialRampToValueAtTime(1320,ctx.currentTime+d);if(cfg.sound==='laugh')osc.frequency.setValueAtTime(420,ctx.currentTime+.12);if(cfg.sound==='roar')osc.frequency.exponentialRampToValueAtTime(70,ctx.currentTime+d);osc.start();osc.stop(ctx.currentTime+d);setTimeout(()=>ctx.close(),600)}catch(e){}}

 async function load(){const{data:c}=await sb.from('game_campaigns').select('*').eq('active',true).eq('restaurant_id',RESTAURANT_ID).order('created_at',{ascending:false}).limit(1).maybeSingle();setCampaign(c||null);if(c){const{data:ss}=await sb.from('game_spots').select('id,spot_code,clue,clue_th,clue_en,clue_zh,level_no,point_no,letter,points,reveal_message,character_image_url,active').eq('campaign_id',c.id).eq('active',true).order('level_no').order('point_no');setSpots(ss||[])}if(session){const[{data:g},{data:w}]=await Promise.all([sb.from('game_collects').select('id,spot_id,collected_at,game_spots(letter,clue,clue_th,clue_en,clue_zh,level_no,point_no,points)').order('collected_at',{ascending:false}),sb.from('word_submissions').select('id,campaign_id,status,created_at').eq('status','accepted').order('created_at',{ascending:true})]);setCollects(g||[]);setSubmissions(w||[])}}
 useEffect(()=>{load()},[session]);
 const lvSpots=spots.filter(x=>Number(x.level_no||1)===level),lvCollects=collects.filter(x=>Number(x.game_spots?.level_no||1)===level);
 const foundCount=lvSpots.filter(x=>lvCollects.some(c=>c.spot_id===x.id)).length;
 const totalPoints=lvSpots.length||level+3;
 const answerLength=level+2;
 const progress=Math.min(100,Math.round((foundCount/Math.max(totalPoints,1))*100));
 const collectedLetters=lvCollects.map(x=>(x.game_spots?.letter||'').toUpperCase()).filter(Boolean);
 const readyToSolve=lvSpots.length>0&&foundCount>=lvSpots.length;
 const completedCount=campaign?submissions.filter(x=>x.campaign_id===campaign.id&&x.status==='accepted').length:0;
 const unlockedLevel=Math.min(10,Math.max(1,completedCount+1));
 useEffect(()=>{if(level>unlockedLevel)setLevel(unlockedLevel)},[unlockedLevel]);

 async function processGameToken(raw){
  const value=String(raw||'').trim();if(!value)return;
  setLastCatch(null);setMsg(T(lang,'กำลังตรวจลายแทง...','Checking the clue...','正在检查线索...'));
  const{data,error}=await sb.rpc('scan_game_qr',{p_token:value});
  if(error){setMsg(friendly(error.message,lang));return}
  if(!data?.success){
   if(data?.reason==='already_collected')setMsg(T(lang,'จุดนี้เก็บแล้ว','Already collected','此点已收集'));
   else if(data?.reason==='invalid_qr')setMsg(T(lang,'QR นี้ไม่ถูกต้อง','Invalid QR','QR 无效'));
   else{setLastCatch({clown:true});setMsg(T(lang,'ฮ่า ๆ ยังไม่ถึงลายแทงจุดนี้!','Ha ha! You have not reached this clue yet!','哈哈！你还没到这个线索！'))}
   return
  }
  const cfg=revealCfg(data.message);setLastCatch({...data,reveal:cfg});if(String(data.letter||'').toUpperCase()==='A')setShowDino(true);playRevealSound(cfg);setScorePop(data.points||0);
  setMsg(T(lang,`เจอ “${data.letter}” แล้ว!`,`You found “${data.letter}”!`,`找到“${data.letter}”了！`));
  setToken('');await load();setTimeout(()=>setScorePop(null),2200)
 }
 function closeCameraScanner(){
  if(rafRef.current)cancelAnimationFrame(rafRef.current);rafRef.current=null;
  if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null}
  if(videoRef.current)videoRef.current.srcObject=null;
  setScannerOpen(false)
 }
 async function openCameraScanner(){
  if(!session){setMsg(T(lang,'กรุณาสมัครสมาชิกก่อนเล่นเกม','Please join as a member first','请先注册会员'));return}
  window.location.href='https://liff.line.me/2011209232-K5q7J6i1';
}
 useEffect(()=>{
  if(!scannerOpen)return;
  let dead=false;
  const start=async()=>{
   try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('camera_not_supported');
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    if(dead){stream.getTracks().forEach(t=>t.stop());return}
    streamRef.current=stream;
    const v=videoRef.current;if(!v)return;
    v.srcObject=stream;v.setAttribute('playsinline','true');await v.play();
    if(!('BarcodeDetector'in window)){setScannerMsg(T(lang,'กล้องเปิดแล้ว แต่เครื่องนี้ไม่รองรับการอ่าน QR อัตโนมัติ กรุณากรอกรหัสใต้ QR','Camera opened, but automatic QR reading is not supported. Enter the code below the QR.','相机已打开，但此设备不支持自动读取 QR，请输入 QR 下方代码'));return}
    const detector=new window.BarcodeDetector({formats:['qr_code']});
    let busy=false;
    const tick=async()=>{
      if(dead||!streamRef.current)return;
      if(!busy&&v.readyState>=2){busy=true;try{const codes=await detector.detect(v);if(codes?.[0]?.rawValue){const raw=codes[0].rawValue;setToken(raw);closeCameraScanner();await processGameToken(raw);return}}catch(e){}finally{busy=false}}
      rafRef.current=requestAnimationFrame(tick)
    };
    tick()
   }catch(e){if(dead)return;setScannerMsg(T(lang,'เปิดกล้องไม่ได้ กรุณากดอนุญาตใช้กล้องใน LINE/เบราว์เซอร์ แล้วลองใหม่','Could not open camera. Allow camera access in LINE/browser and try again.','无法打开相机，请在 LINE/浏览器中允许相机权限后重试'))}
  };
  const t=setTimeout(start,80);
  return()=>{dead=true;clearTimeout(t);if(rafRef.current)cancelAnimationFrame(rafRef.current);rafRef.current=null;if(streamRef.current){streamRef.current.getTracks().forEach(x=>x.stop());streamRef.current=null}}
 },[scannerOpen]);
 async function scan(){
  if(!session){setMsg(T(lang,'กรุณาสมัครสมาชิกก่อนเล่นเกม','Please join as a member first','请先注册会员'));return}
  if(!token.trim()){setMsg(T(lang,'กรุณากรอกรหัสจาก QR','Enter the QR code','请输入 QR 码'));return}
  await processGameToken(token)
 }
 async function submitWord(){
  if(!campaign||!word.trim())return;
  const{data,error}=await sb.rpc('submit_word',{p_campaign_id:campaign.id,p_word:word.trim()});
  if(error){setMsg(friendly(error.message,lang));return}
  if(!data?.accepted){
   setMsg(data?.reason==='missing_letters'?T(lang,'ตัวอักษรในกระเป๋ายังไม่ครบ','You do not have all required letters','字母还不够'):data?.reason==='word_not_found'?T(lang,'คำตอบยังไม่ถูก ลายแทงปิดแล้วสำหรับวันนี้','Not quite. The treasure trail is closed for today','答案不对，今天的寻宝已结束'):T(lang,'ส่งคำไม่สำเร็จ','Could not submit','提交失败'));
   return
  }
  setScorePop(data.points||0);setMsg(T(lang,`ผ่าน LV.${level}! +${data.points} แต้ม`,`LV.${level} cleared! +${data.points} points`,`通过 LV.${level}！+${data.points} 积分`));setWord('');await load();setTimeout(()=>setScorePop(null),2200)
 }
 if(!session)return <Panel title={T(lang,'🎮 ล่าคำตามลายแทงสมบัติ','🎮 Treasure Word Hunt','🎮 寻宝拼字游戏')} sub={T(lang,'สมัครสมาชิกก่อนเพื่อเก็บตัวอักษรและแต้ม','Join as a member to save letters and points','注册会员后可保存字母和积分')}><div className="adminDenied"><Gamepad2/><h3>{T(lang,'สมัครสมาชิกก่อนเล่น','Join before playing','请先注册会员')}</h3></div></Panel>;

 return <Panel title="" sub="">
  <section className="treasureHero">
   <div className="treasureHeroArt" aria-hidden="true"><span>🧭</span><span>🗺️</span><span>🏴‍☠️</span></div>
   <div className="treasureHeroCopy">
    <small>{T(lang,'การผจญภัยวันนี้','TODAY’S ADVENTURE','今日冒险')}</small>
    <h1>{T(lang,'ล่าคำตามลายแทงสมบัติ','Treasure Word Hunt','寻宝拼字游戏')}</h1>
    <div className="levelBadgeRow"><b>LV.{level}</b><span>{T(lang,`พบแล้ว ${foundCount} / ${totalPoints} จุด`,`Found ${foundCount} / ${totalPoints}`,`已找到 ${foundCount} / ${totalPoints}`)}</span></div>
    <div className="treasureProgress"><i style={{width:`${progress}%`}}/></div>
   </div>
   <div className="treasureChestArt" aria-hidden="true">🧰</div>
  </section>

  <div className="levelStrip gameLevelPicker">{[1,2,3,4,5,6,7,8,9,10].map(l=>{const locked=l>unlockedLevel;const passed=l<unlockedLevel;return <button key={l} disabled={locked} aria-disabled={locked} className={(level===l?'active ':'')+(locked?'locked ':passed?'passed ':'')} onClick={()=>{if(locked)return;setLevel(l);setLastCatch(null);setMsg('')}}>{passed?'✓ ':locked?'🔒 ':''}LV.{l}</button>})}</div>

  <section className="treasureClueBoard">
   <div className="sectionTitle">
    <div><span className="sectionKicker">🗝️ {T(lang,'ลายแทง','TREASURE TRAIL','寻宝路线')}</span><h2>{T(lang,'คำใบ้ของเลเวลนี้','Clues for this level','本关线索')}</h2></div>
    <b className="progressPill">{progress}%</b>
   </div>
   <div className="treasureClueList">
    {lvSpots.length?lvSpots.map((x,i)=>{
      const got=lvCollects.some(c=>c.spot_id===x.id);
      const collect=lvCollects.find(c=>c.spot_id===x.id);
      const letter=(collect?.game_spots?.letter||x.letter||'').toUpperCase();
      return <article className={'treasureClueCard '+(got?'found':'locked')} key={x.id}>
       <div className="clueIllustration" aria-hidden="true">{got?'🏆':i%3===0?'🔎':i%3===1?'👣':'🧭'}</div>
       <div className="clueNumber">{got?'✓':x.point_no||i+1}</div>
       <div className="clueCopy"><small>{T(lang,`จุดที่ ${x.point_no||i+1}`,`POINT ${x.point_no||i+1}`,`第 ${x.point_no||i+1} 点`)}</small><b>{clueOf(x)||T(lang,'คำใบ้ลึกลับกำลังรอคุณอยู่','Clue translation unavailable','暂无此提示的英文翻译')}</b><span>{got?T(lang,'พบแล้ว','FOUND','已找到'):T(lang,'ยังไม่พบ','NOT FOUND','未找到')}</span></div>
       <div className={'foundLetter '+(got?'show':'')}>{got?letter:'?'}</div>
      </article>
    }):<div className="emptyTreasure"><span>📜</span><b>{T(lang,'ยังไม่มีคำใบ้สำหรับเลเวลนี้','No clues for this level yet','此关暂无提示')}</b></div>}
   </div>
  </section>

  <section className="treasureScanner">
   <div className="scannerArt" aria-hidden="true">📷</div>
   <div><small>{T(lang,'เจอ QR แล้วหรือยัง?','FOUND A QR?','找到 QR 了吗？')}</small><h3>{T(lang,'สแกนเพื่อค้นหาตัวอักษร','Scan to reveal a letter','扫描并发现字母')}</h3></div>
   <div className="scanInput treasureScanInput"><input placeholder={T(lang,'กรอกรหัส QR เอง','Enter QR code manually','手动输入 QR 码')} value={token} onChange={e=>setToken(e.target.value)}/><button type="button" onClick={openCameraScanner}><ScanLine/>{T(lang,'เปิดกล้องสแกน','Open camera','打开相机')}</button>{token.trim()&&<button type="button" className="manualQrSubmit" onClick={scan}>{T(lang,'ตรวจรหัส','Check code','检查代码')}</button>}</div>
  </section>
  {scannerOpen&&<div className="gameScannerModal" role="dialog" aria-modal="true"><div className="gameScannerSheet"><div className="gameScannerHead"><div><b>{T(lang,'สแกน QR ลายแทง','Scan treasure QR','扫描寻宝 QR')}</b><small>{T(lang,'หันกล้องไปที่ QR ให้เต็มกรอบ','Point the camera at the QR code','将相机对准 QR 码')}</small></div><button type="button" onClick={closeCameraScanner}>×</button></div><div className="gameVideoWrap"><video ref={videoRef} autoPlay muted playsInline/></div>{scannerMsg&&<p className="gameScannerError">{scannerMsg}</p>}<button type="button" className="gameScannerClose" onClick={closeCameraScanner}>{T(lang,'ปิดกล้อง','Close camera','关闭相机')}</button></div></div>}

  <section className="letterBackpack">
   <div className="sectionTitle"><div><span className="sectionKicker">🎒 {T(lang,'กระเป๋านักล่า','LETTER BAG','字母袋')}</span><h2>{T(lang,'ตัวอักษรที่เก็บได้','Collected letters','已收集字母')}</h2></div><small>{T(lang,`คำตอบ ${answerLength} ตัวอักษร`,`Answer: ${answerLength} letters`,`答案：${answerLength} 个字母`)}</small></div>
   <div className="letterSlots">{Array.from({length:totalPoints}).map((_,i)=><div className={'letterSlot '+(collectedLetters[i]?'filled':'')} key={i}>{collectedLetters[i]||'?'}</div>)}</div>
  </section>

  <section className={'treasureSolve '+(readyToSolve?'unlocked':'locked')}>
   <div className="solveChest" aria-hidden="true">{readyToSolve?'✨🧰✨':'🔒🧰'}</div>
   <small>{readyToSolve?T(lang,'ตัวอักษรครบแล้ว!','ALL LETTERS FOUND!','字母已集齐！'):T(lang,'ตามหาตัวอักษรให้ครบก่อน','FIND ALL LETTERS FIRST','先找齐所有字母')}</small>
   <h2>{T(lang,'เรียงคำเพื่อเปิดหีบสมบัติ','Solve the word to open the treasure','拼出单词，开启宝箱')}</h2>
   <div className="answerSlots" aria-hidden="true">{Array.from({length:answerLength}).map((_,i)=><span key={i}>{word[i]||'_'}</span>)}</div>
   <div className="availableTreasureLetters">{collectedLetters.map((l,i)=><button type="button" key={i} onClick={()=>readyToSolve&&word.length<answerLength&&setWord((word+l).slice(0,answerLength))}>{l}</button>)}</div>
   <div className="solveActions"><input disabled={!readyToSolve} maxLength={answerLength} placeholder={T(lang,'คำตอบภาษาอังกฤษ','ENGLISH ANSWER','英文答案')} value={word} onChange={e=>setWord(e.target.value.toUpperCase().replace(/[^A-Z]/g,'').slice(0,answerLength))}/><button disabled={!readyToSolve||word.length!==answerLength} onClick={submitWord}>{T(lang,'🔓 เปิดหีบสมบัติ','🔓 Open Treasure','🔓 开启宝箱')}</button></div>
  </section>

  {lastCatch?.clown&&<div className="clownPopup"><button onClick={()=>setLastCatch(null)}>×</button><div className="clownFace" aria-hidden="true">🤡</div><h2>{T(lang,'ฮ่า ๆๆ ยังไม่ถึงด่านนี้!','Ha ha! Not this level yet!','哈哈！还没到这一关！')}</h2><p>{T(lang,'กลับไปตามลายแทงของเลเวลปัจจุบันก่อนนะ','Follow your current clues first','先按照当前关卡的线索继续吧')}</p></div>}
  {showDino&&<div className="qrRevealOverlay" onClick={()=>setShowDino(false)}><video width="320" autoPlay playsInline controls><source src="/Dinosaur_roaring_with_letter_A_202608230909(2).mp4" type="video/mp4"/></video></div>}
{lastCatch&&!lastCatch.clown&&<div className={'qrRevealOverlay fx-'+(lastCatch.reveal?.screen_fx||'none')} onClick={()=>setLastCatch(null)}><div className={'qrRevealCharacter '+(lastCatch.reveal?.style||'cute')+' '+(lastCatch.reveal?.size||'large')+' motion-'+(lastCatch.reveal?.motion||'pop')}><span>{lastCatch.reveal?.char||'✨'}</span><small>{T(lang,'เจอตัวอักษร','LETTER FOUND','发现字母')}</small><b>{lastCatch.letter||'★'}</b><em>{T(lang,'แตะเพื่อปิด','Tap to close','点击关闭')}</em></div></div>}
  <p className="msg gameMsg">{msg}</p>
  {scorePop!=null&&<div className="gameScorePop"><Star/><strong>+{scorePop}</strong><b>{T(lang,'แต้ม!','points!','积分！')}</b></div>}
 </Panel>
}
function Rewards({session,profile,reload,lang='th'}){const[items,setItems]=useState([]),[mine,setMine]=useState([]),[msg,setMsg]=useState('');async function load(){const{data}=await sb.from('rewards').select('*').eq('active',true).eq('restaurant_id',RESTAURANT_ID);setItems(data||[]);if(session){const{data:r}=await sb.from('reward_redemptions').select('id,code,status,points_spent,redeemed_at,rewards(name)').order('redeemed_at',{ascending:false}).limit(8);setMine(r||[])}}useEffect(()=>{load()},[session]);async function redeem(id){if(!session){setMsg(T(lang,'กรุณาสมัครสมาชิกก่อนแลกรางวัล','Please join before redeeming','请先注册会员'));return}const rw=items.find(x=>x.id===id);if(!window.confirm(T(lang,`ยืนยันใช้ ${rw?.points_cost||0} แต้ม?`,`Use ${rw?.points_cost||0} points?`,`确认使用 ${rw?.points_cost||0} 积分？`)))return;const{data,error}=await sb.rpc('redeem_reward',{p_reward_id:id});if(error){setMsg(friendly(error.message,lang));return}if(!data?.success){setMsg(data?.reason==='insufficient_points'?T(lang,'แต้มไม่พอ','Not enough points','积分不足'):T(lang,'แลกไม่ได้','Cannot redeem','无法兑换'));return}setMsg(T(lang,`ใช้แต้มสำเร็จ • โค้ด ${data.code}`,`Redeemed • Code ${data.code}`,`兑换成功 • 代码 ${data.code}`));await reload?.();await load()}return <Panel title={T(lang,'🎁 แต้ม & รางวัล','🎁 Points & Rewards','🎁 积分与奖励')} sub={profile?`${profile.points_balance||0} ${T(lang,'แต้ม','points','积分')}`:T(lang,'สมัครสมาชิกเพื่อสะสมและแลกแต้ม','Join to earn and redeem points','注册会员以赚取和兑换积分')}><p className="msg">{msg}</p><div className="rewardlist">{items.length?items.map(x=><div className="reward" key={x.id}><span>🎁</span><div><b>{translatedValue(localText(x,'name',lang),lang)}</b><p>{translatedValue(localText(x,'description',lang),lang)}</p></div><div><strong>{x.points_cost} {T(lang,'แต้ม','pts','积分')}</strong><button disabled={!session||Number(profile?.points_balance||0)<x.points_cost} onClick={()=>redeem(x.id)}>{T(lang,'ใช้แต้ม','Redeem','兑换')}</button></div></div>):<p className="empty">{T(lang,'ยังไม่มีรางวัล','No rewards yet','暂无奖励')}</p>}</div>{session&&<section className="history"><h3><Gift/> {T(lang,'รางวัลของฉัน','My rewards','我的奖励')}</h3>{mine.length?mine.map(x=><div className="historyItem" key={x.id}><div><b>{translatedValue(localText(x.rewards,'name',lang),lang)||T(lang,'รางวัล','Reward','奖励')}</b><small>{T(lang,'โค้ด','Code','代码')} {x.code} • {x.points_spent} {T(lang,'แต้ม','points','积分')}</small></div><Status status={x.status} lang={lang}/></div>):<p className="empty">{T(lang,'ยังไม่เคยแลกรางวัล','No redemptions yet','暂无兑换记录')}</p>}</section>}</Panel>}
function Admin({session,profile,forceAdmin=false,onExitAdmin}){
 const allowed=forceAdmin||['staff','admin','owner','super_admin'].includes(profile?.role);
 const[stats,setStats]=useState(null),[reservations,setReservations]=useState([]),[events,setEvents]=useState([]),[receipts,setReceipts]=useState([]),[members,setMembers]=useState([]),[rewards,setRewards]=useState([]),[news,setNews]=useState([]),[tab,setTab]=useState('dashboard'),[msg,setMsg]=useState(''),[loading,setLoading]=useState(false),[rewardForm,setRewardForm]=useState({name:'',description:'',points_cost:100,stock:''}),[newsForm,setNewsForm]=useState({title:'',body:''}),[pointRule,setPointRule]=useState({baht:10,points:1}),[reminderJobs,setReminderJobs]=useState([]),[scanText,setScanText]=useState(''),[scanPreview,setScanPreview]=useState(''),[scanProgress,setScanProgress]=useState(0),[scanBusy,setScanBusy]=useState(false),[gameCampaign,setGameCampaign]=useState(null),[gameSpots,setGameSpots]=useState([]),[gameLevel,setGameLevel]=useState(1),[spotForm,setSpotForm]=useState({point_no:1,clue_th:'',clue_en:'',clue_zh:'',letter:'',points:5,reveal_char:'🐜',reveal_style:'cute',reveal_size:'large',reveal_motion:'pop',reveal_sound:'pop',reveal_volume:'medium',screen_fx:'none'}),[editingSpotId,setEditingSpotId]=useState(null),[adminPeople,setAdminPeople]=useState([]),[adminTasks,setAdminTasks]=useState([]),[showTaskForm,setShowTaskForm]=useState(false),[taskForm,setTaskForm]=useState({title:'',details:'',due_date:new Date().toISOString().slice(0,10),assignee:'all'});
 async function load(){if(!allowed)return;setLoading(true);setMsg('');const [a,b,c,d,e,f,g,h,i,j,k]=await Promise.all([
  sb.rpc('admin_dashboard',{p_restaurant_id:RESTAURANT_ID}),
  sb.from('table_reservations').select('*').eq('restaurant_id',RESTAURANT_ID).order('booking_date',{ascending:true}).limit(100),
  sb.from('event_bookings').select('*').eq('restaurant_id',RESTAURANT_ID).order('event_date',{ascending:true}).limit(100),
  sb.from('receipts').select('id,receipt_no,receipt_date,amount,image_url,status,points_awarded,created_at').eq('restaurant_id',RESTAURANT_ID).order('created_at',{ascending:false}).limit(100),
  sb.rpc('member_summary',{p_restaurant_id:RESTAURANT_ID,p_limit:100}),
  sb.from('rewards').select('*').eq('restaurant_id',RESTAURANT_ID).order('created_at',{ascending:false}),
  sb.from('news_posts').select('*').eq('restaurant_id',RESTAURANT_ID).order('created_at',{ascending:false}),
  sb.from('restaurants').select('points_baht_unit,points_reward_unit').eq('id',RESTAURANT_ID).maybeSingle(),
  sb.from('line_notification_jobs').select('id,kind,message,send_at,status,booking_id').eq('restaurant_id',RESTAURANT_ID).gte('send_at',new Date(Date.now()-86400000).toISOString()).order('send_at',{ascending:true}).limit(50),
  sb.from('game_campaigns').select('*').eq('restaurant_id',RESTAURANT_ID).order('created_at',{ascending:false}).limit(1).maybeSingle(),
  sb.from('game_spots').select('id,campaign_id,spot_code,qr_token,clue,clue_th,clue_en,clue_zh,level_no,point_no,letter,points,reveal_message,character_image_url,active').order('level_no',{ascending:true}).order('point_no',{ascending:true}).limit(200)
 ]);const er=a.error||b.error||c.error||d.error||e.error||f.error||g.error||h.error||i.error||j.error||k.error;if(er)setMsg(friendly(er.message));setStats(a.data||null);setReservations(b.data||[]);setEvents(c.data||[]);setReceipts(d.data||[]);setMembers(e.data||[]);setRewards(f.data||[]);setNews(g.data||[]);if(h.data)setPointRule({baht:Number(h.data.points_baht_unit||10),points:Number(h.data.points_reward_unit||1)});setReminderJobs(i.data||[]);setGameCampaign(j.data||null);setGameSpots((k.data||[]).filter(x=>!j.data||x.campaign_id===j.data.id));
 const [{data:adminsData,error:adminsErr},{data:tasksData,error:tasksErr}]=await Promise.all([
  sb.from('profiles').select('id,display_name,avatar_url,role,line_user_id').eq('restaurant_id',RESTAURANT_ID).in('role',['staff','admin','owner','super_admin']).order('display_name',{ascending:true}),
  sb.from('admin_tasks').select('*').eq('restaurant_id',RESTAURANT_ID).neq('status','cancelled').order('status',{ascending:true}).order('due_date',{ascending:true}).order('created_at',{ascending:false}).limit(100)
 ]);
 if(adminsErr||tasksErr)setMsg(friendly((adminsErr||tasksErr).message));
 setAdminPeople(adminsData||[]);
 setAdminTasks(tasksData||[]);
 setLoading(false)}
 useEffect(()=>{if(allowed)load()},[allowed]);
 async function addAdminTask(e){
  e.preventDefault();
  const title=taskForm.title.trim();
  if(!title){setMsg('ใส่ชื่องานก่อน');return}
  const all=taskForm.assignee==='all';
  const payload={restaurant_id:RESTAURANT_ID,title,details:taskForm.details.trim()||null,due_date:taskForm.due_date||null,assignee_id:all?null:taskForm.assignee,assigned_to_all:all,status:'pending',created_by:profile?.id||null};
  const{error}=await sb.from('admin_tasks').insert(payload);
  if(error){setMsg('เพิ่มงานไม่ได้: '+friendly(error.message));return}
  setTaskForm({title:'',details:'',due_date:new Date().toISOString().slice(0,10),assignee:'all'});
  setShowTaskForm(false);setMsg('มอบหมายงานแล้ว');load()
 }
 async function setAdminTaskStatus(id,status){
  const patch={status,completed_at:status==='done'?new Date().toISOString():null};
  const{error}=await sb.from('admin_tasks').update(patch).eq('id',id);
  if(error){setMsg('อัปเดตงานไม่ได้: '+friendly(error.message));return}
  setAdminTasks(x=>x.map(t=>t.id===id?{...t,...patch}:t));setMsg(status==='done'?'ทำงานเสร็จแล้ว':'เปิดงานอีกครั้ง')
 }
 async function removeAdminTask(id){
  const{error}=await sb.from('admin_tasks').update({status:'cancelled'}).eq('id',id);
  if(error){setMsg('ลบงานไม่ได้: '+friendly(error.message));return}
  setAdminTasks(x=>x.filter(t=>t.id!==id));setMsg('ลบงานแล้ว')
 }
 function adminName(id){return adminPeople.find(a=>a.id===id)?.display_name||'แอดมิน'}
 async function tableStatus(id,status){const{error}=await sb.rpc('set_table_booking_status',{p_id:id,p_status:status});if(error){setMsg(friendly(error.message));return}setReservations(x=>x.map(r=>r.id===id?{...r,status}:r));setMsg('บันทึกแล้ว')}
 async function eventStatus(id,status){const{error}=await sb.rpc('set_event_booking_status',{p_id:id,p_status:status});if(error){setMsg(friendly(error.message));return}setEvents(x=>x.map(r=>r.id===id?{...r,status}:r));setMsg('บันทึกแล้ว')}
 async function receiptStatus(id,approve){const{error}=await sb.rpc(approve?'approve_receipt':'reject_receipt',{p_receipt_id:id});if(error){setMsg(friendly(error.message));return}setMsg(approve?'อนุมัติบิลและเพิ่มแต้มแล้ว':'ไม่อนุมัติบิลแล้ว');load()}
 async function openReceipt(path){if(!path)return;const{data,error}=await sb.storage.from('receipt-images').createSignedUrl(path,60);if(error){setMsg(friendly(error.message));return}window.open(data.signedUrl,'_blank','noopener')}
 
 async function addReward(e){e.preventDefault();const payload={restaurant_id:RESTAURANT_ID,name:rewardForm.name.trim(),description:rewardForm.description.trim()||null,points_cost:Number(rewardForm.points_cost),stock:rewardForm.stock===''?null:Number(rewardForm.stock),active:true};const{error}=await sb.from('rewards').insert(payload);if(error){setMsg('เพิ่มรางวัลไม่ได้: '+friendly(error.message));return}setRewardForm({name:'',description:'',points_cost:100,stock:''});setMsg('เพิ่มรางวัลแล้ว');load()}
 async function toggleReward(id,active){const{error}=await sb.from('rewards').update({active:!active}).eq('id',id);if(error){setMsg(friendly(error.message));return}setRewards(x=>x.map(r=>r.id===id?{...r,active:!active}:r))}
 async function addNews(e){e.preventDefault();const{error}=await sb.from('news_posts').insert({restaurant_id:RESTAURANT_ID,title:newsForm.title.trim(),body:newsForm.body.trim(),active:true});if(error){setMsg('เพิ่มข่าวไม่ได้: '+friendly(error.message));return}setNewsForm({title:'',body:''});setMsg('ประกาศข่าวแล้ว');load()}
 async function toggleNews(id,active){const{error}=await sb.from('news_posts').update({active:!active}).eq('id',id);if(error){setMsg(friendly(error.message));return}setNews(x=>x.map(n=>n.id===id?{...n,active:!active}:n))}
 
  async function savePointRule(e){e.preventDefault();setMsg('กำลังบันทึกสูตรแต้ม...');const{data,error}=await sb.rpc('set_points_rule',{p_restaurant_id:RESTAURANT_ID,p_baht:Number(pointRule.baht),p_points:Number(pointRule.points)});if(error){setMsg('บันทึกสูตรแต้มไม่ได้: '+friendly(error.message));return}setMsg(`บันทึกแล้ว ${data.baht} บาท = ${data.points} แต้ม`)}
 
 
 async function ensureAdminOCR(){if(window.Tesseract)return window.Tesseract;await new Promise((ok,bad)=>{const x=document.createElement('script');x.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';x.onload=ok;x.onerror=()=>bad(new Error('โหลด OCR ไม่สำเร็จ'));document.head.appendChild(x)});return window.Tesseract}
 function cleanOrderText(text){
  const raw=(text||'').replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
  const out=[];for(const line of raw){let x=line.replace(/\s{2,}/g,' ').replace(/[|¦]/g,' ').trim();if(x.length<2)continue;out.push(x)}
  return out.join('\n')
 }
 async function scanOrderFile(file){
  if(!file)return;setScanPreview(URL.createObjectURL(file));setScanBusy(true);setScanProgress(0);setMsg('กำลังอ่านข้อความจากรายการสั่งของ...');
  try{const T=await ensureAdminOCR();const out=await T.recognize(file,'tha+eng',{logger:m=>{if(m.status==='recognizing text')setScanProgress(Math.round((m.progress||0)*100))}});const text=cleanOrderText(out?.data?.text||'');setScanText(text);setMsg(text?'แปลงรายการเป็นข้อความแล้ว ตรวจและแก้ก่อนส่ง LINE ได้เลย':'อ่านข้อความไม่ชัด กรุณาถ่ายใหม่')}
  catch(e){setMsg('อ่านรายการไม่สำเร็จ กรุณาลองภาพที่ชัดขึ้น')}
  finally{setScanBusy(false)}
 }
 async function sendScanToLine(){
  const text=scanText.trim();if(!text){setMsg('ยังไม่มีข้อความให้ส่ง');return}
  const payload=[{type:'text',text:`📦 รายการสั่งของ\n${text}`}];
  try{
   if(window.liff?.isInClient?.()&&window.liff?.shareTargetPicker){
    await window.liff.shareTargetPicker(payload);setMsg('ส่งรายการไป LINE แล้ว');return
   }
   if(navigator.share){await navigator.share({title:'รายการสั่งของ',text:`📦 รายการสั่งของ\n${text}`});setMsg('เปิดเมนูแชร์แล้ว');return}
   await navigator.clipboard.writeText(`📦 รายการสั่งของ\n${text}`);setMsg('คัดลอกข้อความแล้ว นำไปวางใน LINE ได้เลย')
  }catch(e){setMsg('ยังส่ง LINE ไม่สำเร็จ ลองกดคัดลอกแทน')}
 }
 async function copyScanText(){if(!scanText.trim())return;await navigator.clipboard.writeText(scanText.trim());setMsg('คัดลอกข้อความแล้ว')}

 
 async function ensureGameCampaign(){
  if(gameCampaign)return gameCampaign;
  const{data,error}=await sb.from('game_campaigns').insert({restaurant_id:RESTAURANT_ID,name:'ล่าตัวอักษรบ้านต้นกล้า',description:'ตามหาตัวอักษรในร้าน แล้วนำมาต่อเป็นคำ',active:true,points_per_word:20}).select().single();
  if(error){setMsg(friendly(error.message));return null}setGameCampaign(data);return data
 }

 async function translateClueText(thText){
  const text=(thText||'').trim();
  if(!text)return {en:'',zh:''};
  try{
   const q=encodeURIComponent(text);
   const [enR,zhR]=await Promise.all([
    fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=th&tl=en&dt=t&q=${q}`),
    fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=th&tl=zh-CN&dt=t&q=${q}`)
   ]);
   if(!enR.ok||!zhR.ok)throw new Error('translate_failed');
   const [enJ,zhJ]=await Promise.all([enR.json(),zhR.json()]);
   const compact=x=>(x?.[0]||[]).map(a=>a?.[0]||'').join('').replace(/\s+/g,' ').trim();
   const en=compact(enJ).replace(/[.!?]+$/,'').trim();
   const zh=compact(zhJ).replace(/[。！？]+$/,'').trim();
   return {en,zh};
  }catch(e){
   setMsg('แปลคำใบ้อัตโนมัติไม่สำเร็จ สามารถกรอก English / 中文 เองได้');
   return {en:spotForm.clue_en||'',zh:spotForm.clue_zh||''};
  }
 }
 async function autoTranslateClue(){
  const th=(spotForm.clue_th||'').trim();
  if(!th){setSpotForm(f=>({...f,clue_en:'',clue_zh:''}));return}
  setMsg('กำลังแปลคำใบ้เป็น English / 中文...');
  const {en,zh}=await translateClueText(th);
  setSpotForm(f=>({...f,clue_en:en,clue_zh:zh}));
  if(en||zh)setMsg('แปลคำใบ้แล้ว ตรวจและแก้ไขได้ก่อนบันทึก');
 }

 function packRevealConfig(f=spotForm){return JSON.stringify({v:1,char:f.reveal_char||'✨',style:f.reveal_style||'cute',size:f.reveal_size||'large',motion:f.reveal_motion||'pop',sound:f.reveal_sound||'pop',volume:f.reveal_volume||'medium',screen_fx:f.screen_fx||'none'})}
 function unpackRevealConfig(raw){try{const o=JSON.parse(raw||'{}');return {reveal_char:o.char||'✨',reveal_style:o.style||'cute',reveal_size:o.size||'large',reveal_motion:o.motion||'pop',reveal_sound:o.sound||'pop',reveal_volume:o.volume||'medium',screen_fx:o.screen_fx||'none'}}catch(e){return {reveal_char:'✨',reveal_style:'cute',reveal_size:'large',reveal_motion:'pop',reveal_sound:'pop',reveal_volume:'medium',screen_fx:'none'}}}
 async function addGameSpot(e){
  e.preventDefault();
  setMsg(editingSpotId?'กำลังบันทึกการแก้ไข...':'กำลังบันทึกคำใบ้...');
  const c=await ensureGameCampaign();if(!c)return;
  const th=(spotForm.clue_th||'').trim();
  const letter=(spotForm.letter||'').trim().toUpperCase().replace(/[^A-Z]/g,'').slice(0,1);
  if(!th){setMsg('กรุณากรอกคำใบ้ภาษาไทย');return}
  if(!letter){setMsg('ตัวอักษรเกมต้องเป็นภาษาอังกฤษ A–Z เท่านั้น');return}
  let en=(spotForm.clue_en||'').trim(),zh=(spotForm.clue_zh||'').trim();
  if(!en||!zh){const tr=await translateClueText(th);en=en||tr.en;zh=zh||tr.zh}
  if(!en||!zh){setMsg('ยังแปลคำใบ้ไม่ครบ กรุณาตรวจ English / 中文 ก่อนบันทึก');return}

  if(editingSpotId){
   const payload={level_no:Number(gameLevel),point_no:Number(spotForm.point_no)||1,clue:th,clue_th:th,clue_en:en,clue_zh:zh,letter,points:Number(spotForm.points)||0,reveal_message:packRevealConfig()};
   const{error}=await sb.from('game_spots').update(payload).eq('id',editingSpotId);
   if(error){setMsg('แก้ไขไม่สำเร็จ: '+friendly(error.message));return}
   setEditingSpotId(null);
   setSpotForm({point_no:1,clue_th:'',clue_en:'',clue_zh:'',letter:'',points:5,reveal_char:'🐜',reveal_style:'cute',reveal_size:'large',reveal_motion:'pop',reveal_sound:'pop',reveal_volume:'medium',screen_fx:'none'});
   setMsg('บันทึกการแก้ไขคำใบ้แล้ว');
   await load();return
  }

  const used=gameSpots.filter(x=>Number(x.level_no||1)===Number(gameLevel)).map(x=>Number(x.point_no)||0);
  let pointNo=Number(spotForm.point_no)||1;
  if(used.includes(pointNo))pointNo=(used.length?Math.max(...used):0)+1;
  const code='LekHub-'+Date.now().toString().slice(-8);
  const payload={campaign_id:c.id,spot_code:code,level_no:Number(gameLevel),point_no:pointNo,clue:th,clue_th:th,clue_en:en,clue_zh:zh,letter,points:Number(spotForm.points)||0,reveal_message:packRevealConfig(),active:true};
  const{error}=await sb.from('game_spots').insert(payload);
  if(error){setMsg('บันทึกไม่สำเร็จ: '+friendly(error.message));return}
  setSpotForm({point_no:pointNo+1,clue_th:'',clue_en:'',clue_zh:'',letter:'',points:5});
  setMsg(`บันทึกคำใบ้จุดที่ ${pointNo} ของ LV.${gameLevel} แล้ว`);
  await load()
 }
 function editGameSpot(x){
  setGameLevel(Number(x.level_no||1));setEditingSpotId(x.id);
  setSpotForm({point_no:Number(x.point_no)||1,clue_th:x.clue_th||x.clue||'',clue_en:x.clue_en||'',clue_zh:x.clue_zh||'',letter:(x.letter||'').toUpperCase(),points:Number(x.points)||0,...unpackRevealConfig(x.reveal_message)});
  setMsg(`กำลังแก้ไขจุดที่ ${x.point_no} ของ LV.${x.level_no||1}`);
  requestAnimationFrame(()=>document.querySelector('.gameSpotForm')?.scrollIntoView({behavior:'smooth',block:'start'}))
 }
 function cancelEditGameSpot(){
  setEditingSpotId(null);
  const used=gameSpots.filter(x=>Number(x.level_no||1)===Number(gameLevel)).map(x=>Number(x.point_no)||0);
  setSpotForm({point_no:(used.length?Math.max(...used):0)+1,clue_th:'',clue_en:'',clue_zh:'',letter:'',points:5});
  setMsg('ยกเลิกการแก้ไขแล้ว')
 }
 async function deleteGameSpot(x){
  if(!window.confirm(`ลบคำใบ้จุดที่ ${x.point_no} ของ LV.${x.level_no||1} ใช่หรือไม่?`))return;
  setMsg('กำลังลบคำใบ้...');
  const{error}=await sb.from('game_spots').delete().eq('id',x.id);
  if(error){setMsg('ลบไม่สำเร็จ: '+friendly(error.message));return}
  if(editingSpotId===x.id)cancelEditGameSpot();
  setMsg(`ลบคำใบ้จุดที่ ${x.point_no} แล้ว`);
  await load()
 }
 async function toggleGameSpot(id,active){const{error}=await sb.from('game_spots').update({active:!active}).eq('id',id);if(error){setMsg(friendly(error.message));return}setGameSpots(x=>x.map(r=>r.id===id?{...r,active:!active}:r))}
 async function toggleCampaign(){if(!gameCampaign)return;const{error}=await sb.from('game_campaigns').update({active:!gameCampaign.active}).eq('id',gameCampaign.id);if(error){setMsg(friendly(error.message));return}setGameCampaign({...gameCampaign,active:!gameCampaign.active})}

 if(session&&!profile)return <Panel title="🛠️ หลังบ้านบ้านต้นกล้า" sub="กำลังตรวจสอบสิทธิ์..."><div className="memberAutoLoading"><div className="memberAutoSpinner">🛠️</div><b>กำลังเปิดหลังบ้าน</b></div></Panel>;
 if(!session||!allowed)return <Panel title="🔐 หลังบ้านร้าน" sub="สำหรับเจ้าของร้านและพนักงานที่ได้รับสิทธิ์เท่านั้น"><div className="adminDenied"><ShieldCheck/><h3>บัญชีนี้ยังไม่มีสิทธิ์หลังบ้าน</h3><p>ข้อมูลลูกค้าและรายการจองถูกป้องกันด้วยสิทธิ์ร้าน</p></div></Panel>;
 const today=new Date().toISOString().slice(0,10);
 return <Panel title="🛠️ หลังบ้านบ้านต้นกล้า" sub={`${profile?.display_name||profile?.role} • ${profile?.role}`}><section className="adminWrap">
  <div className="adminTop">{msg&&<span className="adminMsg">{msg}</span>}<button type="button" className="exitAdminModeBtn" onClick={onExitAdmin}>ออกจากโหมดแอดมิน</button></div>
  
  <div className="adminTopTabs" role="tablist" aria-label="เมนูหลังบ้าน">
   <button className={tab==='dashboard'?'active':''} onClick={()=>setTab('dashboard')}>วันนี้</button>
   <button className={tab==='scan'?'active':''} onClick={()=>setTab('scan')}>📷 สแกนรายการ</button>
   <button className={tab==='game'?'active':''} onClick={()=>setTab('game')}>⚙️ ตั้งค่าเกม</button>
   <button className={tab==='booking'?'active':''} onClick={()=>setTab('booking')}>จองโต๊ะ</button>
   <button className={tab==='events'?'active':''} onClick={()=>setTab('events')}>จองห้องไพรเวท</button>
   <button className={tab==='members'?'active':''} onClick={()=>setTab('members')}>สมาชิก</button>
   <button className={tab==='rewards'?'active':''} onClick={()=>setTab('rewards')}>รางวัล</button>
   <button className={tab==='points'?'active':''} onClick={()=>setTab('points')}>ตั้งค่าแต้ม</button>
   <button className={tab==='news'?'active':''} onClick={()=>setTab('news')}>ข่าวสาร</button>
  </div>
  {tab==='dashboard'&&<section className="adminDaily"><div className="adminQuickActions"><button className="scanSettingsShortcut" onClick={()=>setTab('scan')}><ScanLine/><span><b>สแกนรายการสั่งของ</b><small>ถ่ายรูป • OCR • แก้ข้อความ • ส่งเข้า LINE</small></span><strong>เปิดสแกน ›</strong></button><button className="gameSettingsShortcut" onClick={()=>setTab('game')}><Gamepad2/><span><b>ตั้งค่าเกม “ล่าคำตามลายแทงสมบัติ”</b><small>ตั้ง LV • จุด QR • ตัวอักษร • คำใบ้ ไทย / English / 中文</small></span><strong>เปิดตั้งค่า ›</strong></button></div>
   <div className="dailyHeading"><div><small>สรุปงานประจำวัน</small><h2>วันนี้ {new Date().toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'})}</h2></div><button className="refresh" onClick={load}><RefreshCw/> รีเฟรช</button></div>
   <div className="dailyStats">
    <button onClick={()=>setTab('booking')}><CalendarDays/><div><b>{reservations.filter(r=>r.booking_date===today&& !['cancelled','no_show'].includes(r.status)).length}</b><span>จองโต๊ะวันนี้</span></div></button>
    <button onClick={()=>setTab('events')}><PartyPopper/><div><b>{events.filter(r=>r.event_date===today&&r.status!=='cancelled').length}</b><span>จองห้องไพรเวทวันนี้</span></div></button>
    
    <button onClick={()=>setTab('members')}><Users/><div><b>{members.filter(m=>String(m.created_at||'').slice(0,10)===today).length}</b><span>สมาชิกใหม่วันนี้</span></div></button>
   </div>
   <section className="todoToday">
    <div className="todoTodayHead"><div><small>สิ่งที่ต้องทำของแอดมิน</small><h3>วันนี้และพรุ่งนี้</h3></div><div className="todoHeadActions"><span className="lineAutoBadge">LINE แจ้งเตือนอัตโนมัติ</span><button type="button" className="assignTaskBtn" onClick={()=>setShowTaskForm(v=>!v)}>+ มอบหมายงาน</button></div></div>
    {showTaskForm&&<form className="adminTaskForm" onSubmit={addAdminTask}>
      <label><span>สิ่งที่ต้องทำ</span><input value={taskForm.title} onChange={e=>setTaskForm({...taskForm,title:e.target.value})} placeholder="เช่น โทรยืนยันลูกค้าห้องไพรเวท"/></label>
      <label><span>รายละเอียด</span><textarea value={taskForm.details} onChange={e=>setTaskForm({...taskForm,details:e.target.value})} placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"/></label>
      <div className="adminTaskFormRow">
       <label><span>กำหนดวัน</span><input type="date" value={taskForm.due_date} onChange={e=>setTaskForm({...taskForm,due_date:e.target.value})}/></label>
       <label><span>ส่งให้ใคร</span><select value={taskForm.assignee} onChange={e=>setTaskForm({...taskForm,assignee:e.target.value})}><option value="all">แอดมินทุกคน</option>{adminPeople.map(a=><option key={a.id} value={a.id}>{a.display_name||'แอดมิน'}</option>)}</select></label>
      </div>
      <div className="adminTaskFormActions"><button type="button" onClick={()=>setShowTaskForm(false)}>ยกเลิก</button><button type="submit">ส่งงาน</button></div>
    </form>}
    <div className="todoTodayList">
      {adminTasks.filter(t=>t.status!=='cancelled').map(t=><div className={'manualAdminTask '+(t.status==='done'?'done':'')} key={'task-'+t.id}>
       <button type="button" className="manualTaskMain" onClick={()=>setAdminTaskStatus(t.id,t.status==='done'?'pending':'done')}><span className="taskCheck">{t.status==='done'?'✓':'○'}</span><div><b>{t.title}</b>{t.details&&<small>{t.details}</small>}<small>{t.due_date?'กำหนด '+new Date(t.due_date+'T00:00:00').toLocaleDateString('th-TH'):'ไม่กำหนดวัน'}</small></div></button>
       <div className="taskRecipient"><span>{t.assigned_to_all?'ส่งให้: แอดมินทุกคน':'ส่งให้: '+adminName(t.assignee_id)}</span><button type="button" onClick={()=>removeAdminTask(t.id)}>ลบ</button></div>
      </div>)}
      {reservations.filter(r=>r.booking_date===today&&r.status==='pending').map(r=><button key={'tb-'+r.id} onClick={()=>setTab('booking')}><CalendarDays/><div><b>ยืนยันโต๊ะ {String(r.booking_time).slice(0,5)} น.</b><small>{r.customer_name} • {r.party_size} คน</small></div><span>รอยืนยัน</span></button>)}
      {events.filter(r=>r.event_date===today&&['pending','contacted'].includes(r.status)).map(r=><button key={'ev-'+r.id} onClick={()=>setTab('events')}><PartyPopper/><div><b>จองห้องไพรเวทวันนี้</b><small>{r.customer_name} • {r.guest_count} คน {r.start_time?'• '+String(r.start_time).slice(0,5)+' น.':''}</small></div><span>ต้องจัดการ</span></button>)}
      {reservations.filter(r=>r.booking_date===new Date(Date.now()+86400000).toISOString().slice(0,10)&&!['cancelled','no_show'].includes(r.status)).slice(0,5).map(r=><button key={'tm-'+r.id} onClick={()=>setTab('booking')}><Clock/><div><b>พรุ่งนี้ {String(r.booking_time).slice(0,5)} น.</b><small>{r.customer_name} • {r.party_size} คน</small></div><span>เตือนล่วงหน้า</span></button>)}
      {!adminTasks.some(t=>t.status!=='cancelled')&&!reservations.some(r=>r.booking_date===today&&r.status==='pending')&&!events.some(r=>r.event_date===today&&['pending','contacted'].includes(r.status))&&!reservations.some(r=>r.booking_date===new Date(Date.now()+86400000).toISOString().slice(0,10)&&!['cancelled','no_show'].includes(r.status))&&<p className="empty">ไม่มีงานที่ต้องจัดการเพิ่มเติม</p>}
    </div>
    <div className="reminderRule"><b>การแจ้งเตือน LINE</b><span>แอดมิน: สรุปพรุ่งนี้ล่วงหน้า 1 วัน + เตือนซ้ำ 09:00 น.</span><span>ลูกค้า: เตือนก่อนเวลาจองโต๊ะ 30 นาที</span></div>
   </section>
   <div className="todayGrid">
    <section className="todayCard"><div className="todayCardTitle"><CalendarDays/><h3>จองโต๊ะวันนี้</h3><button onClick={()=>setTab('booking')}>ดูทั้งหมด</button></div>
     {reservations.filter(r=>r.booking_date===today&& !['cancelled','no_show'].includes(r.status)).length?
      reservations.filter(r=>r.booking_date===today&& !['cancelled','no_show'].includes(r.status)).map(r=><div className="todayItem" key={r.id}><div><b>{String(r.booking_time).slice(0,5)} น. • {r.customer_name}</b><small>{r.party_size} คน • {r.phone}</small></div><Status status={r.status}/></div>)
      :<p className="empty">วันนี้ยังไม่มีจองโต๊ะ</p>}
    </section>
    <section className="todayCard"><div className="todayCardTitle"><PartyPopper/><h3>จองห้องไพรเวทวันนี้</h3><button onClick={()=>setTab('events')}>ดูทั้งหมด</button></div>
     {events.filter(r=>r.event_date===today&&r.status!=='cancelled').length?
      events.filter(r=>r.event_date===today&&r.status!=='cancelled').map(r=><div className="todayItem" key={r.id}><div><b>{r.start_time?String(r.start_time).slice(0,5)+' น. • ':''}{r.customer_name}</b><small>{r.guest_count} คน • {r.event_type||'กิจกรรม'}</small></div><Status status={r.status}/></div>)
      :<p className="empty">วันนี้ยังไม่มีจองห้องไพรเวท</p>}
    </section>
    <section className="todayCard"><div className="todayCardTitle"><ScanLine/><h3>งานที่ต้องจัดการ</h3></div>
      
      <div className="todoRow" onClick={()=>setTab('events')}><span>ห้องไพรเวทรอติดต่อ</span><b>{events.filter(r=>['pending','contacted'].includes(r.status)).length}</b></div>
      <div className="todoRow" onClick={()=>setTab('booking')}><span>โต๊ะรอยืนยัน</span><b>{reservations.filter(r=>r.status==='pending').length}</b></div>
    </section>
    <section className="todayCard"><div className="todayCardTitle"><Newspaper/><h3>ข่าว/โปรโมชั่นล่าสุด</h3><button onClick={()=>setTab('news')}>จัดการ</button></div>
      {news.slice(0,3).length?news.slice(0,3).map(n=><div className="newsMini" key={n.id}><b>{n.title}</b><small>{n.active?'กำลังแสดง':'ซ่อนอยู่'}</small></div>):<p className="empty">ยังไม่มีข่าวสาร</p>}
    </section>
   </div>
  </section>}
  {tab==='booking'&&<section className="adminList"><h3>รายการจองโต๊ะ</h3>{reservations.length?reservations.map(r=><article className={'bookingAdmin '+(r.booking_date===today?'today':'')} key={r.id}><div className="bookingHead"><div><b>{r.customer_name}</b><small>{r.booking_code} • {r.phone}</small></div><Status status={r.status}/></div><p>{dateTH(r.booking_date)} • {String(r.booking_time).slice(0,5)} น. • {r.party_size} คน</p>{r.note&&<p className="note">{r.note}</p>}<div className="statusActions"><button onClick={()=>tableStatus(r.id,'confirmed')}>ยืนยัน</button><button onClick={()=>tableStatus(r.id,'seated')}>เข้าร้าน</button><button onClick={()=>tableStatus(r.id,'completed')}>เสร็จสิ้น</button><button className="danger" onClick={()=>tableStatus(r.id,'cancelled')}>ยกเลิก</button></div></article>):<p className="empty">ยังไม่มีรายการจอง</p>}</section>}
  {tab==='events'&&<section className="adminList"><h3>งานเลี้ยง / ห้อง</h3>{events.length?events.map(r=><article className="bookingAdmin" key={r.id}><div className="bookingHead"><div><b>{r.customer_name}</b><small>{r.booking_code} • {r.phone}</small></div><Status status={r.status}/></div><p>{dateTH(r.event_date)} • {r.start_time?String(r.start_time).slice(0,5)+' น. • ':''}{r.guest_count} คน • {r.event_type}</p>{r.note&&<p className="note">{r.note}</p>}<div className="statusActions"><button onClick={()=>eventStatus(r.id,'contacted')}>ติดต่อแล้ว</button><button onClick={()=>eventStatus(r.id,'confirmed')}>ยืนยัน</button><button onClick={()=>eventStatus(r.id,'completed')}>เสร็จสิ้น</button><button className="danger" onClick={()=>eventStatus(r.id,'cancelled')}>ยกเลิก</button></div></article>):<p className="empty">ยังไม่มีงานเลี้ยง</p>}</section>}
  {tab==='members'&&<section className="adminList"><h3>รายชื่อสมาชิก</h3>{members.length?members.map(m=><article className="memberAdmin" key={m.id}><div className="memberAvatar">👤</div><div><b>{m.display_name||'สมาชิก'}</b><small>{m.phone||'ไม่ระบุเบอร์'} • สมัคร {new Date(m.created_at).toLocaleDateString('th-TH')}</small><p>บิลอนุมัติ {m.receipt_count||0} รายการ • ยอดใช้จ่าย {Number(m.total_spend||0).toLocaleString('th-TH')} บาท</p></div><strong>{m.points_balance||0}<small>แต้ม</small></strong></article>):<p className="empty">ยังไม่มีสมาชิก</p>}</section>}
  {tab==='points'&&<section className="adminList"><h3>ตั้งค่าแต้มจากยอดเงิน</h3><form className="pointsRuleForm" onSubmit={savePointRule}><div className="ruleEquation"><label><span>ยอดเงิน</span><input required type="number" min="0.01" step="0.01" value={pointRule.baht} onChange={e=>setPointRule({...pointRule,baht:e.target.value})}/><small>บาท</small></label><b>=</b><label><span>ได้แต้ม</span><input required type="number" min="1" step="1" value={pointRule.points} onChange={e=>setPointRule({...pointRule,points:e.target.value})}/><small>แต้ม</small></label></div><div className="rulePreview"><Star/><div><small>ตัวอย่าง</small><b>ยอด 100 บาท จะได้ {Math.floor(100/Number(pointRule.baht||1))*Number(pointRule.points||0)} แต้ม</b></div></div><button>บันทึกสูตรแต้ม</button></form><p className="adminNote">สมาชิกสแกนบิลแล้ว ระบบจะใช้สูตรนี้คำนวณและเพิ่มแต้มเข้าบัญชีอัตโนมัติทันที</p></section>}
  {tab==='rewards'&&<section className="adminList"><h3>จัดการรางวัล</h3><form className="adminForm" onSubmit={addReward}><input required placeholder="ชื่อรางวัล" value={rewardForm.name} onChange={e=>setRewardForm({...rewardForm,name:e.target.value})}/><input placeholder="รายละเอียด" value={rewardForm.description} onChange={e=>setRewardForm({...rewardForm,description:e.target.value})}/><div><input required type="number" min="1" placeholder="แต้ม" value={rewardForm.points_cost} onChange={e=>setRewardForm({...rewardForm,points_cost:e.target.value})}/><input type="number" min="0" placeholder="จำนวน (ว่าง=ไม่จำกัด)" value={rewardForm.stock} onChange={e=>setRewardForm({...rewardForm,stock:e.target.value})}/></div><button>+ เพิ่มรางวัล</button></form>{rewards.map(r=><article className="manageRow" key={r.id}><div><b>{r.name}</b><small>{r.points_cost} แต้ม • {r.stock==null?'ไม่จำกัด':`เหลือ ${r.stock}`}</small></div><button className={r.active?'on':'off'} onClick={()=>toggleReward(r.id,r.active)}>{r.active?'เปิดอยู่':'ปิดอยู่'}</button></article>)}</section>}
  {tab==='game'&&<section className="adminList"><div className="gameAdminHead"><div><h3>จัดการเกมล่าคำตามลายแทงสมบัติ</h3><small>{gameCampaign?.name||'ยังไม่มีกิจกรรม'}</small></div>{gameCampaign&&<button className={gameCampaign.active?'on':'off'} onClick={toggleCampaign}>{gameCampaign.active?'เปิดเกมอยู่':'ปิดเกมอยู่'}</button>}</div>
   <div className="levelChooser"><b>เลือกเลเวล</b><div>{[1,2,3,4,5,6,7,8,9,10].map(l=><button key={l} className={gameLevel===l?'active':''} onClick={()=>{setEditingSpotId(null);setGameLevel(l);const used=gameSpots.filter(x=>Number(x.level_no)===l).map(x=>Number(x.point_no)||0);setSpotForm(f=>({...f,point_no:(used.length?Math.max(...used):0)+1}))}}>LV.{l}</button>)}</div></div>
   <div className="levelRuleInfo"><b>LV.{gameLevel}</b><span>คำตอบเป็นภาษาอังกฤษเท่านั้น • ใช้ {gameLevel+2} ตัวอักษร • ซ่อน QR {gameLevel+3} จุด • มีตัวหลอก 1 ตัว</span></div>
   <form className="adminForm gameSpotForm" onSubmit={addGameSpot}>
    <div className="spotRow2"><label><span>จุดที่</span><input required type="number" min="1" value={spotForm.point_no} onChange={e=>setSpotForm({...spotForm,point_no:e.target.value})}/></label><label><span>ตัวอักษร</span><input required maxLength="1" placeholder="เช่น A" value={spotForm.letter} onChange={e=>setSpotForm({...spotForm,letter:e.target.value.toUpperCase().replace(/[^A-Z]/g,'').slice(0,1)})}/></label></div>
    <label className="fullField"><span>คำใบ้ภาษาไทย</span><textarea required rows="2" placeholder="เช่น มองหาจุดที่กลิ่นหอมปลุกทุกคนให้ตื่น" value={spotForm.clue_th} onChange={e=>setSpotForm({...spotForm,clue_th:e.target.value})} onBlur={autoTranslateClue}/></label><button type="button" className="translateClueBtn" onClick={autoTranslateClue}>🌐 แปลไทย → English / 中文</button>
    <label className="fullField"><span>Clue — English</span><textarea rows="2" placeholder="English clue for foreign customers" value={spotForm.clue_en} onChange={e=>setSpotForm({...spotForm,clue_en:e.target.value})}/></label>
    <label className="fullField"><span>提示 — 中文</span><textarea rows="2" placeholder="中文提示" value={spotForm.clue_zh} onChange={e=>setSpotForm({...spotForm,clue_zh:e.target.value})}/></label>
    <label className="fullField"><span>แต้มเมื่อพบจุดนี้</span><input required type="number" min="0" placeholder="เช่น 5" value={spotForm.points} onChange={e=>setSpotForm({...spotForm,points:e.target.value})}/></label>
    <div className="qrEffectBox"><div className="qrEffectHead"><b>🎭 เอฟเฟกต์ตอนเด็กสแกนเจอ</b><small>ตั้งตัวที่โผล่ ขนาด การเคลื่อนไหว และเสียงได้อิสระ</small></div>
     <label className="fullField"><span>ตัวที่โผล่</span><input maxLength="8" placeholder="เช่น 🐜 👻 🤡 🦖" value={spotForm.reveal_char} onChange={e=>setSpotForm({...spotForm,reveal_char:e.target.value})}/></label>
     <div className="effectGrid">
      <label><span>อารมณ์</span><select value={spotForm.reveal_style} onChange={e=>setSpotForm({...spotForm,reveal_style:e.target.value})}><option value="cute">น่ารัก</option><option value="excited">ตื่นเต้น</option><option value="scare">ตกใจ</option></select></label>
      <label><span>ขนาด</span><select value={spotForm.reveal_size} onChange={e=>setSpotForm({...spotForm,reveal_size:e.target.value})}><option value="small">เล็ก</option><option value="medium">กลาง</option><option value="large">ใหญ่</option><option value="full">เต็มจอ</option></select></label>
      <label><span>การโผล่</span><select value={spotForm.reveal_motion} onChange={e=>setSpotForm({...spotForm,reveal_motion:e.target.value})}><option value="pop">เด้ง</option><option value="zoom">ซูมเข้า</option><option value="rush">พุ่งเข้าหา</option><option value="shake">สั่น</option></select></label>
      <label><span>เสียง</span><select value={spotForm.reveal_sound} onChange={e=>setSpotForm({...spotForm,reveal_sound:e.target.value})}><option value="none">ปิดเสียง</option><option value="pop">ป๊อบ</option><option value="coin">เหรียญ</option><option value="laugh">หัวเราะ</option><option value="roar">คำราม</option></select></label>
      <label><span>ระดับเสียง</span><select value={spotForm.reveal_volume} onChange={e=>setSpotForm({...spotForm,reveal_volume:e.target.value})}><option value="low">เบา</option><option value="medium">กลาง</option><option value="loud">ดัง</option></select></label>
      <label><span>เอฟเฟกต์จอ</span><select value={spotForm.screen_fx} onChange={e=>setSpotForm({...spotForm,screen_fx:e.target.value})}><option value="none">ไม่มี</option><option value="shake">สั่นจอ</option><option value="flash">แฟลช</option><option value="dim">มืดลง</option></select></label>
     </div>
     <div className={'effectPreview '+spotForm.reveal_style+' '+spotForm.reveal_size}><span>{spotForm.reveal_char||'✨'}</span><b>ตัวอย่างตอนสแกน</b></div>
    </div>
    <div className="gameFormActions"><button className="gameSaveBtn">{editingSpotId?'✓ บันทึกการแก้ไข':`+ บันทึกคำใบ้จุดที่ ${spotForm.point_no} ของ LV.${gameLevel}`}</button>{editingSpotId&&<button type="button" className="gameCancelBtn" onClick={cancelEditGameSpot}>ยกเลิก</button>}</div>
   </form>
   <div className="gameSpotList"><h4>คำใบ้ของ LV.{gameLevel}</h4>{gameSpots.filter(x=>Number(x.level_no||1)===gameLevel).length?gameSpots.filter(x=>Number(x.level_no||1)===gameLevel).sort((a,b)=>(a.point_no||0)-(b.point_no||0)).map(x=><article className={'gameSpotRow clueAdminRow '+(editingSpotId===x.id?'editing':'')} key={x.id}>
    <div className="spotLetter">{x.letter}</div>
    <div className="clueAdminCopy">
     <b>จุดที่ {x.point_no}</b>
     <small><strong>TH:</strong> {x.clue_th||x.clue||'-'}</small>
     <small><strong>EN:</strong> {x.clue_en||'-'}</small>
     <small><strong>中文:</strong> {x.clue_zh||'-'}</small>
     <code>{x.qr_token||x.spot_code}</code>
    </div>
    <div className="clueAdminActions">
     <small className="cluePoints">{x.points} แต้ม</small>
     <button className={x.active?'on':'off'} onClick={()=>toggleGameSpot(x.id,x.active)}>{x.active?'เปิด':'ปิด'}</button>
     <button className="editClueBtn" onClick={()=>editGameSpot(x)}>แก้ไข</button>
     <button className="deleteClueBtn" onClick={()=>deleteGameSpot(x)}>ลบ</button>
    </div>
   </article>):<p className="empty">LV.{gameLevel} ยังไม่มีคำใบ้ กรอกด้านบนเพื่อเพิ่มจุดแรกได้เลย</p>}</div>
  </section>}
  {tab==='scan'&&<section className="adminList"><h3>สแกนรายการสั่งของ</h3><div className="orderScanCard">
   <label className="orderScanUpload"><span>{scanPreview?<img src={scanPreview} alt="รายการสั่งของ"/>:<ScanLine/>}<b>{scanBusy?'กำลังอ่านรายการ...':'ถ่ายรูป / เลือกรูปรายการสั่งของ'}</b><small>ระบบจะแปลงภาพเป็นข้อความให้อัตโนมัติ</small></span><input disabled={scanBusy} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>scanOrderFile(e.target.files?.[0]||null)}/></label>
   {scanBusy&&<div className="ocrProgress"><div style={{width:`${scanProgress}%`}}/><span>กำลังอ่านรายการ {scanProgress}%</span></div>}
   <label className="scanTextEdit"><span>ข้อความที่อ่านได้</span><textarea rows="12" placeholder={"เช่น\nกาแฟ 2 ถุง\nนมสด 6 ขวด\nไซรัปวานิลลา 1 ขวด"} value={scanText} onChange={e=>setScanText(e.target.value)}/></label>
   <div className="scanActions"><button onClick={copyScanText}>คัดลอกข้อความ</button><button className="lineSend" onClick={sendScanToLine}>ส่งเข้า LINE</button></div>
   <p className="adminNote">ก่อนส่งสามารถแก้ชื่อสินค้า จำนวน หรือข้อความที่ OCR อ่านผิดได้</p>
  </div></section>}
  {tab==='news'&&<section className="adminList"><h3>ข่าวสารหน้าร้าน</h3><form className="adminForm" onSubmit={addNews}><input required placeholder="หัวข้อข่าว" value={newsForm.title} onChange={e=>setNewsForm({...newsForm,title:e.target.value})}/><textarea required rows="3" placeholder="รายละเอียดข่าว / โปรโมชั่น / กิจกรรม" value={newsForm.body} onChange={e=>setNewsForm({...newsForm,body:e.target.value})}/><button>ประกาศข่าว</button></form>{news.map(n=><article className="manageRow" key={n.id}><div><b>{n.title}</b><small>{n.body}</small></div><button className={n.active?'on':'off'} onClick={()=>toggleNews(n.id,n.active)}>{n.active?'แสดงอยู่':'ซ่อนอยู่'}</button></article>)}</section>}
 </section></Panel>
}

function Coming({title}){return <Panel title={title||'กำลังพัฒนา'} sub="ระบบหลักกำลังเชื่อมต่อ"><div className="bigemoji">✨</div><p>ส่วนนี้จะทำต่อหลังจองโต๊ะและสมาชิกใช้งานเรียบร้อย</p></Panel>}
function Panel({title,sub,children}){return <section className="panel"><header><img className="storeLogo panelStoreLogo" src="/LekHub-logo.png" alt="บ้านต้นกล้า Cafe & Kids Space"/><div className="panelTitle"><h1>{title}</h1><p>{sub}</p></div></header>{children}</section>}
function friendly(m='',lang='th'){if(m.includes('Anonymous sign-ins are disabled'))return T(lang,'ต้องเปิด Anonymous Sign-Ins ใน Supabase ก่อน','Membership sign-in is temporarily unavailable','会员登录暂时不可用');if(m.includes('invalid_date'))return T(lang,'กรุณาเลือกวันที่วันนี้หรือวันถัดไป','Please choose today or a future date','请选择今天或之后的日期');if(m.includes('invalid_party_size'))return T(lang,'จำนวนคนไม่ถูกต้อง','Invalid number of guests','人数不正确');return m}
function dateTH(d){if(!d)return'';return new Date(d+'T00:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'})}
function dateL(d,lang='th'){if(!d)return'';return new Date(d+'T00:00:00').toLocaleDateString(lang==='zh'?'zh-CN':lang==='en'?'en-GB':'th-TH',{day:'numeric',month:'short',year:'numeric'})}
createRoot(document.getElementById('root')).render(<App/>);
