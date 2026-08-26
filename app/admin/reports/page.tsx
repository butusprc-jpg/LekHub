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
  attachment_url?:string|null
  round_date?:string|null
  items:SubmissionItem[]
}

function dateTime(value:string){
 return new Intl.DateTimeFormat("th-TH",{
  timeZone:"Asia/Bangkok",
  day:"2-digit",month:"2-digit",year:"numeric",
  hour:"2-digit",minute:"2-digit"
 }).format(new Date(value))
}


function roundLabel(value?:string|null){
 if(!value)return ""
 const [y,m,d]=value.slice(0,10).split("-").map(Number)
 if(!y||!m||!d)return ""
 return `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${String((y+543)%100).padStart(2,"0")}`
}

export default function ReportsPage() {
  const [session,setSession]=useState<ClientAdminSession|null>(null)
  const [rows,setRows]=useState<Submission[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState("")
  const [working,setWorking]=useState("")
  const [filter,setFilter]=useState<"all"|"pending"|"reviewed">("all")
  const [focusId,setFocusId]=useState("")

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

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search)
    const status=params.get("status")
    if(status==="pending"||status==="reviewed")setFilter(status)
    setFocusId(params.get("focus")||"")
    load()
  },[])

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
        <Link href="/admin">สรุป</Link>
        <Link className="active" href="/admin/reports">รับเข้า</Link>
        <Link href="/admin/backoffice">รายงานหลังบ้าน</Link>
        <Link href="/admin/settings">ตั้งค่าระบบ</Link>
      </nav>
    </aside>

    <section className="admin-content">
      <header className="admin-topbar">
        <div><small>{session?`แอดมิน LINE • ${session.displayName}`:"กำลังเชื่อม LINE"}</small><h1>รับเข้า</h1></div>
        <Link href="/admin/backoffice">ดูรายงานหลังบ้าน →</Link>
      </header><section className="page-banner-2d"><span>📥</span><div><h2>รับเข้า</h2><p>ตรวจรายการจากสมาชิกก่อนนำเข้าหลังบ้าน</p></div></section>

      {loading&&<p>กำลังโหลด...</p>}
      {error&&<div className="admin-error">{error}<br/><button type="button" onClick={load}>ลองใหม่</button></div>}

      <div className="submission-grid">
        {rows
          .filter(row=>filter==="all"||row.status===filter)
          .map(row=><article
            className="submission-card"
            key={row.id}
            id={`submission-${row.id}`}
            style={focusId===row.id?{outline:"3px solid #C40000",outlineOffset:"2px"}:undefined}
          >
          <div className="submission-head">
            <div><h2>{row.member_name}</h2><small>{row.reference_code}</small><small style={{display:"block"}}>{dateTime(row.created_at)}</small>{row.round_date&&<small style={{display:"block"}}>รอบวันที่ {roundLabel(row.round_date)}</small>}</div>
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
          {row.attachment_url&&<div style={{padding:"0 14px 14px"}}>
            <a href={row.attachment_url} target="_blank" rel="noreferrer"><img src={row.attachment_url} alt="ภาพแนบ" style={{width:"64px",height:"64px",objectFit:"cover",borderRadius:"8px"}}/></a>
          </div>}

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
