"use client"

import { useEffect, useMemo, useState } from "react"
import { ensureLineAdminSession, type ClientAdminSession } from "../../../lib/line-admin-client"

type Tenant={
 tenant_key:string
 display_name:string
 status:"active"|"locked"|"expired"
 line_channel_id?:string|null
 line_liff_id?:string|null
 isolation_ready?:boolean|null
 expires_at?:string|null
}
type AdminRequest={tenant_key:string;tenant_name?:string;line_user_id:string;display_name:string;requested_at?:string}
type SortKey="name"|"expiry"|"status"

function dateText(value?:string|null){if(!value)return "ไม่กำหนด";return new Intl.DateTimeFormat("th-TH",{timeZone:"Asia/Bangkok",day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(value))}
function dateInputValue(value?:string|null){return value?value.slice(0,10):""}
function remainingDays(value?:string|null){return value?Math.ceil((new Date(value).getTime()-Date.now())/86400000):null}
function useIsMobile(){
 const [mobile,setMobile]=useState(false)
 useEffect(()=>{
  const check=()=>setMobile(window.innerWidth<860)
  check();window.addEventListener("resize",check)
  return ()=>window.removeEventListener("resize",check)
 },[])
 return mobile
}

export default function TenantOAPage(){
 const [session,setSession]=useState<ClientAdminSession|null>(null)
 const [rows,setRows]=useState<Tenant[]>([])
 const [adminRequests,setAdminRequests]=useState<AdminRequest[]>([])
 const [expiryDraft,setExpiryDraft]=useState<Record<string,string>>({})
 const [channelDraft,setChannelDraft]=useState<Record<string,string>>({})
 const [liffDraft,setLiffDraft]=useState<Record<string,string>>({})
 const [tokenDraft,setTokenDraft]=useState<Record<string,string>>({})
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[working,setWorking]=useState("")
 const [form,setForm]=useState({tenantKey:"",displayName:"",lineChannelId:"",lineLiffId:"",lineChannelAccessToken:"",expiresAt:""})
 const [search,setSearch]=useState("")
 const [sortKey,setSortKey]=useState<SortKey>("name")
 const isMobile=useIsMobile()

 function syncDrafts(nextRows:Tenant[],onlyKeys?:string[]){
  const keys=onlyKeys?new Set(onlyKeys):null
  setExpiryDraft(v=>{const n={...v};for(const r of nextRows)if(!keys||keys.has(r.tenant_key))n[r.tenant_key]=dateInputValue(r.expires_at);return n})
  setChannelDraft(v=>{const n={...v};for(const r of nextRows)if(!keys||keys.has(r.tenant_key))n[r.tenant_key]=r.line_channel_id||"";return n})
  setLiffDraft(v=>{const n={...v};for(const r of nextRows)if(!keys||keys.has(r.tenant_key))n[r.tenant_key]=r.line_liff_id||"";return n})
  if(!keys)setTokenDraft(v=>{const n={...v};for(const r of nextRows)if(!(r.tenant_key in n))n[r.tenant_key]="";return n})
 }

 async function load(onlySyncKeys?:string[]){
  if(!onlySyncKeys)setLoading(true)
  setError("")
  try{
   const current=await ensureLineAdminSession();setSession(current)
   if(current.role!=="owner"&&current.role!=="super_admin")throw new Error("หน้านี้สำหรับแอดมินหลักเท่านั้น")
   const response=await fetch("/api/super-admin/oa",{credentials:"same-origin",cache:"no-store"})
   const data=await response.json().catch(()=>({}))
   if(!response.ok||!data.ok)throw new Error(data.error||"โหลดสมาชิก OA ไม่สำเร็จ")
   const nextRows:Tenant[]=data.rows||[]
   setRows(nextRows);setAdminRequests(data.adminRequests||[])
   syncDrafts(nextRows,onlySyncKeys)
  }catch(caught){setError(caught instanceof Error?caught.message:"โหลดสมาชิก OA ไม่สำเร็จ")}
  finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[])

 async function createTenant(e:React.FormEvent){
  e.preventDefault();if(working)return;setWorking("create");setError("")
  try{
   const response=await fetch("/api/super-admin/oa",{method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",body:JSON.stringify(form)})
   const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw new Error(data.error||"เพิ่มสมาชิก OA ไม่สำเร็จ")
   const newKey=form.tenantKey
   setForm({tenantKey:"",displayName:"",lineChannelId:"",lineLiffId:"",lineChannelAccessToken:"",expiresAt:""})
   await load([newKey])
  }catch(caught){setError(caught instanceof Error?caught.message:"เพิ่มสมาชิก OA ไม่สำเร็จ")}finally{setWorking("")}
 }

 async function patchTenant(tenantKey:string,patch:Record<string,unknown>){
  if(working)return;setWorking(tenantKey);setError("")
  try{
   const response=await fetch("/api/super-admin/oa",{method:"PATCH",headers:{"content-type":"application/json"},credentials:"same-origin",body:JSON.stringify({tenantKey,...patch})})
   const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw new Error(data.error||"อัปเดตสมาชิก OA ไม่สำเร็จ")
   await load([tenantKey])
  }catch(caught){setError(caught instanceof Error?caught.message:"อัปเดตสมาชิก OA ไม่สำเร็จ")}finally{setWorking("")}
 }

 async function saveConfig(row:Tenant){
  const patch:Record<string,unknown>={lineChannelId:channelDraft[row.tenant_key]||"",lineLiffId:liffDraft[row.tenant_key]||"",expiresAt:expiryDraft[row.tenant_key]||null}
  if((tokenDraft[row.tenant_key]||"").trim())patch.lineChannelAccessToken=tokenDraft[row.tenant_key].trim()
  await patchTenant(row.tenant_key,patch)
  setTokenDraft(v=>({...v,[row.tenant_key]:""}))
 }
 async function approve(req:AdminRequest){await patchTenant(req.tenant_key,{approveAdminLineUserId:req.line_user_id})}
 async function lockTenant(row:Tenant){
  if(!window.confirm(`ยืนยันยกเลิกเช่า "${row.display_name}" (${row.tenant_key})?\nสมาชิกจะเข้าเล่นไม่ได้ทันทีจนกว่าจะเปิดใช้งานใหม่`))return
  await patchTenant(row.tenant_key,{status:"locked",isolationReady:false})
 }

 const stats=useMemo(()=>({total:rows.length,active:rows.filter(x=>x.status==="active"&&(remainingDays(x.expires_at)??0)>=0).length,ready:rows.filter(x=>x.isolation_ready).length,locked:rows.filter(x=>x.status==="locked").length}),[rows])

 const visibleRows=useMemo(()=>{
  const q=search.trim().toLowerCase()
  let list=rows
  if(q)list=list.filter(r=>r.tenant_key.toLowerCase().includes(q)||r.display_name.toLowerCase().includes(q))
  const sorted=[...list]
  if(sortKey==="name")sorted.sort((a,b)=>a.display_name.localeCompare(b.display_name,"th"))
  else if(sortKey==="status")sorted.sort((a,b)=>a.status.localeCompare(b.status))
  else if(sortKey==="expiry")sorted.sort((a,b)=>{
   const da=a.expires_at?new Date(a.expires_at).getTime():Infinity
   const db=b.expires_at?new Date(b.expires_at).getTime():Infinity
   return da-db
  })
  return sorted
 },[rows,search,sortKey])

 function RowActions({row}:{row:Tenant}){
  return <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
   <button type="button" disabled={working===row.tenant_key} onClick={()=>void saveConfig(row)}>บันทึกค่า</button>
   <button type="button" disabled={working===row.tenant_key} onClick={()=>void patchTenant(row.tenant_key,{
    isolationReady:!row.isolation_ready,
    lineChannelId:channelDraft[row.tenant_key]||"",
    lineLiffId:liffDraft[row.tenant_key]||"",
    ...(row.isolation_ready||!(tokenDraft[row.tenant_key]||"").trim()?{}:{lineChannelAccessToken:tokenDraft[row.tenant_key].trim()}),
   })}>{row.isolation_ready?"พักการเช่า":"เปิดใช้งานเช่า"}</button>
   <button type="button" disabled={working===row.tenant_key} onClick={()=>void patchTenant(row.tenant_key,{extendDays:30,status:"active"})}>ต่ออายุ 30 วัน</button>
   {row.status==="locked"||row.status==="expired"
    ?<button type="button" disabled={working===row.tenant_key} onClick={()=>void patchTenant(row.tenant_key,{status:"active"})}>เปิดใช้งานใหม่</button>
    :<button type="button" disabled={working===row.tenant_key} onClick={()=>void lockTenant(row)} style={{color:"#b91c1c"}}>ยกเลิกเช่า</button>}
  </div>
 }

 return <main className="admin-shell">
  <aside className="admin-sidebar"><div className="admin-brand"><span>LH</span><div><b>LekHub</b><small>MAIN ADMIN</small></div></div><div style={{padding:"14px 16px",fontWeight:800}}>คุม OA ผู้เช่า</div></aside>
  <section className="admin-content">
   <header className="admin-topbar"><div><small>{session?`แอดมินหลัก • ${session.displayName}`:"กำลังตรวจสิทธิ์"}</small><h1>คุม OA ผู้เช่า</h1></div><button type="button" onClick={()=>void load()}>รีเฟรช</button></header>
   {error&&<div className="admin-error">{error}</div>}{loading&&<p>กำลังโหลด...</p>}
   <div className="stat-grid" style={{marginBottom:"20px"}}><article><small>OA ทั้งหมด</small><b>{stats.total}</b></article><article><small>ใช้งาน</small><b>{stats.active}</b></article><article><small>พร้อมเช่า</small><b>{stats.ready}</b></article><article><small>ล็อก</small><b>{stats.locked}</b></article></div>

   <form onSubmit={createTenant} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"10px",padding:"16px",border:"1px solid #ddd",borderRadius:"12px",marginBottom:"22px"}}>
    <input required value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})} placeholder="ชื่อสมาชิก / ชื่อ OA"/>
    <input required value={form.tenantKey} onChange={e=>setForm({...form,tenantKey:e.target.value})} placeholder="รหัสผู้เช่า เช่น oa-001"/>
    <input value={form.lineChannelId} onChange={e=>setForm({...form,lineChannelId:e.target.value})} placeholder="LINE Channel ID"/>
    <input value={form.lineLiffId} onChange={e=>setForm({...form,lineLiffId:e.target.value})} placeholder="LINE LIFF ID"/>
    <input type="password" value={form.lineChannelAccessToken} onChange={e=>setForm({...form,lineChannelAccessToken:e.target.value})} placeholder="Messaging API Channel Access Token"/>
    <input type="date" value={form.expiresAt} onChange={e=>setForm({...form,expiresAt:e.target.value})}/>
    <button type="submit" disabled={working==="create"} className="red-action">{working==="create"?"กำลังเพิ่ม...":"+ เพิ่ม OA ผู้เช่า"}</button>
   </form>

   {!!adminRequests.length&&<section style={{padding:"16px",border:"1px solid #ddd",borderRadius:"12px",marginBottom:"22px"}}><h2>คำขอแอดมิน OA</h2>{adminRequests.map(req=><div key={`${req.tenant_key}-${req.line_user_id}`} style={{display:"flex",justifyContent:"space-between",gap:"12px",alignItems:"center",padding:"10px 0",borderTop:"1px solid #eee"}}><div><b>{req.display_name}</b><small style={{display:"block"}}>{req.tenant_name||req.tenant_key}</small></div><button type="button" disabled={!!working} onClick={()=>void approve(req)}>อนุมัติแอดมิน</button></div>)}</section>}

   <section style={{border:"1px solid #ddd",borderRadius:"12px",overflow:"hidden",background:"#fff"}}>
    <div style={{padding:"14px 16px",borderBottom:"1px solid #eee",display:"flex",flexWrap:"wrap",gap:12,alignItems:"center",justifyContent:"space-between"}}>
     <h2 style={{margin:0}}>รายชื่อ OA ผู้เช่า ({visibleRows.length}/{rows.length})</h2>
     <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหาชื่อหรือรหัสผู้เช่า..." style={{minWidth:220}}/>
      <select value={sortKey} onChange={e=>setSortKey(e.target.value as SortKey)}>
       <option value="name">เรียงตามชื่อ</option>
       <option value="expiry">เรียงตามวันหมดอายุ (ใกล้สุดก่อน)</option>
       <option value="status">เรียงตามสถานะ</option>
      </select>
     </div>
    </div>

    {isMobile
     ?<div style={{display:"flex",flexDirection:"column",gap:12,padding:16}}>
      {visibleRows.map(row=>{
       const days=remainingDays(row.expires_at)
       const memberUrl=`https://lek-hub.vercel.app/member/play?tenant=${encodeURIComponent(row.tenant_key)}`
       return <div key={row.tenant_key} style={{border:"1px solid #eee",borderRadius:10,padding:12}}>
        <div style={{fontWeight:800}}>{row.display_name}</div>
        <small style={{display:"block",color:"#6b7280",marginBottom:8}}>{row.tenant_key} • {row.status}</small>
        <label style={{fontSize:12,color:"#6b7280"}}>Channel ID</label>
        <input value={channelDraft[row.tenant_key]||""} onChange={e=>setChannelDraft(v=>({...v,[row.tenant_key]:e.target.value}))} style={{width:"100%",marginBottom:8}}/>
        <label style={{fontSize:12,color:"#6b7280"}}>LIFF ID</label>
        <input value={liffDraft[row.tenant_key]||""} onChange={e=>setLiffDraft(v=>({...v,[row.tenant_key]:e.target.value}))} style={{width:"100%",marginBottom:8}}/>
        <label style={{fontSize:12,color:"#6b7280"}}>LINE Push Token (ไม่แสดงค่าที่บันทึกแล้ว)</label>
        <input type="password" value={tokenDraft[row.tenant_key]||""} onChange={e=>setTokenDraft(v=>({...v,[row.tenant_key]:e.target.value}))} placeholder="ใส่ใหม่เพื่อเปลี่ยน" style={{width:"100%",marginBottom:8}}/>
        <label style={{fontSize:12,color:"#6b7280"}}>วันหมดอายุ</label>
        <input type="date" value={expiryDraft[row.tenant_key]||""} onChange={e=>setExpiryDraft(v=>({...v,[row.tenant_key]:e.target.value}))} style={{width:"100%",marginBottom:4}}/>
        <small style={{display:"block",marginBottom:8}}>{dateText(row.expires_at)}{days!==null?` • ${days<0?"หมดแล้ว":`${days} วัน`}`:""}</small>
        <div style={{fontWeight:800,marginBottom:4}}>{row.isolation_ready&&row.status==="active"?"พร้อม":"ยังไม่พร้อม"}</div>
        {row.isolation_ready&&<small style={{display:"block",wordBreak:"break-all",marginBottom:8,color:"#6b7280"}}>{memberUrl}</small>}
        <RowActions row={row}/>
       </div>
      })}
      {!loading&&!visibleRows.length&&!error&&<p>{rows.length?"ไม่พบ OA ที่ตรงกับคำค้นหา":"ยังไม่มี OA ผู้เช่า"}</p>}
     </div>
     :<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:"1520px"}}><thead><tr><th style={{padding:12,textAlign:"left"}}>OA</th><th style={{padding:12,textAlign:"left"}}>Channel ID</th><th style={{padding:12,textAlign:"left"}}>LIFF ID</th><th style={{padding:12,textAlign:"left"}}>LINE Push Token</th><th style={{padding:12,textAlign:"left"}}>หมดอายุ</th><th style={{padding:12,textAlign:"left"}}>พร้อมเช่า</th><th style={{padding:12,textAlign:"left"}}>ลิงก์สมาชิก</th><th style={{padding:12,textAlign:"left"}}>คุม</th></tr></thead><tbody>
    {visibleRows.map(row=>{const days=remainingDays(row.expires_at);const memberUrl=`https://lek-hub.vercel.app/member/play?tenant=${encodeURIComponent(row.tenant_key)}`;return <tr key={row.tenant_key} style={{borderTop:"1px solid #eee"}}>
     <td style={{padding:12}}><b>{row.display_name}</b><small style={{display:"block"}}>{row.tenant_key} • {row.status}</small></td>
     <td style={{padding:12}}><input value={channelDraft[row.tenant_key]||""} onChange={e=>setChannelDraft(v=>({...v,[row.tenant_key]:e.target.value}))}/></td>
     <td style={{padding:12}}><input value={liffDraft[row.tenant_key]||""} onChange={e=>setLiffDraft(v=>({...v,[row.tenant_key]:e.target.value}))}/></td>
     <td style={{padding:12}}><input type="password" value={tokenDraft[row.tenant_key]||""} onChange={e=>setTokenDraft(v=>({...v,[row.tenant_key]:e.target.value}))} placeholder="ใส่ใหม่เพื่อเปลี่ยน"/><small style={{display:"block"}}>ไม่แสดง token ที่บันทึกแล้ว</small></td>
     <td style={{padding:12}}><input type="date" value={expiryDraft[row.tenant_key]||""} onChange={e=>setExpiryDraft(v=>({...v,[row.tenant_key]:e.target.value}))}/><small style={{display:"block"}}>{dateText(row.expires_at)}{days!==null?` • ${days<0?"หมดแล้ว":`${days} วัน`}`:""}</small></td>
     <td style={{padding:12,fontWeight:800}}>{row.isolation_ready&&row.status==="active"?"พร้อม":"ยังไม่พร้อม"}<small style={{display:"block",fontWeight:500,color:"#6b7280"}}>{row.status==="locked"?"ยกเลิกเช่าแล้ว":row.status==="expired"?"หมดอายุ":""}</small></td>
     <td style={{padding:12,maxWidth:300,wordBreak:"break-all"}}>{row.isolation_ready?memberUrl:"ตั้ง Channel + LIFF แล้วเปิดใช้งานก่อน"}</td>
     <td style={{padding:12}}><RowActions row={row}/></td>
    </tr>})}
   </tbody></table>{!loading&&!visibleRows.length&&!error&&<p style={{padding:16}}>{rows.length?"ไม่พบ OA ที่ตรงกับคำค้นหา":"ยังไม่มี OA ผู้เช่า"}</p>}</div>}
   </section>
  </section>
 </main>
}
