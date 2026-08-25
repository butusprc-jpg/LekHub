"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  adminRpc,
  clearClientAdminSession,
  ensureLineAdminSession,
  type ClientAdminSession,
} from "../../../lib/line-admin-client"

const TYPE_LABELS=[
 ["3topmix","3 บนสลับ"],
 ["3top","3 บน"],
 ["2top","2 บน"],
 ["single","วิ่งบน"],
 ["bottom","2 ล่าง"],
] as const


function displayRoundInput(value?:string|null){
 if(!value)return ""
 const [y,m,d]=value.slice(0,10).split("-").map(Number)
 if(!y||!m||!d)return ""
 return `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${String((y+543)%100).padStart(2,"0")}`
}
function parseRoundInput(value:string){
 const m=value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
 if(!m)return null
 const d=Number(m[1]),mon=Number(m[2]); let y=Number(m[3])
 if(m[3].length===2)y=2500+y-543
 else if(y>=2400)y-=543
 const dt=new Date(Date.UTC(y,mon-1,d))
 if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==mon-1||dt.getUTCDate()!==d)return null
 return `${String(y).padStart(4,"0")}-${String(mon).padStart(2,"0")}-${String(d).padStart(2,"0")}`
}
export default function SettingsPage(){
 const [session,setSession]=useState<ClientAdminSession|null>(null)
 const [accepting,setAccepting]=useState(true)
 const [closeTime,setCloseTime]=useState("23:59")
 const [amounts,setAmounts]=useState<Record<string,string>>({})
 const [blocked,setBlocked]=useState("")
 const [blockedEnabled,setBlockedEnabled]=useState(true)
 const [cashPercent,setCashPercent]=useState("0")
 const [roundDateInput,setRoundDateInput]=useState("")
 const [loading,setLoading]=useState(true)
 const [saving,setSaving]=useState(false)
 const [message,setMessage]=useState("กำลังตรวจสอบสิทธิ์ LINE...")
 const [error,setError]=useState("")

 async function load(){
  setLoading(true);setError("")
  try{
   const current=await ensureLineAdminSession()
   setSession(current)
   const {data,error}=await adminRpc(current,"lekhub_line_admin_get_settings")
   if(error)throw new Error(error.message)
   setAccepting(Boolean(data?.accepting))
   setCloseTime(String(data?.close_time||"23:59").slice(0,5))
   const next:Record<string,string>={}
   for(const [key] of TYPE_LABELS)next[key]=String(Number(data?.category_amounts?.[key]||0)||"")
   setAmounts(next)
   setBlocked(Array.isArray(data?.blocked_values)?data.blocked_values.join(", "):"")
   setBlockedEnabled(Boolean(data?.blocked_enabled))
   setCashPercent(String(Number(data?.cash_percent||0)))
   setRoundDateInput(displayRoundInput(data?.round_date_override||""))
   setMessage(`เข้าระบบแล้ว: ${current.displayName}`)
  }catch(caught){
   setError(caught instanceof Error?caught.message:"เข้าตั้งค่าไม่สำเร็จ")
   setMessage("")
  }finally{setLoading(false)}
 }

 useEffect(()=>{load()},[])

 async function save(){
  if(!session||saving)return
  const pct=Number(cashPercent)
  if(!Number.isFinite(pct)||pct<0||pct>100){
   setError("เปอร์เซ็นต์สดต้องอยู่ระหว่าง 0 ถึง 100")
   return
  }

  const parsedRound=roundDateInput.trim()?parseRoundInput(roundDateInput):null
  if(roundDateInput.trim()&&!parsedRound){setError("รอบวันที่ต้องเป็นรูปแบบ วัน/เดือน/ปี เช่น 02/08/69");return}
  setSaving(true);setError("");setMessage("กำลังบันทึก...")
  try{
   const categoryAmounts=Object.fromEntries(
    TYPE_LABELS.map(([key])=>[key,Math.max(0,Number(amounts[key]||0)||0)])
   )

   const {data,error}=await adminRpc(session,"lekhub_line_admin_update_settings",{
    p_accepting:accepting,
    p_close_time:closeTime||null,
    p_category_amounts:categoryAmounts,
    p_cash_percent:pct,
    p_blocked_enabled:blockedEnabled,
    p_round_date:parsedRound,
   })
   if(error)throw new Error(error.message)
   if(!data?.success)throw new Error("บันทึกการตั้งค่าไม่สำเร็จ")

   const values=[...new Set(
    blocked.split(/[,\s]+/).map(v=>v.replace(/\D/g,"")).filter(Boolean)
   )]
   const blockedResult=await adminRpc(session,"lekhub_line_admin_replace_blocked_values",{p_values:values})
   if(blockedResult.error)throw new Error(blockedResult.error.message)

   setMessage("บันทึกการตั้งค่าแล้ว")
  }catch(caught){
   setError(caught instanceof Error?caught.message:"บันทึกไม่สำเร็จ")
   setMessage("")
  }finally{setSaving(false)}
 }

 function logout(){
  clearClientAdminSession()
  window.location.replace("/admin/login?next=/admin/settings")
 }

 return <main className="admin-shell">
  <aside className="admin-sidebar">
   <div className="admin-brand"><span>LH</span><div><b>LekHub</b><small>OA BACKOFFICE</small></div></div>
   <nav>
    <Link href="/admin">ภาพรวม</Link>
    <Link href="/admin/reports">กล่องรับ</Link>
    <Link href="/admin/backoffice">ตารางกิจกรรม</Link>
    <Link className="active" href="/admin/settings">ตั้งค่าระบบ</Link>
   </nav>
   <button type="button" onClick={logout}>ออกจากระบบ</button>
  </aside>

  <section className="admin-content">
   <header className="admin-topbar">
    <div><small>{session?`แอดมิน LINE • ${session.displayName}`:"กำลังเชื่อม LINE"}</small><h1>ตั้งค่าระบบ</h1></div>
   </header>

   {message&&<div className="admin-success">{message}</div>}
   {error&&<div className="admin-error">{error}</div>}

   <section className="settings-card" style={{display:"grid",gap:"20px"}}>
    <label className="toggle-row">
     <div><b>เปิด / ปิดรับรายการ</b><small>ปิดแล้วสมาชิกจะส่งรายการไม่ได้</small></div>
     <input type="checkbox" checked={accepting} disabled={loading||!session||saving} onChange={e=>setAccepting(e.target.checked)}/>
    </label>

    <label>
     <b>เวลาปิดรับ</b>
     <input type="time" value={closeTime} disabled={loading||!session||saving} onChange={e=>setCloseTime(e.target.value)}/>
    </label>

    <div>
     <b>ค่ายอดของประเภท</b>
     <div style={{display:"grid",gap:"10px",marginTop:"10px"}}>
      {TYPE_LABELS.map(([key,label])=><label key={key} style={{display:"grid",gridTemplateColumns:"1fr 140px",gap:"12px",alignItems:"center"}}>
       <span>{label}</span>
       <input inputMode="numeric" pattern="[0-9]*" value={amounts[key]||""} onChange={e=>setAmounts(v=>({...v,[key]:e.target.value.replace(/\D/g,"")}))}/>
      </label>)}
     </div>
    </div>

    <div>
     <label className="toggle-row">
      <div><b>ห้ามเลือก</b><small>เปิด = แสดงเลขงดที่หน้าเล่นและบังคับห้ามเลือก</small></div>
      <input type="checkbox" checked={blockedEnabled} disabled={loading||!session||saving} onChange={e=>setBlockedEnabled(e.target.checked)}/>
     </label>
     <label>
      <small style={{display:"block"}}>ใส่หลายเลขได้ คั่นด้วยเว้นวรรคหรือเครื่องหมายจุลภาค</small>
      <textarea value={blocked} rows={3} onChange={e=>setBlocked(e.target.value)} placeholder="เช่น 123, 45, 7"/>
     </label>
    </div>

    <label>
     <b>หักยอดเมื่อเลือก “สด” (%)</b>
     <input inputMode="decimal" value={cashPercent} onChange={e=>setCashPercent(e.target.value.replace(/[^0-9.]/g,""))}/>
     <small style={{display:"block"}}>ตัวอย่าง 30% : ยอด 1,000 เหลือ 700</small>
    </label>

    <label>
     <b>รอบวันที่</b>
     <input inputMode="numeric" value={roundDateInput} onChange={e=>setRoundDateInput(e.target.value.replace(/[^0-9/]/g,"").slice(0,10))} placeholder="02/08/69"/>
     <small style={{display:"block"}}>เว้นว่าง = ระบบเลือกรอบวันที่ 1 หรือ 16 อัตโนมัติ</small>
    </label>

    <button type="button" onClick={save} disabled={loading||!session||saving}>
     {saving?"กำลังบันทึก...":"บันทึกการตั้งค่า"}
    </button>

    {error&&<button type="button" onClick={load}>ลองเข้าใหม่</button>}
   </section>
  </section>
 </main>
}
