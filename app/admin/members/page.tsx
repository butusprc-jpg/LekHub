"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { adminRpc, ensureLineAdminSession, type ClientAdminSession } from "../../../lib/line-admin-client"

type MemberRow={
 line_user_id:string
 member_name:string
 total_played:number
 total_rewards:number
 last_activity:string
}

function dateTime(value:string){
 return new Intl.DateTimeFormat("th-TH",{timeZone:"Asia/Bangkok",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value))
}

export default function MembersPage(){
 const [session,setSession]=useState<ClientAdminSession|null>(null)
 const [rows,setRows]=useState<MemberRow[]>([])
 const [error,setError]=useState("")
 const [loading,setLoading]=useState(true)

 useEffect(()=>{(async()=>{
  try{
   const current=await ensureLineAdminSession();setSession(current)
   const {data,error}=await adminRpc(current,"lekhub_line_admin_list_members",{p_limit:1000})
   if(error)throw new Error(error.message)
   setRows((data||[]) as MemberRow[])
  }catch(caught){setError(caught instanceof Error?caught.message:"โหลดสมาชิกไม่สำเร็จ")}
  finally{setLoading(false)}
 })()},[])

 return <main className="admin-shell">
  <aside className="admin-sidebar">
   <div className="admin-brand"><span>LH</span><div><b>LekHub</b><small>OA BACKOFFICE</small></div></div>
   <nav>
    <Link href="/admin">ภาพรวม</Link>
    <Link href="/admin/reports">กล่องรับ</Link>
    <Link className="active" href="/admin/members">สมาชิก</Link>
    <Link href="/admin/backoffice">ตารางกิจกรรม</Link>
    <Link href="/admin/settings">ตั้งค่าระบบ</Link>
   </nav>
  </aside>
  <section className="admin-content">
   <header className="admin-topbar"><div><small>{session?`แอดมิน LINE • ${session.displayName}`:"กำลังเชื่อม LINE"}</small><h1>สมาชิก</h1></div></header>
   {loading&&<p>กำลังโหลด...</p>}
   {error&&<div className="admin-error">{error}</div>}
   <div style={{overflowX:"auto"}}>
    <table style={{width:"100%",borderCollapse:"collapse",minWidth:"650px"}}>
     <thead><tr><th style={{textAlign:"left",padding:"10px"}}>ชื่อ LINE</th><th style={{textAlign:"right",padding:"10px"}}>ยอดรวมทั้งหมดที่เล่น</th><th style={{textAlign:"right",padding:"10px"}}>ถูกรางวัลกิจกรรมทั้งหมด</th><th style={{textAlign:"left",padding:"10px"}}>ล่าสุด</th></tr></thead>
     <tbody>{rows.map(row=><tr key={row.line_user_id}>
      <td style={{padding:"12px",fontWeight:700}}>{row.member_name}</td>
      <td style={{padding:"12px",textAlign:"right",fontWeight:700}}>{Number(row.total_played).toLocaleString()}</td>
      <td style={{padding:"12px",textAlign:"right",fontWeight:700}}>{Number(row.total_rewards).toLocaleString()}</td>
      <td style={{padding:"12px"}}>{dateTime(row.last_activity)}</td>
     </tr>)}</tbody>
    </table>
   </div>
  </section>
 </main>
}
