"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { adminRpc, ensureLineAdminSession, type ClientAdminSession } from "../../../lib/line-admin-client"

type SubmissionItem = { id:number; value:string; category_label:string; heart:number }
type Submission = {
  id:string
  reference_code:string
  member_name:string
  status:"pending"|"reviewed"|"cancelled"
  item_count:number
  total:number
  created_at:string
  imported_at?:string|null
  items:SubmissionItem[]
}

export default function ReportsPage() {
  const [session,setSession]=useState<ClientAdminSession|null>(null)
  const [rows,setRows]=useState<Submission[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState("")
  const [working,setWorking]=useState("")

  async function load() {
    setLoading(true); setError("")
    try {
      const current=await ensureLineAdminSession()
      setSession(current)
      const {data,error}=await adminRpc(current,"lekhub_line_admin_list_oa_inbox",{
        p_status:null,p_limit:200,
      })
      if(error) throw new Error(error.message)
      setRows((data||[]) as Submission[])
    } catch(caught) {
      setError(caught instanceof Error?caught.message:"โหลดรายงานไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{load()},[])

  async function setStatus(id:string,status:"pending"|"reviewed"|"cancelled") {
    if(!session||working)return
    setWorking(id); setError("")
    try{
      const {error}=await adminRpc(session,"lekhub_line_admin_set_submission_status",{
        p_submission_id:id,p_status:status,
      })
      if(error)throw new Error(error.message)
      await load()
    }catch(caught){
      setError(caught instanceof Error?caught.message:"อัปเดตสถานะไม่สำเร็จ")
    }finally{setWorking("")}
  }

  async function importSubmission(id:string){
    if(!session||working)return
    setWorking(id);setError("")
    try{
      const {data,error}=await adminRpc(session,"lekhub_line_admin_import_submission",{
        p_submission_id:id,
      })
      if(error)throw new Error(error.message)
      if(!data?.success)throw new Error(data?.reason||"นำเข้าไม่สำเร็จ")
      await load()
    }catch(caught){
      setError(caught instanceof Error?caught.message:"นำเข้าไม่สำเร็จ")
    }finally{setWorking("")}
  }

  async function reviewOrImport(row:Submission){
    if(!session||working||row.imported_at)return
    if(row.status!=="reviewed"){
      await setStatus(row.id,"reviewed")
      return
    }
    await importSubmission(row.id)
  }

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-brand"><span>LH</span><div><b>LekHub</b><small>OA BACKOFFICE</small></div></div>
      <nav>
        <Link href="/admin">ภาพรวม</Link>
        <Link className="active" href="/admin/reports">กล่องรับจาก OA</Link>
        <Link href="/admin/backoffice">รายงานหลังบ้าน</Link>
        <Link href="/admin/settings">ตั้งค่าระบบ</Link>
      </nav>
    </aside>

    <section className="admin-content">
      <header className="admin-topbar">
        <div><small>{session?`แอดมิน LINE • ${session.displayName}`:"กำลังเชื่อม LINE"}</small><h1>กล่องรับจาก OA</h1></div>
        <Link href="/admin/backoffice">ดูรายงานหลังบ้าน →</Link>
      </header>

      {loading&&<p>กำลังโหลด...</p>}
      {error&&<div className="admin-error">{error}<br/><button type="button" onClick={load}>ลองใหม่</button></div>}

      <div className="submission-grid">
        {rows.map(row=><article className="submission-card" key={row.id}>
          <div className="submission-head">
            <div><h2>{row.member_name}</h2><small>{row.reference_code}</small></div>
            <b>{row.status}</b>
          </div>

          <div className="submission-items">
            {row.items.map(item=><div key={item.id}>
              <b>{item.value}</b><span>{item.category_label}</span><strong>{Number(item.heart).toLocaleString()}</strong>
            </div>)}
          </div>

          <div className="submission-total">
            <span>{row.item_count} รายการ</span><b>รวม {Number(row.total).toLocaleString()}</b>
          </div>

          <div className="submission-actions">
            <button type="button" disabled={working===row.id} onClick={()=>setStatus(row.id,"pending")}>รอตรวจ</button>
            <button type="button" disabled={working===row.id} onClick={()=>setStatus(row.id,"reviewed")}>ตรวจแล้ว</button>
            <button type="button" disabled={working===row.id} onClick={()=>setStatus(row.id,"cancelled")}>ยกเลิก</button>
          </div>

          <div style={{padding:"0 14px 14px"}}>
            <button
              type="button"
              className="red-action"
              disabled={Boolean(row.imported_at)||working===row.id}
              onClick={()=>reviewOrImport(row)}
            >
              {row.imported_at
                ?"นำเข้าหลังบ้านแล้ว"
                :working===row.id
                  ?"กำลังดำเนินการ..."
                  :row.status==="reviewed"
                    ?"นำเข้าหลังบ้าน"
                    :"ตรวจรายการก่อนนำเข้า"}
            </button>
          </div>
        </article>)}
      </div>
    </section>
  </main>
}
