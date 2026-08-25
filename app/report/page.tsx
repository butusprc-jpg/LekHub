"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { initLIFF } from "../../lib/liff"
import { createClient } from "../../lib/supabase/client"

type ReportItem={id:number;value:string;category_label:string;heart:number;cash?:boolean}
type Row={
 id:string
 reference_code:string
 status:string
 item_count:number
 total:number
 created_at:string
 attachment_url?:string|null
 items:ReportItem[]
}

function dateTime(value:string){
 return new Intl.DateTimeFormat("th-TH",{
  timeZone:"Asia/Bangkok",
  day:"2-digit",month:"2-digit",year:"numeric",
  hour:"2-digit",minute:"2-digit"
 }).format(new Date(value))
}

export default function Report(){
 const [rows,setRows]=useState<Row[]>([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState("")

 useEffect(()=>{(async()=>{
  try{
   const line=await initLIFF()
   if(!line)return
   const {data,error}=await createClient().rpc("lekhub_member_list_submissions",{
    p_line_user_id:line.profile.userId,
    p_limit:300,
   })
   if(error)throw new Error(error.message)
   setRows((data||[]) as Row[])
  }catch(caught){
   setError(caught instanceof Error?caught.message:"โหลดรายงานไม่สำเร็จ")
  }finally{setLoading(false)}
 })()},[])

 return <main className="member-shell">
  <header className="member-header">
   <Link href="/member" className="back-link">‹</Link>
   <div><small>LEKHUB MEMBER</small><h1>รายงาน</h1></div>
  </header>

  {loading&&<section className="member-card"><p>กำลังโหลด...</p></section>}
  {error&&<section className="member-card"><p>{error}</p></section>}

  {!loading&&!error&&!rows.length&&<section className="member-card"><p>ยังไม่มีรายการที่ส่ง</p></section>}

  {rows.map(row=><section className="member-card" key={row.id} style={{marginBottom:"14px"}}>
   <div style={{display:"flex",justifyContent:"space-between",gap:"12px"}}>
    <div><b>{row.reference_code}</b><small style={{display:"block"}}>{dateTime(row.created_at)}</small></div>
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
   {row.attachment_url&&<a href={row.attachment_url} target="_blank" rel="noreferrer" style={{display:"inline-block",marginTop:"10px"}}>ดูภาพแนบ</a>}
  </section>)}
 </main>
}
