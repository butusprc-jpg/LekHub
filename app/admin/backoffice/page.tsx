"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { adminRpc, ensureLineAdminSession, type ClientAdminSession } from "../../../lib/line-admin-client"

type ReportItem={id:number;value:string;category_label:string;heart:number;cash?:boolean}
type Report={id:string;reference_code:string;member_name:string;item_count:number;total:number;imported_at:string;attachment_url?:string|null;round_date?:string|null;items:ReportItem[]}
type ItemView=ReportItem&{imported_at:string;round_date?:string|null}
type MemberGroup={name:string;items:ItemView[];total:number;images:string[];rounds:string[]}
type DateGroup={dateKey:string;dateLabel:string;members:MemberGroup[];total:number}

function dateKey(value:string){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value))}
function dateLabel(value:string){return new Intl.DateTimeFormat("th-TH",{timeZone:"Asia/Bangkok",day:"numeric",month:"long",year:"numeric"}).format(new Date(value))}
function dateTime(value:string){return new Intl.DateTimeFormat("th-TH",{timeZone:"Asia/Bangkok",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value))}
function roundLabel(value?:string|null){
 if(!value)return ""
 const [y,m,d]=value.slice(0,10).split("-").map(Number)
 return `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${String((y+543)%100).padStart(2,"0")}`
}

export default function BackofficePage(){
 const [session,setSession]=useState<ClientAdminSession|null>(null)
 const [rows,setRows]=useState<Report[]>([])
 const [error,setError]=useState("")
 const [loading,setLoading]=useState(true)

 async function load(){
  setLoading(true);setError("")
  try{
   const current=await ensureLineAdminSession();setSession(current)
   const {data,error}=await adminRpc(current,"lekhub_line_admin_list_backoffice_reports",{p_limit:500})
   if(error)throw new Error(error.message)
   setRows((data||[]) as Report[])
  }catch(caught){setError(caught instanceof Error?caught.message:"โหลดตารางกิจกรรมไม่สำเร็จ")}
  finally{setLoading(false)}
 }

 useEffect(()=>{load()},[])
 useEffect(()=>{
  if(!session)return
  fetch("https://uhpgnwclyzjnmnbrnglb.supabase.co/functions/v1/lekhub-cleanup-uploads",{
   method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({adminToken:session.token})
  }).catch(()=>{})
 },[session])

 const groups=useMemo<DateGroup[]>(()=>{
  const map=new Map<string,{label:string,members:Map<string,MemberGroup>,total:number}>()
  for(const row of rows){
   const key=dateKey(row.imported_at)
   let g=map.get(key)
   if(!g){g={label:dateLabel(row.imported_at),members:new Map(),total:0};map.set(key,g)}
   const mk=(row.member_name||"สมาชิก").trim().toLowerCase()
   let m=g.members.get(mk)
   if(!m){m={name:row.member_name||"สมาชิก",items:[],total:0,images:[],rounds:[]};g.members.set(mk,m)}
   m.items.push(...(row.items||[]).map(item=>({...item,imported_at:row.imported_at,round_date:row.round_date})))
   m.total+=Number(row.total||0)
   if(row.attachment_url&&!m.images.includes(row.attachment_url))m.images.push(row.attachment_url)
   if(row.round_date&&!m.rounds.includes(row.round_date))m.rounds.push(row.round_date)
   g.total+=Number(row.total||0)
  }
  return [...map.entries()].sort(([a],[b])=>b.localeCompare(a)).map(([dateKey,g])=>({dateKey,dateLabel:g.label,members:[...g.members.values()],total:g.total}))
 },[rows])

 function csvText(){
  const lines=[["วันที่นำเข้า","รอบวันที่","ชื่อ","เลข","ประเภท","ยอด","สด","ยอดรวม"].join(",")]
  for(const g of groups)for(const m of g.members)m.items.forEach((item,index)=>{
   const cells=[dateTime(item.imported_at),item.round_date?roundLabel(item.round_date):"",m.name,item.value,item.category_label,String(Number(item.heart)||0),item.cash?"สด":"",index===0?String(m.total):""]
   lines.push(cells.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","))
  })
  return "\ufeff"+lines.join("\n")
 }

 function exportReport(){
  const blob=new Blob([csvText()],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a")
  a.href=url;a.download=`LekHub-activity-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)
 }
 async function shareReport(){
  const file=new File([csvText()],`LekHub-activity-${new Date().toISOString().slice(0,10)}.csv`,{type:"text/csv"})
  if(navigator.share){
   try{
    if(navigator.canShare?.({files:[file]}))await navigator.share({title:"ตารางกิจกรรม LekHub",files:[file]})
    else await navigator.share({title:"ตารางกิจกรรม LekHub",text:"ตารางกิจกรรม LekHub"})
    return
   }catch{}
  }
  exportReport()
 }

 return <main className="admin-shell">
  <aside className="admin-sidebar">
   <div className="admin-brand"><span>LH</span><div><b>LekHub</b><small>OA BACKOFFICE</small></div></div>
   <nav><Link href="/admin">ภาพรวม</Link><Link href="/admin/reports">กล่องรับ</Link><Link className="active" href="/admin/backoffice">ตารางกิจกรรม</Link><Link href="/admin/settings">ตั้งค่าระบบ</Link></nav>
  </aside>
  <section className="admin-content">
   <header className="admin-topbar"><div><small>{session?`แอดมิน LINE • ${session.displayName}`:"กำลังเชื่อม LINE"}</small><h1>ตารางกิจกรรม</h1></div></header>
   {loading&&<p>กำลังโหลด...</p>}
   {error&&<div className="admin-error">{error}<br/><button type="button" onClick={load}>ลองใหม่</button></div>}
   <div style={{display:"flex",gap:"10px",flexWrap:"wrap",marginBottom:"18px"}}>
    <button type="button" onClick={exportReport}>ส่งออกรายงาน</button>
    <button type="button" onClick={shareReport}>แชร์</button>
    <button type="button" onClick={()=>window.print()}>ปริ้น</button>
   </div>

   {groups.map(group=><section key={group.dateKey} style={{marginBottom:"28px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"16px",marginBottom:"10px"}}>
     <div><h2 style={{margin:0}}>{group.dateLabel}</h2><small>{[...new Set(group.members.flatMap(m=>m.rounds))].map(x=>`รอบวันที่ ${roundLabel(x)}`).join(" • ")}</small></div>
     <strong>รวม {group.total.toLocaleString()}</strong>
    </div>
    <div style={{overflowX:"auto"}}>
     <table style={{width:"100%",borderCollapse:"collapse",minWidth:"820px",tableLayout:"fixed"}}>
      <thead><tr>
       <th style={{textAlign:"left",padding:"10px"}}>ชื่อ</th><th style={{textAlign:"left",padding:"10px"}}>วันเวลา</th><th style={{textAlign:"left",padding:"10px"}}>เลข</th>
       <th style={{textAlign:"left",padding:"10px"}}>ประเภท</th><th style={{textAlign:"right",padding:"10px"}}>ยอด</th><th style={{textAlign:"center",padding:"10px"}}>สด</th>
       <th style={{textAlign:"right",padding:"10px"}}>ยอดรวม</th><th style={{textAlign:"center",padding:"10px"}}>ภาพ</th>
      </tr></thead>
      <tbody>
       {group.members.map(member=>member.items.map((item,index)=><tr key={`${group.dateKey}-${member.name}-${item.id}-${index}`}>
        {index===0&&<td rowSpan={member.items.length} style={{verticalAlign:"top",padding:"12px",fontWeight:700}}>{member.name}{!!member.rounds.length&&<small style={{display:"block",marginTop:"4px"}}>{member.rounds.map(x=>`รอบวันที่ ${roundLabel(x)}`).join(" • ")}</small>}</td>}
        <td style={{padding:"12px",fontWeight:700}}>{dateTime(item.imported_at)}</td><td style={{padding:"12px",fontWeight:700}}>{item.value}</td>
        <td style={{padding:"12px",fontWeight:700}}>{item.category_label}</td><td style={{padding:"12px",textAlign:"right",fontWeight:700}}>{Number(item.heart).toLocaleString()}</td>
        <td style={{padding:"12px",textAlign:"center",fontWeight:700}}>{item.cash?"สด":"-"}</td>
        {index===0&&<td rowSpan={member.items.length} style={{verticalAlign:"top",padding:"12px",textAlign:"right",fontWeight:700}}>{member.total.toLocaleString()}</td>}
        {index===0&&<td rowSpan={member.items.length} style={{verticalAlign:"top",padding:"8px",textAlign:"center"}}><div style={{display:"flex",flexWrap:"wrap",gap:"6px",justifyContent:"center"}}>
         {member.images.map(url=><a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt="ภาพแนบ" style={{width:"48px",height:"48px",objectFit:"cover",borderRadius:"6px"}}/></a>)}
         {!member.images.length&&<span>-</span>}
        </div></td>}
       </tr>))}
      </tbody>
     </table>
    </div>
   </section>)}
  </section>
 </main>
}
