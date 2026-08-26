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
    <Link className="active" href="/admin">สรุป</Link>
    <Link href="/admin/reports">รับเข้า</Link>
    <Link href="/admin/members">สมาชิก</Link>
    <Link href="/admin/backoffice">รายงานหลังบ้าน</Link>
    <Link href="/admin/settings">ตั้งค่าระบบ</Link>
   </nav>
  </aside>
  <section className="admin-content">
   <header className="admin-topbar"><div><small>{session?`แอดมิน LINE • ${session.displayName}`:"กำลังเชื่อม LINE"}</small><h1>สรุป</h1></div></header>
   {error&&<div className="admin-error">{error}</div>}
   <section className="admin-hero-2d">
    <div>
     <span className="hero-kicker">LEKHUB OA BACKOFFICE</span>
     <h2>สรุปงานวันนี้</h2>
     <p>ดูงานรับเข้า ตรวจรายการ และสถานะนำเข้าหลังบ้านได้ในหน้าจอเดียว</p>
     <div className="hero-actions">
      <Link href="/admin/reports">📥 เปิดรับเข้า</Link>
      <Link href="/admin/backoffice">📊 ตารางกิจกรรม</Link>
     </div>
    </div>
   </section>
   <div className="stat-grid stat-grid-2d">
    <Link href="/admin/reports" style={{textDecoration:"none",color:"inherit"}}>
     <article><span className="stat-icon">📥</span><small>รับเข้าทั้งหมด</small><b>{rows.length}</b><em>รายการ</em></article>
    </Link>
    <Link href="/admin/reports?status=pending" style={{textDecoration:"none",color:"inherit"}}>
     <article><span className="stat-icon">⏳</span><small>รอตรวจ</small><b>{pending}</b><em>รายการ</em></article>
    </Link>
    <Link href="/admin/reports?status=reviewed" style={{textDecoration:"none",color:"inherit"}}>
     <article><span className="stat-icon">✅</span><small>ตรวจแล้ว</small><b>{reviewed}</b><em>รายการ</em></article>
    </Link>
    <Link href="/admin/backoffice" style={{textDecoration:"none",color:"inherit"}}>
     <article><span className="stat-icon">📚</span><small>นำเข้าแล้ว</small><b>{imported}</b><em>รายการ</em></article>
    </Link>
   </div>
  </section>
 </main>
}
