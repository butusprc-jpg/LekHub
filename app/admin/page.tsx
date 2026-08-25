"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { adminRpc, ensureLineAdminSession, type ClientAdminSession } from "../../lib/line-admin-client"

export default function AdminPage(){
 const [session,setSession]=useState<ClientAdminSession|null>(null)
 const [rows,setRows]=useState<any[]>([])
 const [error,setError]=useState("")

 useEffect(()=>{(async()=>{
  try{
   const current=await ensureLineAdminSession()
   setSession(current)
   const {data,error}=await adminRpc(current,"lekhub_line_admin_list_oa_inbox",{p_status:null,p_limit:200})
   if(error)throw new Error(error.message)
   setRows(data||[])
  }catch(caught){setError(caught instanceof Error?caught.message:"เข้าหลังบ้านไม่สำเร็จ")}
 })()},[])

 const pending=rows.filter(x=>x.status==="pending").length
 const reviewed=rows.filter(x=>x.status==="reviewed").length
 const imported=rows.filter(x=>x.imported_at).length

 return <main className="admin-shell">
  <aside className="admin-sidebar">
   <div className="admin-brand"><span>LH</span><div><b>LekHub</b><small>OA BACKOFFICE</small></div></div>
   <nav>
    <Link className="active" href="/admin">ภาพรวม</Link>
    <Link href="/admin/reports">กล่องรับ</Link>
    <Link href="/admin/members">สมาชิก</Link>
    <Link href="/admin/backoffice">รายงานหลังบ้าน</Link>
    <Link href="/admin/settings">ตั้งค่าระบบ</Link>
   </nav>
  </aside>
  <section className="admin-content">
   <header className="admin-topbar"><div><small>{session?`แอดมิน LINE • ${session.displayName}`:"กำลังเชื่อม LINE"}</small><h1>ภาพรวมหลังบ้าน</h1></div></header>
   {error&&<div className="admin-error">{error}</div>}
   <div className="stat-grid">
    <Link href="/admin/reports" style={{textDecoration:"none",color:"inherit"}}>
     <article><small>งานเข้า</small><b>{rows.length}</b></article>
    </Link>
    <Link href="/admin/reports?status=pending" style={{textDecoration:"none",color:"inherit"}}>
     <article><small>รอตรวจ</small><b>{pending}</b></article>
    </Link>
    <Link href="/admin/reports?status=reviewed" style={{textDecoration:"none",color:"inherit"}}>
     <article><small>ตรวจแล้ว</small><b>{reviewed}</b></article>
    </Link>
    <Link href="/admin/backoffice" style={{textDecoration:"none",color:"inherit"}}>
     <article><small>นำเข้าแล้ว</small><b>{imported}</b></article>
    </Link>
   </div>
  </section>
 </main>
}
