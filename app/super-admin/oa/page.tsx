"use client"

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
   if(!response.ok||!data.ok)throw new Error(data.error||"โหลดสมาชิก OA ไม่สำเร็จ")
   setRows(data.rows||[])
  }catch(caught){setError(caught instanceof Error?caught.message:"โหลดสมาชิก OA ไม่สำเร็จ")}
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
   if(!response.ok||!data.ok)throw new Error(data.error||"เพิ่มสมาชิก OA ไม่สำเร็จ")
   setForm({tenantKey:"",displayName:"",lineChannelId:"",expiresAt:""})
   await load()
  }catch(caught){setError(caught instanceof Error?caught.message:"เพิ่มสมาชิก OA ไม่สำเร็จ")}
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
   if(!response.ok||!data.ok)throw new Error(data.error||"อัปเดตสมาชิก OA ไม่สำเร็จ")
   setRows(current=>current.map(row=>row.tenant_key===tenantKey?data.row:row))
  }catch(caught){setError(caught instanceof Error?caught.message:"อัปเดตสมาชิก OA ไม่สำเร็จ")}
  finally{setWorking("")}
 }

 const stats=useMemo(()=>({
  total:rows.length,
  active:rows.filter(x=>x.status==="active"&&(remainingDays(x.expires_at)??0)>=0).length,
  locked:rows.filter(x=>x.status==="locked").length,
  expiring:rows.filter(x=>{const d=remainingDays(x.expires_at);return d!==null&&d>=0&&d<=7}).length,
 }),[rows])

 return <main className="admin-shell">
  <aside className="admin-sidebar">
   <div className="admin-brand"><span>LH</span><div><b>LekHub</b><small>MAIN ADMIN</small></div></div>
   <div style={{padding:"14px 16px",fontWeight:800}}>คุม OA ผู้เช่า</div>
  </aside>

  <section className="admin-content">
   <header className="admin-topbar">
    <div><small>{session?`แอดมินหลัก • ${session.displayName}`:"กำลังตรวจสิทธิ์"}</small><h1>คุม OA ผู้เช่า</h1></div>
    <button type="button" onClick={()=>void load()}>รีเฟรช</button>
   </header>

   {error&&<div className="admin-error">{error}</div>}
   {loading&&<p>กำลังโหลด...</p>}

   <div className="stat-grid" style={{marginBottom:"20px"}}>
    <article><small>สมาชิกทั้งหมด</small><b>{stats.total}</b></article>
    <article><small>ใช้งาน</small><b>{stats.active}</b></article>
    <article><small>ล็อก</small><b>{stats.locked}</b></article>
    <article><small>หมดใน 7 วัน</small><b>{stats.expiring}</b></article>
   </div>

   <form onSubmit={createTenant} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"10px",padding:"16px",border:"1px solid #ddd",borderRadius:"12px",marginBottom:"22px"}}>
    <input required value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})} placeholder="ชื่อสมาชิก / ชื่อ OA" />
    <input required value={form.tenantKey} onChange={e=>setForm({...form,tenantKey:e.target.value})} placeholder="รหัสผู้เช่า เช่น oa-001" />
    <input value={form.lineChannelId} onChange={e=>setForm({...form,lineChannelId:e.target.value})} placeholder="LINE Channel ID" />
    <input type="date" value={form.expiresAt} onChange={e=>setForm({...form,expiresAt:e.target.value})} />
    <button type="submit" disabled={working==="create"} className="red-action">{working==="create"?"กำลังเพิ่ม...":"+ เพิ่มสมาชิก OA"}</button>
   </form>

   <section style={{border:"1px solid #ddd",borderRadius:"12px",overflow:"hidden",background:"#fff"}}>
    <div style={{padding:"14px 16px",borderBottom:"1px solid #eee"}}><h2 style={{margin:0}}>รายชื่อสมาชิก OA</h2></div>
    <div style={{overflowX:"auto"}}>
     <table style={{width:"100%",borderCollapse:"collapse",minWidth:"760px"}}>
      <thead><tr>
       <th style={{textAlign:"left",padding:"12px"}}>สมาชิก / OA</th>
       <th style={{textAlign:"left",padding:"12px"}}>Channel ID</th>
       <th style={{textAlign:"left",padding:"12px"}}>วันหมดอายุ</th>
       <th style={{textAlign:"left",padding:"12px"}}>คงเหลือ</th>
       <th style={{textAlign:"left",padding:"12px"}}>สถานะ</th>
       <th style={{textAlign:"left",padding:"12px"}}>คุม</th>
      </tr></thead>
      <tbody>
       {rows.map(row=>{
        const days=remainingDays(row.expires_at)
        const expired=days!==null&&days<0
        const status=row.status==="locked"?"ล็อก":expired||row.status==="expired"?"หมดอายุ":"ใช้งาน"
        return <tr key={row.tenant_key} style={{borderTop:"1px solid #eee"}}>
         <td style={{padding:"12px"}}><b>{row.display_name}</b><br/><small>{row.tenant_key}</small></td>
         <td style={{padding:"12px"}}>{row.line_channel_id||"-"}</td>
         <td style={{padding:"12px",fontWeight:700}}>{dateText(row.expires_at)}</td>
         <td style={{padding:"12px"}}>{days===null?"ไม่จำกัด":days<0?`หมดแล้ว ${Math.abs(days)} วัน`:`${days} วัน`}</td>
         <td style={{padding:"12px",fontWeight:700}}>{status}</td>
         <td style={{padding:"12px"}}><div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
          <button type="button" disabled={working===row.tenant_key} onClick={()=>void patchTenant(row.tenant_key,{extendDays:30})}>ต่ออายุ +30 วัน</button>
          {row.status==="locked"
           ?<button type="button" disabled={working===row.tenant_key} onClick={()=>void patchTenant(row.tenant_key,{status:"active"})}>ปลดล็อก</button>
           :<button type="button" disabled={working===row.tenant_key} onClick={()=>void patchTenant(row.tenant_key,{status:"locked"})}>ล็อก</button>}
         </div></td>
        </tr>
       })}
      </tbody>
     </table>
    </div>
    {!loading&&!rows.length&&!error&&<p style={{padding:"16px"}}>ยังไม่มีสมาชิก OA</p>}
   </section>
  </section>
 </main>
}
