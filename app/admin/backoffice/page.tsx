"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { adminRpc, ensureLineAdminSession, type ClientAdminSession } from "../../../lib/line-admin-client"

type ReportItem={
 id:number
 value:string
 category_label:string
 heart:number
 cash?:boolean
 imported_at?:string
}

type Report={
 id:string
 reference_code:string
 line_user_id:string
 member_name:string
 item_count:number
 total:number
 imported_at:string
 items:ReportItem[]
}

type MemberGroup={
 name:string
 items:ReportItem[]
 total:number
}

type DateGroup={
 dateKey:string
 dateLabel:string
 members:MemberGroup[]
 total:number
}

function bangkokDateKey(value:string){
 const parts=new Intl.DateTimeFormat("en-CA",{
  timeZone:"Asia/Bangkok",
  year:"numeric",month:"2-digit",day:"2-digit",
 }).formatToParts(new Date(value))
 const get=(type:string)=>parts.find(p=>p.type===type)?.value||""
 return `${get("year")}-${get("month")}-${get("day")}`
}

function thaiDate(value:string){
 return new Intl.DateTimeFormat("th-TH",{
  timeZone:"Asia/Bangkok",
  day:"numeric",month:"long",year:"numeric",
 }).format(new Date(value))
}

function thaiDateTime(value:string){
 return new Intl.DateTimeFormat("th-TH",{
  timeZone:"Asia/Bangkok",
  day:"2-digit",month:"2-digit",year:"numeric",
  hour:"2-digit",minute:"2-digit",
 }).format(new Date(value))
}

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
   const {data,error}=await adminRpc(current,"lekhub_line_admin_list_backoffice_reports",{p_limit:500})
   if(error)throw new Error(error.message)
   setRows((data||[]) as Report[])
  }catch(caught){
   setError(caught instanceof Error?caught.message:"โหลดตารางกิจกรรมไม่สำเร็จ")
  }finally{
   setLoading(false)
  }
 }

 useEffect(()=>{load()},[])

 const groups=useMemo<DateGroup[]>(()=>{
  const byDate=new Map<string,{label:string,members:Map<string,MemberGroup>,total:number}>()

  for(const report of rows){
   const dateKey=bangkokDateKey(report.imported_at)
   let date=byDate.get(dateKey)
   if(!date){
    date={label:thaiDate(report.imported_at),members:new Map(),total:0}
    byDate.set(dateKey,date)
   }

   // User requirement: repeated submissions with the same displayed name are combined.
   const memberKey=(report.member_name||"สมาชิก").trim().toLowerCase()
   let member=date.members.get(memberKey)
   if(!member){
    member={name:report.member_name||"สมาชิก",items:[],total:0}
    date.members.set(memberKey,member)
   }

   member.items.push(...(report.items||[]).map(item=>({...item,imported_at:report.imported_at})))
   member.total+=Number(report.total||0)
   date.total+=Number(report.total||0)
  }

  return [...byDate.entries()]
   .sort(([a],[b])=>b.localeCompare(a))
   .map(([dateKey,date])=>({
    dateKey,
    dateLabel:date.label,
    members:[...date.members.values()],
    total:date.total,
   }))
 },[rows])

 return <main className="admin-shell">
  <aside className="admin-sidebar">
   <div className="admin-brand"><span>LH</span><div><b>LekHub</b><small>OA BACKOFFICE</small></div></div>
   <nav>
    <Link href="/admin">ภาพรวม</Link>
    <Link href="/admin/reports">กล่องรับ</Link>
    <Link className="active" href="/admin/backoffice">ตารางกิจกรรม</Link>
    <Link href="/admin/settings">ตั้งค่าระบบ</Link>
   </nav>
  </aside>

  <section className="admin-content">
   <header className="admin-topbar">
    <div>
     <small>{session?`แอดมิน LINE • ${session.displayName}`:"กำลังเชื่อม LINE"}</small>
     <h1>ตารางกิจกรรม</h1>
    </div>
   </header>

   {loading&&<p>กำลังโหลด...</p>}
   {error&&<div className="admin-error">{error}<br/><button type="button" onClick={load}>ลองใหม่</button></div>}

   {groups.map(group=><section key={group.dateKey} style={{marginBottom:"28px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"16px",marginBottom:"10px"}}>
     <h2 style={{margin:0}}>{group.dateLabel}</h2>
     <strong>รวม {group.total.toLocaleString()}</strong>
    </div>

    <div style={{overflowX:"auto"}}>
     <table style={{width:"100%",borderCollapse:"collapse",minWidth:"720px",tableLayout:"fixed"}}>
      <colgroup>
       <col style={{width:"18%"}}/>
       <col style={{width:"16%"}}/>
       <col style={{width:"12%"}}/>
       <col style={{width:"18%"}}/>
       <col style={{width:"16%"}}/>
       <col style={{width:"12%"}}/>
       <col style={{width:"10%"}}/>
       <col style={{width:"18%"}}/>
      </colgroup>
      <thead>
       <tr>
        <th style={{textAlign:"left",padding:"10px"}}>ชื่อ</th>
        <th style={{textAlign:"left",padding:"10px"}}>วันเวลา</th>
        <th style={{textAlign:"left",padding:"10px"}}>เลข</th>
        <th style={{textAlign:"left",padding:"10px"}}>ประเภท</th>
        <th style={{textAlign:"right",padding:"10px"}}>ยอด</th>
        <th style={{textAlign:"center",padding:"10px"}}>สด</th>
        <th style={{textAlign:"right",padding:"10px"}}>ยอดรวม</th>
       </tr>
      </thead>
      <tbody>
       {group.members.map(member=>member.items.map((item,index)=><tr key={`${group.dateKey}-${member.name}-${item.id}-${index}`}>
        {index===0&&<td
         rowSpan={member.items.length}
         style={{verticalAlign:"top",padding:"12px",fontWeight:700}}
        >{member.name}</td>}
        <td style={{padding:"12px",fontWeight:700}}>{item.imported_at?thaiDateTime(item.imported_at):"-"}</td>
        <td style={{padding:"12px",fontWeight:700}}>{item.value}</td>
        <td style={{padding:"12px",fontWeight:700}}>{item.category_label}</td>
        <td style={{padding:"12px",textAlign:"right",fontWeight:700}}>{Number(item.heart).toLocaleString()}</td>
        <td style={{padding:"12px",textAlign:"center",fontWeight:700}}>{item.cash?"สด":"-"}</td>
        {index===0&&<td
         rowSpan={member.items.length}
         style={{verticalAlign:"top",padding:"12px",textAlign:"right",fontWeight:700}}
        >{member.total.toLocaleString()}</td>}
       </tr>))}
      </tbody>
     </table>
    </div>
   </section>)}
  </section>
 </main>
}
