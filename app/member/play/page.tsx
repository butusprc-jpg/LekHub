"use client"
import { useEffect, useMemo, useState } from "react"
import { initLIFF, type LiffClient, type LineProfile } from "../../../lib/liff"
import { createClient } from "../../../lib/supabase/client"

type Item={value:string;category:string;category_label:string;heart:number}
const types=[["3topmix","3 ตัวบน + สลับ"],["3top","3 ตัวบน"],["2top","2 ตัวบน"],["single","วิ่งบน"],["bottom","2 ตัวล่าง"]]

export default function PlayPage(){
 const [profile,setProfile]=useState<LineProfile|null>(null),[liff,setLiff]=useState<LiffClient|null>(null)
 const [value,setValue]=useState(""),[category,setCategory]=useState("3topmix"),[amount,setAmount]=useState("")
 const [items,setItems]=useState<Item[]>([]),[message,setMessage]=useState("กำลังโหลดชื่อ LINE...")
 const [sending,setSending]=useState(false),[open,setOpen]=useState(true)
 const [reviewing,setReviewing]=useState(false),[cash,setCash]=useState(false)

 useEffect(()=>{
  localStorage.removeItem("lekhub_member_name")
  localStorage.removeItem("lekhub_member_key")
  setItems([])
  initLIFF()
   .then(async line=>{
    if(line){
     setProfile(line.profile)
     setLiff(line.liff)
     const openingAdmin=await openAdminFromLiff(line)
     if(!openingAdmin)setMessage("")
    }
   })
   .catch(()=>setMessage("กรุณาเปิดผ่าน LINE OA"))
  createClient().rpc("get_lekhub_public_status").then(({data})=>{
   if(data&&typeof data==="object"){
    if("is_open" in data)setOpen(Boolean(data.is_open))
   }
  },()=>{})
 },[])


 async function openAdminFromLiff(line:{liff:LiffClient;profile:LineProfile}){
  const params=new URLSearchParams(window.location.search)
  const adminTarget=params.get("admin")
  if(!adminTarget)return false

  const accessToken=line.liff.getAccessToken()
  if(!accessToken){
   setMessage("ไม่พบ LINE access token สำหรับเข้าหลังบ้าน")
   return true
  }

  setMessage(`กำลังเข้าหลังบ้าน: ${line.profile.displayName}`)
  const response=await fetch("/api/admin/line-login",{
   method:"POST",
   headers:{"content-type":"application/json"},
   credentials:"same-origin",
   cache:"no-store",
   body:JSON.stringify({accessToken}),
  })
  const result=await response.json().catch(()=>({}))
  if(!response.ok||!result.ok||!result.sessionToken){
   setMessage(result.error==="line_user_not_admin"?"LINE นี้ไม่มีสิทธิ์เข้าหลังบ้าน":`เข้าหลังบ้านไม่สำเร็จ: ${result.error||"unknown"}`)
   return true
  }

  // Do not rely on embedded-browser cookies. Persist the bearer session client-side.
  localStorage.setItem("lekhub_line_admin_token",String(result.sessionToken))

  const focus=params.get("focus")
  const next=
   adminTarget==="settings"?"/admin/settings":
   adminTarget==="backoffice"?"/admin/backoffice":
   focus?`/admin/reports?focus=${encodeURIComponent(focus)}`:
   "/admin/reports"

  window.location.replace(next)
  return true
 }

 const total=useMemo(()=>items.reduce((s,x)=>s+x.heart,0),[items])

 function add(){
  const number=value.replace(/\D/g,"")
  const rawParts=amount.split(/[x×]/i).map(x=>x.trim()).filter(Boolean)
  const parts=rawParts.map(x=>Number(x))

  if(category==="single"&&!/^\d$/.test(number)){
   setMessage("วิ่งบนใส่ได้แค่เลขเดียว")
   return
  }

  if(category!=="single"&&!/^\d{1,6}$/.test(number)){
   setMessage("กรุณากรอกเลขให้ครบ")
   return
  }

  if(!rawParts.length||parts.some((n,i)=>!/^\d+$/.test(rawParts[i])||n<=0||n%10!==0)){
   setMessage("ยอดต้องเป็นจำนวนเต็มและลงท้ายด้วย 0 เท่านั้น")
   return
  }
  const added:Item[]=category==="3topmix"&&parts.length>1
   ?[
     {value:number,category:"3top",category_label:"3 ตัวบน",heart:parts[0]},
     {value:number,category:"3topmix",category_label:"3 ตัวสลับ",heart:parts[1]}
    ]
   :[{value:number,category,category_label:types.find(x=>x[0]===category)?.[1]||category,heart:parts[0]}]
  setItems(v=>[...v,...added])
  setValue("")
  setAmount("")
  setMessage("")
 }

 function openReview(){
  if(!items.length){
   setMessage("กรุณาเพิ่มรายการก่อนทบทวน")
   return
  }
  setMessage("")
  setReviewing(true)
 }

 function fallbackUserId(){
  const key="lekhub_web_user_id"
  let id=localStorage.getItem(key)
  if(!id){
   id=`web-${crypto.randomUUID()}`
   localStorage.setItem(key,id)
  }
  return id
 }

 async function submit(){
  if(!items.length||sending)return
  if(!open){setMessage("ระบบปิดรับรายการอยู่ กรุณาเข้าเมนูตั้งค่าแล้วเปิดรับรายการ");return}
  setSending(true)
  setMessage("กำลังบันทึก...")
  const activeLiff=liff
  const memberName=profile?.displayName||"สมาชิก"
  const memberUserId=profile?.userId||fallbackUserId()
  const code=`SL-${Date.now().toString(36).toUpperCase()}`

  const {data,error}=await createClient().rpc("submit_lekhub_submission",{
   p_reference_code:code,
   p_line_user_id:memberUserId,
   p_member_name:memberName,
   p_member_avatar:profile?.pictureUrl||null,
   p_items:items
  })

  if(error||!data?.success){
   const raw=String(error?.message||data?.reason||"")
   const friendly=
    raw.includes("not_accepting") ? "ระบบปิดรับรายการอยู่ กรุณาเข้าเมนูตั้งค่าแล้วเปิดรับรายการ" :
    raw.includes("rate_limited") ? "ส่งรายการถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" :
    raw.includes("blocked_value") ? "มีเลขที่ระบบตั้งค่าไม่รับ กรุณาตรวจรายการ" :
    raw || "บันทึกไม่สำเร็จ กรุณาลองใหม่"
   setMessage(friendly)
   setSending(false)
   return
  }

  if(activeLiff&&profile){
   try{
    await activeLiff.sendMessages([{
    type:"flex",
    altText:`รายการใหม่ ${code} รวม ${total}`,
    contents:{
     type:"bubble",
     header:{type:"box",layout:"horizontal",backgroundColor:"#B90000",paddingAll:"16px",contents:[
      {type:"text",text:"รายการเลือกเลขใหม่",color:"#FFFFFF",weight:"bold",size:"lg"},
      {type:"text",text:"รอตรวจสอบ",color:"#111111",align:"end",flex:1}
     ]},
     body:{type:"box",layout:"vertical",contents:[
      {type:"text",text:`สมาชิก  ${profile.displayName}`,weight:"bold"},
      {type:"text",text:`รหัส  ${data.reference_code||code}`,margin:"md"},
      {type:"separator",margin:"lg"},
      ...items.map(x=>({type:"box",layout:"horizontal",paddingAll:"10px",contents:[
       {type:"text",text:x.value,weight:"bold",size:"xl",flex:2},
       {type:"text",text:`${x.category_label} ${x.heart}`,size:"sm",wrap:true,flex:5}
      ]})),
      {type:"separator",margin:"md"},
      {type:"text",text:`${items.length} รายการ     รวม ${total.toLocaleString()}`,weight:"bold",size:"lg",margin:"lg",align:"center"}
     ]},
     footer:{type:"box",layout:"vertical",contents:[{
      type:"button",style:"primary",color:"#C40000",
      action:{type:"uri",label:"เปิดตรวจสอบรายการ",uri:`https://liff.line.me/${(process.env.NEXT_PUBLIC_LINE_LIFF_ID||"2011199813-swdN7h10").trim()}?admin=reports&focus=${data.id}`}
     }]}
    }
    }])
   }catch{}
  }

  setItems([])
  setValue("")
  setAmount("")
  setReviewing(false)
  setMessage(`ส่งเรียบร้อย รหัส ${data.reference_code||code}`)
  setSending(false)
 }

 function close(){
  if(liff?.closeWindow) liff.closeWindow()
  else window.location.replace("/member")
 }

 return <main className="play-mobile">
  <header className="play-title">
   <button type="button" aria-label="ปิดหน้าจอ" onClick={close}>×</button>
   <h1>เลือกเลข</h1><span/>
  </header>

  <section className="line-person">
   {profile?.pictureUrl?<img src={profile.pictureUrl} alt="รูปโปรไฟล์ LINE"/>:<div className="line-avatar">LINE</div>}
   <b>{profile?.displayName||"กำลังโหลดชื่อ LINE..."}</b>
   <strong>{open?"เปิดรับรายการ":"ปิดรับแล้ว"}</strong>
  </section>

  <section className="pick-card">
   <label>ประเภท<select value={category} onChange={e=>setCategory(e.target.value)}>
    {types.map(([k,n])=><option key={k} value={k}>{n}</option>)}
   </select></label>
   <label>เลข<input inputMode="numeric" maxLength={category==="single"?1:6} value={value} onChange={e=>setValue(e.target.value.replace(/\D/g,"").slice(0,category==="single"?1:6))}/></label>
   <label>ยอด<input inputMode="numeric" value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9x×]/gi,""))}/></label>
   
   <button type="button" className="red-action" onClick={add}>＋ เพิ่ม</button>
  </section>

  {!!items.length&&<section className="picked-list">
   {items.map((x,i)=><div key={`${x.value}-${i}`}>
    <b>{x.value}</b><span>{x.category_label} {x.heart.toLocaleString()}</span>
    <button type="button" onClick={()=>setItems(v=>v.filter((_,j)=>j!==i))}>⌫</button>
   </div>)}
  </section>}

  <section className="send-card">
   <div><b>{items.length} รายการ</b><span>รวม <strong>{total.toLocaleString()}</strong></span></div>
   <div className="review-action-row">
    <label className="cash-check">
     <input type="checkbox" checked={cash} onChange={e=>setCash(e.target.checked)}/>
     <span>สด</span>
    </label>
    <button type="button" className="red-action" onClick={openReview}>ทบทวนก่อนส่ง</button>
   </div>
   {message&&<p className="play-message">{message}</p>}
  </section>

  {reviewing&&<div className="review-overlay" role="dialog" aria-modal="true">
   <section className="review-sheet">
    <h2>ทบทวนรายการ</h2>
    <div className="review-items">
     {items.map((x,i)=><div key={`${x.value}-${i}`}>
      <b>{x.value}</b><span>{x.category_label}</span><strong>{x.heart.toLocaleString()}</strong>
     </div>)}
    </div>
    <div className="review-sum"><span>{items.length} รายการ</span><b>รวม {total.toLocaleString()}</b></div>
    {message&&<p className="play-message">{message}</p>}
    <button type="button" className="red-action" disabled={sending} onClick={submit}>
     {sending?"กำลังส่ง...":"บันทึกส่ง"}
    </button>
    <button type="button" className="review-back" disabled={sending} onClick={()=>setReviewing(false)}>กลับไปแก้ไข</button>
   </section>
  </div>}
 </main>
}
