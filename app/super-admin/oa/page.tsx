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

function dateText(value?:string|null){if(!value)return "ไม่กำหนด";return new Intl.DateTimeFormat("th-TH",{timeZone:"Asia/Bangkok",day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(value))}
function dateInputValue(value?:string|null){return value?value.slice(0,10):""}
function remainingDays(value?:string|null){return value?Math.ceil((new Date(value).getTime()-Date.now())/86400000):null}

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

 async function load(){
  setLoading(true);setError("")
  try{
   const current=await ensureLineAdminSession();setSession(current)
   if(current.role!=="owner"&&current.role!=="super_admin")throw new Error("หน้านี้สำหรับแอดมินหลักเท่านั้น")
   const response=await fetch("/api/super-admin/oa",{credentials:"same-origin",cache:"no-store"})
   const data=await response.json().catch(()=>({}))
   if(!response.ok||!data.ok)throw new Error(data.error||"โหลดสมาชิก OA ไม่สำเร็จ")
   const nextRows:Tenant[]=data.rows||[]
   setRows(nextRows);setAdminRequests(data.adminRequests||[])
   setExpiryDraft(Object.fromEntries(nextRows.map(r=>[r.tenant_key,dateInputValue(r.expires_at)])))
   setChannelDraft(Object.fromEntries(nextRows.map(r=>[r.tenant_key,r.line_channel_id||""])))
   setLiffDraft(Object.fromEntries(nextRows.map(r=>[r.tenant_key,r.line_liff_id||""])))
   setTokenDraft(Object.fromEntries(nextRows.map(r=>[r.tenant_key,""])))
  }catch(caught){setError(caught instanceof Error?caught.message:"โหลดสมาชิก OA ไม่สำเร็จ")}
  finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[])

 async function createTenant(e:React.FormEvent){
  e.preventDefault();if(working)return;setWorking("create");setError("")
  try{
   const response=await fetch("/api/super-admin/oa",{method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",body:JSON.stringify(form)})
   const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw new Error(data.error||"เพิ่มสมาชิก OA ไม่สำเร็จ")
   setForm({tenantKey:"",displayName:"",lineChannelId:"",lineLiffId:"",lineChannelAccessToken:"",expiresAt:""});await load()
  }catch(caught){setError(caught instanceof Error?caught.message:"เพิ่มสมาชิก OA ไม่สำเร็จ")}finally{setWorking("")}
 }

 async function patchTenant(tenantKey:string,patch:Record<string,unknown>){
  if(working)return;setWorking(tenantKey);setError("")
  try{
   const response=await fetch("/api/super-admin/oa",{method:"PATCH",headers:{"content-type":"application/json"},credentials:"same-origin",body:JSON.stringify({tenantKey,...patch})})
   const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw new Error(data.error||"อัปเดตสมาชิก OA ไม่สำเร็จ")
   await load()
  }catch(caught){setError(caught instanceof Error?caught.message:"อัปเดตสมาชิก OA ไม่สำเร็จ")}finally{setWorking("")}
 }

 async function saveConfig(row:Tenant){
  const patch:Record<string,unknown>={lineChannelId:channelDraft[row.tenant_key]||"",lineLiffId:liffDraft[row.tenant_key]||"",expiresAt:expiryDraft[row.tenant_key]||null}
  if((tokenDraft[row.tenant_key]||"").trim())patch.lineChannelAccessToken=tokenDraft[row.tenant_key].trim()
  await patchTenant(row.tenant_key,patch)
  setTokenDraft(v=>({...v,[row.tenant_key]:""}))
 }
 async function approve(req:AdminRequest){await patchTenant(req.tenant_key,{approveAdminLineUserId:req.line_user_id})}

 const stats=useMemo(()=>({total:rows.length,active:rows.filter(x=>x.status==="active"&&(remainingDays(x.expires_at)??0)>=0).length,ready:rows.filter(x=>x.isolation_ready).length,locked:rows.filter(x=>x.status==="locked").length}),[rows])

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

   <section style={{border:"1px solid #ddd",borderRadius:"12px",overflow:"hidden",background:"#fff"}}><div style={{padding:"14px 16px",borderBottom:"1px solid #eee"}}><h2 style={{margin:0}}>รายชื่อ OA ผู้เช่า</h2></div><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:"1520px"}}><thead><tr><th style={{padding:12,textAlign:"left"}}>OA</th><th style={{padding:12,textAlign:"left"}}>Channel ID</th><th style={{padding:12,textAlign:"left"}}>LIFF ID</th><th style={{padding:12,textAlign:"left"}}>LINE Push Token</th><th style={{padding:12,textAlign:"left"}}>หมดอายุ</th><th style={{padding:12,textAlign:"left"}}>พร้อมเช่า</th><th style={{padding:12,textAlign:"left"}}>ลิงก์สมาชิก</th><th style={{padding:12,textAlign:"left"}}>คุม</th></tr></thead><tbody>
    {rows.map(row=>{const days=remainingDays(row.expires_at);const memberUrl=`https://lek-hub.vercel.app/member/play?tenant=${encodeURIComponent(row.tenant_key)}`;return <tr key={row.tenant_key} style={{borderTop:"1px solid #eee"}}>
     <td style={{padding:12}}><b>{row.display_name}</b><small style={{display:"block"}}>{row.tenant_key} • {row.status}</small></td>
     <td style={{padding:12}}><input value={channelDraft[row.tenant_key]||""} onChange={e=>setChannelDraft(v=>({...v,[row.tenant_key]:e.target.value}))}/></td>
     <td style={{padding:12}}><input value={liffDraft[row.tenant_key]||""} onChange={e=>setLiffDraft(v=>({...v,[row.tenant_key]:e.target.value}))}/></td>
     <td style={{padding:12}}><input type="password" value={tokenDraft[row.tenant_key]||""} onChange={e=>setTokenDraft(v=>({...v,[row.tenant_key]:e.target.value}))} placeholder="ใส่ใหม่เพื่อเปลี่ยน"/><small style={{display:"block"}}>ไม่แสดง token ที่บันทึกแล้ว</small></td>
     <td style={{padding:12}}><input type="date" value={expiryDraft[row.tenant_key]||""} onChange={e=>setExpiryDraft(v=>({...v,[row.tenant_key]:e.target.value}))}/><small style={{display:"block"}}>{dateText(row.expires_at)}{days!==null?` • ${days<0?"หมดแล้ว":`${days} วัน`}`:""}</small></td>
     <td style={{padding:12,fontWeight:800}}>{row.isolation_ready&&row.status==="active"?"พร้อม":"ยังไม่พร้อม"}<small style={{display:"block",fontWeight:500,color:"#6b7280"}}>{row.status==="locked"?"ยกเลิกเช่าแล้ว":row.status==="expired"?"หมดอายุ":""}</small></td>
     <td style={{padding:12,maxWidth:300,wordBreak:"break-all"}}>{row.isolation_ready?memberUrl:"ตั้ง Channel + LIFF แล้วเปิดใช้งานก่อน"}</td>
     <td style={{padding:12}}><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
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
       :<button type="button" disabled={working===row.tenant_key} onClick={()=>void patchTenant(row.tenant_key,{status:"locked",isolationReady:false})}>ยกเลิกเช่า</button>}
     </div></td>
    </tr>})}
   </tbody></table></div>{!loading&&!rows.length&&!error&&<p style={{padding:16}}>ยังไม่มี OA ผู้เช่า</p>}</section>
  </section>
 </main>
}
