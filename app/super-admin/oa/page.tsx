"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ensureLineAdminSession, type ClientAdminSession } from "../../../lib/line-admin-client"

type Tenant={
 tenant_key:string
 display_name:string
 status:"active"|"locked"|"expired"
 line_channel_id?:string|null
 expires_at?:string|null
 locked_at?:string|null
 created_at?:string|null
 updated_at?:string|null
}

function dateText(value?:string|null){
 if(!value)return "ไม่กำหนด"
 return new Intl.DateTimeFormat("th-TH",{timeZone:"Asia/Bangkok",day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(value))
}

function remainingDays(value?:string|null){
 if(!value)return null
 return Math.ceil((new Date(value).getTime()-Date.now())/86400000)
}

export default function TenantOAPage(){
 const [session,setSession]=useState<ClientAdminSession|null>(null)
 const [rows,setRows]=useState<Tenant[]>([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState("")
 const [working,setWorking]=useState("")
 const [form,setForm]=useState({tenantKey:"",displayName:"",lineChannelId:"",expiresAt:""})

 async function load(){
  setLoading(true);setError("")
  try{
   const current=await ensureLineAdminSession();setSession(current)
   if(current.role!=="owner"&&current.role!=="super_admin")throw new Error("หน้านี้สำหรับแอดมินหลักเท่านั้น")
   const response=await fetch("/api/super-admin/oa",{credentials:"same-origin",cache:"no-store"})
   const data=await response.json().catch(()=>({}))
   if(!response.ok||!data.ok)throw new Error(data.error||"โหลด OA ไม่สำเร็จ")
   setRows(data.rows||[])
  }catch(caught){setError(caught instanceof Error?caught.message:"โหลด OA ไม่สำเร็จ")}
  finally{setLoading(false)}
 }

 useEffect(()=>{void load()},[])

 async function createTenant(e:React.FormEvent){
  e.preventDefault();if(working)return
  setWorking("create");setError("")
  try{
   const response=await fetch("/api/super-admin/oa",{
    method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",
    body:JSON.stringify(form),
   })
   const data=await response.json().catch(()=>({}))
   if(!response.ok||!data.ok)throw new Error(data.error||"เพิ่ม OA ไม่สำเร็จ")
   setForm({tenantKey:"",displayName:"",lineChannelId:"",expiresAt:""})
   await load()
  }catch(caught){setError(caught instanceof Error?caught.message:"เพิ่ม OA ไม่สำเร็จ")}
  finally{setWorking("")}
 }

 async function patchTenant(tenantKey:string,patch:Record<string,unknown>){
  if(working)return
  setWorking(tenantKey);setError("")
  try{
   const response=await fetch("/api/super-admin/oa",{
    method:"PATCH",headers:{"content-type":"application/json"},credentials:"same-origin",
    body:JSON.stringify({tenantKey,...patch}),
   })
   const data=await response.json().catch(()=>({}))
   if(!response.ok||!data.ok)throw new Error(data.error||"อัปเดต OA ไม่สำเร็จ")
   setRows(current=>current.map(row=>row.tenant_key===tenantKey?data.row:row))
  }catch(caught){setError(caught instanceof Error?caught.message:"อัปเดต OA ไม่สำเร็จ")}
  finally{setWorking("")}
 }

 const stats=useMemo(()=>({
  total:rows.length,
  active:rows.filter(x=>x.status==="active").length,
  locked:rows.filter(x=>x.status==="locked").length,
  expiring:rows.filter(x=>{const d=remainingDays(x.expires_at);return d!==null&&d>=0&&d<=7}).length,
 }),[rows])

 return <main className="admin-shell">
  <aside className="admin-sidebar">
   <div className="admin-brand"><span>LH</span><div><b>LekHub</b><small>MAIN ADMIN</small></div></div>
   <nav>
    <Link href="/admin">หลังบ้าน OA หลัก</Link>
    <Link className="active" href="/super-admin/oa">คุม OA ผู้เช่า</Link>
   </nav>
  </aside>

  <section className="admin-content">
   <header className="admin-topbar">
    <div><small>{session?`แอดมินหลัก • ${session.displayName}`:"กำลังตรวจสิทธิ์"}</small><h1>คุม OA ผู้เช่า</h1></div>
    <button type="button" onClick={()=>void load()}>รีเฟรช</button>
   </header>

   {error&&<div className="admin-error">{error}</div>}
   {loading&&<p>กำลังโหลด...</p>}

   <div className="stat-grid" style={{marginBottom:"20px"}}>
    <article><small>OA ทั้งหมด</small><b>{stats.total}</b></article>
    <article><small>ใช้งาน</small><b>{stats.active}</b></article>
    <article><small>ล็อก</small><b>{stats.locked}</b></article>
    <article><small>หมดใน 7 วัน</small><b>{stats.expiring}</b></article>
   </div>

   <form onSubmit={createTenant} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"10px",padding:"16px",border:"1px solid #ddd",borderRadius:"12px",marginBottom:"22px"}}>
    <input required value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})} placeholder="ชื่อ OA / ผู้เช่า" />
    <input required value={form.tenantKey} onChange={e=>setForm({...form,tenantKey:e.target.value})} placeholder="Tenant slug เช่น cafe-01" />
    <input value={form.lineChannelId} onChange={e=>setForm({...form,lineChannelId:e.target.value})} placeholder="LINE Channel ID" />
    <input type="date" value={form.expiresAt} onChange={e=>setForm({...form,expiresAt:e.target.value})} />
    <button type="submit" disabled={working==="create"} className="red-action">{working==="create"?"กำลังเพิ่ม...":"+ เพิ่ม OA ผู้เช่า"}</button>
   </form>

   <div style={{display:"grid",gap:"14px"}}>
    {rows.map(row=>{
     const days=remainingDays(row.expires_at)
     const expired=days!==null&&days<0
     return <article key={row.tenant_key} style={{border:"1px solid #ddd",borderRadius:"12px",padding:"16px",background:"#fff"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:"12px",alignItems:"flex-start",flexWrap:"wrap"}}>
       <div>
        <h2 style={{margin:"0 0 4px"}}>{row.display_name}</h2>
        <small>Tenant: {row.tenant_key}</small><br/>
        <small>Channel ID: {row.line_channel_id||"-"}</small>
       </div>
       <strong>{row.status==="active"?(expired?"หมดอายุ":"ใช้งาน"):row.status==="locked"?"ล็อก":"หมดอายุ"}</strong>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"10px",marginTop:"14px"}}>
       <div><small>วันหมดอายุ</small><div style={{fontWeight:700}}>{dateText(row.expires_at)}</div></div>
       <div><small>เหลือ</small><div style={{fontWeight:700}}>{days===null?"ไม่จำกัด":days<0?`เกิน ${Math.abs(days)} วัน`:`${days} วัน`}</div></div>
       <div><small>สถานะ</small><div style={{fontWeight:700}}>{row.status}</div></div>
      </div>

      <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"16px"}}>
       <button type="button" disabled={working===row.tenant_key} onClick={()=>void patchTenant(row.tenant_key,{extendDays:30})}>รับชำระ +30 วัน</button>
       {row.status==="locked"
        ?<button type="button" disabled={working===row.tenant_key} onClick={()=>void patchTenant(row.tenant_key,{status:"active"})}>ปลดล็อก</button>
        :<button type="button" disabled={working===row.tenant_key} onClick={()=>void patchTenant(row.tenant_key,{status:"locked"})}>ล็อก OA</button>}
       <Link href={`/admin?tenant=${encodeURIComponent(row.tenant_key)}`} style={{display:"inline-flex",alignItems:"center",padding:"8px 12px",border:"1px solid #ccc",borderRadius:"8px",textDecoration:"none",color:"inherit"}}>เปิดหลังบ้าน</Link>
      </div>
     </article>
    })}
    {!loading&&!rows.length&&!error&&<p>ยังไม่มี OA ผู้เช่า</p>}
   </div>
  </section>
 </main>
}
