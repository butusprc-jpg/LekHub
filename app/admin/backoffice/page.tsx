"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { adminRpc, ensureLineAdminSession, type ClientAdminSession } from "../../../lib/line-admin-client"

type ReportItem={id:number;value:string;category_label:string;heart:number}
type Report={id:string;reference_code:string;member_name:string;item_count:number;total:number;imported_at:string;items:ReportItem[]}

export default function BackofficePage(){
 const [session,setSession]=useState<ClientAdminSession|null>(null)
 const [rows,setRows]=useState<Report[]>([])
 const [error,setError]=useState("")
 const [loading,setLoading]=useState(true)

 async function load(){
  setLoading(true);setError("")
  try{
   const current=await ensureLineAdminSession()
   setSession(current)
   const {data,error}=await adminRpc(current,"lekhub_line_admin_list_backoffice_reports",{p_limit:300})
   if(error)throw new Error(error.message)
   setRows((data||[]) as Report[])
  }catch(caught){setError(caught instanceof Error?caught.message:"โหลดรายงานหลังบ้านไม่สำเร็จ")}
  finally{setLoading(false)}
 }

 useEffect(()=>{load()},[])

 return <main className="admin-shell">
  <aside className="admin-sidebar">
   <div className="admin-brand"><span>LH</span><div><b>LekHub</b><small>OA BACKOFFICE</small></div></div>
   <nav>
    <Link href="/admin">ภาพรวม</Link>
    <Link href="/admin/reports">กล่องรับจาก OA</Link>
    <Link className="active" href="/admin/backoffice">รายงานหลังบ้าน</Link>
    <Link href="/admin/settings">ตั้งค่าระบบ</Link>
   </nav>
  </aside>
  <section className="admin-content">
   <header className="admin-topbar"><div><small>{session?`แอดมิน LINE • ${session.displayName}`:"กำลังเชื่อม LINE"}</small><h1>รายงานหลังบ้าน</h1></div></header>
   {loading&&<p>กำลังโหลด...</p>}
   {error&&<div className="admin-error">{error}<br/><button type="button" onClick={load}>ลองใหม่</button></div>}
   <div className="submission-grid">
    {rows.map(row=><article className="submission-card" key={row.id}>
     <div className="submission-head"><div><h2>{row.member_name}</h2><small>{row.reference_code}</small></div><b>นำเข้าแล้ว</b></div>
     <div className="submission-items">{row.items.map(item=><div key={item.id}><b>{item.value}</b><span>{item.category_label}</span><strong>{Number(item.heart).toLocaleString()}</strong></div>)}</div>
     <div className="submission-total"><span>{row.item_count} รายการ</span><b>รวม {Number(row.total).toLocaleString()}</b></div>
    </article>)}
   </div>
  </section>
 </main>
}
