"use client"

import { useEffect, useMemo, useState } from "react"
import { ensureLineAdminSession, type ClientAdminSession } from "../../../lib/line-admin-client"

type Tenant={
 tenant_key:string
 display_name:string
 status:"active"|"locked"|"expired"
 line_channel_id?:string|null
 line_liff_id?:string|null
 isolation_ready?:boolean|null
 expires_at?:string|null
}
type AdminRequest={tenant_key:string;tenant_name?:string;line_user_id:string;display_name:string;requested_at?:string}
type SortKey="name"|"expiry"|"status"

function dateText(value?:string|null){if(!value)return "ไม่กำหนด";return new Intl.DateTimeFormat("th-TH",{timeZone:"Asia/Bangkok",day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(value))}
function dateInputValue(value?:string|null){return value?value.slice(0,10):""}
function remainingDays(value?:string|null){return value?Math.ceil((new Date(value).getTime()-Date.now())/86400000):null}
function useIsMobile(){
 const [mobile,setMobile]=useState(false)
 useEffect(()=>{
  const check=()=>setMobile(window.innerWidth<860)
  check();window.addEventListener("resize",check)
  return ()=>window.removeEventListener("resize",check)
 },[])
 return mobile
}

export default function TenantOAPage(){
 const [session,setSession]=useState<ClientAdminSession|null>(null)
 const [rows,setRows]=useState<Tenant[]>([])
 const [adminRequests,setAdminRequests]=useState<AdminRequest[]>([])
 const [expiryDraft,setExpiryDraft]=useState<Record<string,string>>({})
 const [channelDraft,setChannelDraft]=useState<Record<string,string>>({})
 const [liffDraft,setLiffDraft]=useState<Record<string,string>>({})
 const [tokenDraft,setTokenDraft]=useState<Record<string,string>>({})
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[working,setWorking]=useState("")
 const [form,setForm]=useState({tenantKey:"",displayName:"",lineChannelId:"",lineLiffId:"",lineChannelAccessToken:"",expiresAt:""})
 const [search,setSearch]=useState("")
 const [sortKey,setSortKey]=useState<SortKey>("name")
 const isMobile=useIsMobile()

 function syncDrafts(nextRows:Tenant[],onlyKeys?:string[]){
  const keys=onlyKeys?new Set(onlyKeys):null
  setExpiryDraft(v=>{const n={...v};for(const r of nextRows)if(!keys||keys.has(r.tenant_key))n[r.tenant_key]=dateInputValue(r.expires_at);return n})
  setChannelDraft(v=>{const n={...v};for(const r of nextRows)if(!keys||keys.has(r.tenant_key))n[r.tenant_key]=r.line_channel_id||"";return n})
  setLiffDraft(v=>{const n={...v};for(const r of nextRows)if(!keys||keys.has(r.tenant_key))n[r.tenant_key]=r.line_liff_id||"";return n})
  if(!keys)setTokenDraft(v=>{const n={...v};for(const r of nextRows)if(!(r.tenant_key in n))n[r.tenant_key]="";return n})
 }

 async function load(onlySyncKeys?:string[]){
  if(!onlySyncKeys)setLoading(true)
  setError("")
  try{
   const current=await ensureLineAdminSession();setSession(current)
   if(current.role!=="owner"&&current.role!=="super_admin")throw new Error("หน้านี้สำหรับแอดมินหลักเท่านั้น")
   const response=await fetch("/api/super-admin/oa",{credentials:"same-origin",cache:"no-store"})
   const data=await response.json().catch(()=>({}))
   if(!response.ok||!data.ok)throw new Error(data.error||"โหลดสมาชิก OA ไม่สำเร็จ")
   const nextRows:Tenant[]=data.rows||[]
   setRows(nextRows);setAdminRequests(data.adminRequests||[])
   // สำคัญ: reload บางส่วนหลังทำ action จะ sync
