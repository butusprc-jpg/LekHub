"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { initLIFF } from "../../lib/liff"
import { createClient } from "../../lib/supabase/client"

type ReportItem={id:number;value:string;category_label:string;heart:number;cash?:boolean}
type RewardItem={selected_value:string;category_label:string;stake:number;multiplier:number;reward_amount:number;prize_number:string}
type Row={
 id:string
 reference_code:string
 status:string
 item_count:number
 total:number
 created_at:string
 attachment_url?:string|null
 round_date?:string|null
 reward_total?:number
 rewards?:RewardItem[]
 items:ReportItem[]
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

export default function Report(){
 const [rows,setRows]=useState<Row[]>([])
 const [lineUserId,setLineUserId]=useState("")
 const [note,setNote]=useState("")
 const [noteSaving,setNoteSaving]=useState(false)
 const [noteEditing,setNoteEditing]=useState(true)
 const [noteMessage,setNoteMessage]=useState("")
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState("")

 useEffect(()=>{(async()=>{
  try{
   let userId=""
   const cached=sessionStorage.getItem("lekhub_member_liff_profile")
   if(cached){
    try{
     const parsed=JSON.parse(cached) as {userId?:string;savedAt?:number}
     if(parsed.userId&&parsed.savedAt&&Date.now()-parsed.savedAt<10*60*1000)userId=String(parsed.userId)
    }catch{}
   }
   if(!userId){
    const line=await initLIFF()
    if(!line)return
    userId=line.profile.userId
    sessionStorage.setItem("lekhub_member_liff_profile",JSON.stringify({
     userId:line.profile.userId,
     displayName:line.profile.displayName,
     pictureUrl:line.profile.pictureUrl||"",
     savedAt:Date.now(),
    }))
   }
   setLineUserId(userId)
   const supabase=createClient()
   const noteResult=await supabase.rpc("lekhub_member_get_note",{p_line_user_id:userId})
   if(noteResult.error)throw new Error(noteResult.error.message)
   const loadedNote=String(noteResult.data?.note||"")
   setNote(loadedNote)
   setNoteEditing(!loadedNote)
   const {data,error}=await supabase.rpc("lekhub_member_list_submissions",{
    p_line_user_id:userId,
    p_limit:300,
   })
   if(error)throw new Error(error.message)
   setRows((data||[]) as Row[])
  }catch(caught){
   setError(caught instanceof Error?caught.message:"โหลดรายงานไม่สำเร็จ")
  }finally{setLoading(false)}
 })()},[])

 async function saveNote(){
  if(!lineUserId||noteSaving)return
  setNoteSaving(true);setNoteMessage("");setError("")
  try{
   const {data,error}=await createClient().rpc("lekhub_member_set_note",{p_line_user_id:lineUserId,p_note:note})
   if(error)throw new Error(error.message)
   if(!data?.success)throw new Error("บันทึกข้อความไม่สำเร็จ")
   setNote(String(data.note||""))
   setNoteEditing(false)
   setNoteMessage("บันทึกแล้ว")
  }catch(caught){setError(caught instanceof Error?caught.message:"บันทึกข้อความไม่สำเร็จ")}
  finally{setNoteSaving(false)}
 }

 function reportText(row:Row){
  const lines=[
   "รายงาน LekHub",
   `เลขอ้างอิง: ${row.reference_code}`,
   `วันที่: ${dateTime(row.created_at)}`,
  ]
  if(row.round_date)lines.push(`รอบวันที่: ${roundLabel(row.round_date)}`)
  lines.push("")
  for(const item of row.items){
   lines.push(`${item.value} | ${item.category_label}${item.cash?" สด":""} | ${Number(item.heart).toLocaleString()}`)
  }
  lines.push("")
  lines.push(`${row.item_count} รายการ | รวม ${Number(row.total).toLocaleString()}`)
  if(Number(row.reward_total||0)>0){
   lines.push(`ยอดรางวัลรวม ${Number(row.reward_total||0).toLocaleString()}`)
  }
  if(note.trim()){
   lines.push("")
   lines.push(`ข้อความสมาชิก: ${note.trim()}`)
  }
  return lines.join("\n")
 }

 async function shareReport(row:Row){
  const text=reportText(row)
  setError("")
  try{
   const line=await initLIFF().catch(()=>null)
   if(line?.liff.shareTargetPicker){
    await line.liff.shareTargetPicker([{type:"text",text}],{isMultiple:true})
    return
   }

   if(typeof navigator.share==="function"){
    await navigator.share({title:`LekHub ${row.reference_code}`,text})
    return
   }

   if(navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(text)
    window.alert("คัดลอกรายงานแล้ว สามารถนำไปวางใน LINE ได้เลย")
    return
   }

   const area=document.createElement("textarea")
   area.value=text
   area.style.position="fixed"
   area.style.opacity="0"
   document.body.appendChild(area)
   area.focus();area.select()
   document.execCommand("copy")
   area.remove()
   window.alert("คัดลอกรายงานแล้ว สามารถนำไปวางใน LINE ได้เลย")
  }catch(caught){
   if(caught instanceof DOMException&&caught.name==="AbortError")return
   const message=caught instanceof Error?caught.message:"share_failed"
   setError(`แชร์รายงานไม่สำเร็จ: ${message}`)
  }
 }

 return <main className="member-shell">
  <header className="member-header">
   <Link href="/member" className="back-link">‹</Link>
   <div><small>LEKHUB MEMBER</small><h1>รายงาน</h1></div>
  </header>

  {loading&&<section className="member-card"><p>กำลังโหลด...</p></section>}
  {error&&<section className="member-card"><p>{error}</p></section>}

  {!loading&&!error&&!rows.length&&<section className="member-card"><p>ยังไม่มีรายการที่ส่ง</p></section>}

  {!loading&&!error&&<section className="member-card" style={{marginBottom:"14px"}}>
   <b>ข้อความสมาชิก</b>
   <textarea
    rows={6}
    value={note}
    disabled={!noteEditing}
    onChange={e=>setNote(e.target.value)}
    placeholder="กรอกข้อความที่ต้องการบันทึก"
    style={{width:"100%",marginTop:"8px",boxSizing:"border-box",background:noteEditing?"#fff":"#e5e7eb",color:"#111",opacity:1}}
   />
   <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"8px"}}>
    {noteEditing?
     <button type="button" onClick={saveNote} disabled={noteSaving||!lineUserId}>{noteSaving?"กำลังบันทึก...":"บันทึกข้อความ"}</button>
     :
     <button type="button" onClick={()=>{setNoteEditing(true);setNoteMessage("")}}>แก้ไข</button>
    }
   </div>
   {noteMessage&&<small style={{display:"block",marginTop:"6px"}}>{noteMessage}</small>}
  </section>}

  {rows.map(row=><section className="member-card" key={row.id} style={{marginBottom:"14px"}}>
   <div style={{display:"flex",justifyContent:"space-between",gap:"12px"}}>
    <div><b>{row.reference_code}</b><small style={{display:"block"}}>{dateTime(row.created_at)}</small>{row.round_date&&<small style={{display:"block"}}>รอบวันที่ {roundLabel(row.round_date)}</small>}</div>
    <strong>{row.status}</strong>
   </div>

   <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr 1fr",gap:"10px",fontWeight:700,marginTop:"12px"}}>
    <span>เลข</span><span>ประเภท</span><span style={{textAlign:"right"}}>ยอด</span>
   </div>
   {row.items.map((item,index)=><div key={`${item.id}-${index}`} style={{display:"grid",gridTemplateColumns:"1fr 1.4fr 1fr",gap:"10px",padding:"7px 0"}}>
    <b>{item.value}</b><b>{item.category_label}{item.cash?" สด":""}</b><b style={{textAlign:"right"}}>{Number(item.heart).toLocaleString()}</b>
   </div>)}

   <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #ddd",paddingTop:"10px",marginTop:"6px"}}>
    <b>{row.item_count} รายการ</b><strong>รวม {Number(row.total).toLocaleString()}</strong>
   </div>

   {!!Number(row.reward_total||0)&&<div style={{marginTop:"12px",padding:"12px",border:"1px solid #ddd",borderRadius:"10px"}}>
    <b>ถูกรางวัลกิจกรรม</b>
    {(row.rewards||[]).map((reward,index)=><div key={index} style={{display:"grid",gridTemplateColumns:"1fr 1.2fr 1fr",gap:"8px",paddingTop:"6px"}}>
     <span>{reward.selected_value} {reward.category_label}</span>
     <span>{Number(reward.stake).toLocaleString()} × {Number(reward.multiplier).toLocaleString()}</span>
     <strong style={{textAlign:"right"}}>{Number(reward.reward_amount).toLocaleString()}</strong>
    </div>)}
    <div style={{textAlign:"right",fontWeight:800,marginTop:"8px"}}>ยอดรางวัลรวม {Number(row.reward_total||0).toLocaleString()}</div>
   </div>}

   <button type="button" onClick={()=>shareReport(row)} style={{width:"100%",marginTop:"12px"}}>แชร์รายงาน</button>
  </section>)}
 </main>
}
