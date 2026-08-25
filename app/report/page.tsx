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
 const [uploading,setUploading]=useState("")
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState("")

 useEffect(()=>{(async()=>{
  try{
   const line=await initLIFF()
   if(!line)return
   setLineUserId(line.profile.userId)
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


 async function attachImage(row:Row,file:File|null){
  if(!file||!lineUserId||uploading)return
  if(file.size>5*1024*1024){setError("รูปต้องไม่เกิน 5 MB");return}
  setUploading(row.id);setError("")
  try{
   const ext=(file.name.split(".").pop()||"jpg").toLowerCase()
   const safeExt=["jpg","jpeg","png","webp"].includes(ext)?ext:"jpg"
   const path=`member-report/${lineUserId}/${row.id}-${Date.now()}.${safeExt}`
   const supabase=createClient()
   const up=await supabase.storage.from("lekhub-uploads").upload(path,file,{upsert:false,contentType:file.type||"image/jpeg"})
   if(up.error)throw new Error(up.error.message)
   const url=supabase.storage.from("lekhub-uploads").getPublicUrl(path).data.publicUrl
   const saved=await supabase.rpc("lekhub_member_set_submission_attachment",{p_line_user_id:lineUserId,p_submission_id:row.id,p_attachment_url:url})
   if(saved.error)throw new Error(saved.error.message)
   setRows(v=>v.map(x=>x.id===row.id?{...x,attachment_url:url}:x))
  }catch(caught){setError(caught instanceof Error?caught.message:"แนบภาพไม่สำเร็จ")}
  finally{setUploading("")}
 }

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

   <label style={{display:"block",marginTop:"12px",fontWeight:700}}>
    แนบภาพในรายงาน
    <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading===row.id} onChange={e=>attachImage(row,e.target.files?.[0]||null)}/>
   </label>
   {uploading===row.id&&<small>กำลังบันทึกภาพ...</small>}
   {row.attachment_url&&<a href={row.attachment_url} target="_blank" rel="noreferrer" style={{display:"block",marginTop:"10px"}}>
    <img src={row.attachment_url} alt="ภาพแนบ" style={{width:"96px",height:"96px",objectFit:"cover",borderRadius:"8px"}}/>
   </a>}
  </section>)}
 </main>
}
