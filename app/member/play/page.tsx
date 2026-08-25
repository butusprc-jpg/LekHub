"use client"
import { useEffect, useMemo, useState } from "react"
import { initLIFF, type LiffClient, type LineProfile } from "../../../lib/liff"
import { createClient } from "../../../lib/supabase/client"

type Item={value:string;category:string;category_label:string;heart:number}
const types=[["3topmix","3 บนสลับ"],["3top","3 บน"],["2top","2 บน"],["single","วิ่งบน"],["bottom","2 ล่าง"]]


function roundLabel(value?:string|null){
 if(!value)return ""
 const [y,m,d]=value.slice(0,10).split("-").map(Number)
 if(!y||!m||!d)return ""
 return `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${String((y+543)%100).padStart(2,"0")}`
}

export default function PlayPage(){
 const [profile,setProfile]=useState<LineProfile|null>(null),[liff,setLiff]=useState<LiffClient|null>(null)
 const [value,setValue]=useState(""),[category,setCategory]=useState("3topmix"),[amount,setAmount]=useState("")
 const [items,setItems]=useState<Item[]>([]),[message,setMessage]=useState("กำลังโหลดชื่อ LINE...")
 const [sending,setSending]=useState(false),[open,setOpen]=useState(true)
 const [reviewing,setReviewing]=useState(false),[cash,setCash]=useState(false)
 const [blockedValues,setBlockedValues]=useState<string[]>([])
 const [cashPercent,setCashPercent]=useState(0)
 const [categoryAmounts,setCategoryAmounts]=useState<Record<string,number>>({})
 const [closeTime,setCloseTime]=useState("")
 const [roundDate,setRoundDate]=useState("")
 const [attachment,setAttachment]=useState<File|null>(null)
 const [attachmentPreview,setAttachmentPreview]=useState("")

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
    if(Array.isArray(data.blocked_values))setBlockedValues(data.blocked_values.map(String))
    if(data.cash_percent!=null)setCashPercent(Number(data.cash_percent)||0)
    if(data.category_amounts&&typeof data.category_amounts==="object"){
     const next=Object.fromEntries(Object.entries(data.category_amounts).map(([k,v])=>[k,Number(v)||0]))
     setCategoryAmounts(next)
     const first=Number(next["3topmix"]||0)
     if(first>0)setAmount(String(first))
    }
    if(data.close_time)setCloseTime(String(data.close_time).slice(0,5))
    if(data.round_date)setRoundDate(String(data.round_date).slice(0,10))
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

 const rawTotal=useMemo(()=>items.reduce((s,x)=>s+x.heart,0),[items])
 const total=useMemo(
  ()=>cash?Math.round((rawTotal*(1-Math.max(0,Math.min(100,cashPercent))/100))*100)/100:rawTotal,
  [rawTotal,cash,cashPercent]
 )

 function add(){
  const number=value.replace(/\D/g,"")
  const amountText=amount.replace(/\D/g,"")

  const requiredDigits=
   category==="single" ? 1 :
   (category==="3topmix"||category==="3top") ? 3 :
   (category==="2top"||category==="bottom") ? 2 :
   0

  if(number.length!==requiredDigits){
   setMessage(
    requiredDigits===1
     ?"วิ่งบนใส่ได้แค่เลขเดียว"
     :`กรุณาใส่เลขให้ครบ ${requiredDigits} หลัก`
   )
   return
  }

  if(blockedValues.includes(number)){
   setMessage(`เลข ${number} งด`)
   return
  }

  if(!/^\d+0$/.test(amountText)||Number(amountText)<=0){
   setMessage("ยอดต้องเป็นจำนวนเต็มและลงท้ายด้วย 0 เท่านั้น")
   return
  }

  const heart=Number(amountText)
  const added:Item={
   value:number,
   category,
   category_label:types.find(x=>x[0]===category)?.[1]||category,
   heart
  }

  setItems(current=>[...current,added])
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
  let attachmentUrl:string|null=null

  if(attachment){
   const ext=(attachment.name.split(".").pop()||"jpg").toLowerCase()
   const safeExt=["jpg","jpeg","png","webp"].includes(ext)?ext:"jpg"
   const path=`${memberUserId}/${Date.now()}-${crypto.randomUUID()}.${safeExt}`
   const supabase=createClient()
   const {error:uploadError}=await supabase.storage.from("lekhub-uploads").upload(path,attachment,{
    cacheControl:"3600",
    upsert:false,
    contentType:attachment.type||"image/jpeg",
   })
   if(uploadError){
    setMessage(`อัพโหลดภาพไม่สำเร็จ: ${uploadError.message}`)
    setSending(false)
    return
   }
   attachmentUrl=supabase.storage.from("lekhub-uploads").getPublicUrl(path).data.publicUrl
  }

  const {data,error}=await createClient().rpc("submit_lekhub_submission",{
   p_reference_code:code,
   p_line_user_id:memberUserId,
   p_member_name:memberName,
   p_member_avatar:profile?.pictureUrl||null,
   p_items:items.map(x=>({...x,cash})),
   p_attachment_url:attachmentUrl
  })

  if(error||!data?.success){
   const raw=String(error?.message||data?.reason||"")
   const friendly=
    raw.includes("not_accepting") ? "ระบบปิดรับรายการอยู่ กรุณาเข้าเมนูตั้งค่าแล้วเปิดรับรายการ" :
    raw.includes("outside_accepting_time") ? "เลยเวลาปิดรับรายการแล้ว" :
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
       {type:"text",text:`${x.category_label} ${x.heart}${cash?" สด":""}`,size:"sm",wrap:true,flex:5}
      ]})),
      {type:"separator",margin:"md"},
      {type:"text",text:`${items.length} รายการ     รวม ${total.toLocaleString()}`,weight:"bold",size:"lg",margin:"lg",align:"center"}
     ]},
     footer:{type:"box",layout:"vertical",contents:[{
      type:"button",style:"primary",color:"#C40000",
      action:{type:"uri",label:"เปิดตรวจสอบรายการ",uri:`https://lek-hub.vercel.app/admin/reports?focus=${data.id}`}
     }]}
    }
    }])
   }catch{}
  }

  setItems([])
  setValue("")
  setAmount("")
  setAttachment(null)
  setAttachmentPreview("")
  setReviewing(false)
  setMessage(`ส่งเรียบร้อย รหัส ${data.reference_code||code}`)
  setSending(false)
 }

 function close(){
  if(liff?.closeWindow) liff.closeWindow()
  else window.location.replace("/member")
 }

 return <main className="play-mobile">
  <header className="play-title" style={{alignItems:"flex-start"}}>
   <button type="button" aria-label="ปิดหน้าจอ" onClick={close}>×</button>
   <div style={{flex:1}}>
    <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:"12px"}}>
     <h1 style={{margin:0}}>เลือกเลข</h1>
     <strong style={{fontSize:"14px",whiteSpace:"nowrap"}}>{roundDate?`รอบวันที่ ${roundLabel(roundDate)}`:""}</strong>
    </div>
    {!!blockedValues.length&&<div style={{marginTop:"4px",textAlign:"left"}}>
     <strong style={{fontSize:"1.5rem",lineHeight:1.2}}>เลขงด {blockedValues.join(" ")}</strong>
    </div>}
   </div>
   <span/>
  </header>

  <section className="line-person">
   {profile?.pictureUrl?<img src={profile.pictureUrl} alt="รูปโปรไฟล์ LINE"/>:<div className="line-avatar">LINE</div>}
   <b>{profile?.displayName||"กำลังโหลดชื่อ LINE..."}</b>
   <strong>{open?"เปิดรับรายการ":"ปิดรับแล้ว"}</strong>
  </section>

  <section className="pick-card">
   <label>ประเภท<select value={category} onChange={e=>{
    const next=e.target.value
    setCategory(next);setValue("");setMessage("")
    const configured=Number(categoryAmounts[next]||0)
    setAmount(configured>0?String(configured):"")
   }}>
    {types.map(([k,n])=><option key={k} value={k}>{n}</option>)}
   </select></label>
   <label>เลข<input
    inputMode="numeric"
    pattern="[0-9]*"
    maxLength={category==="single"?1:(category==="3topmix"||category==="3top")?3:2}
    value={value}
    onChange={e=>{
     const limit=category==="single"?1:(category==="3topmix"||category==="3top")?3:2
     const next=e.target.value.replace(/\D/g,"").slice(0,limit)
     if(next.length===limit&&blockedValues.includes(next)){
      setMessage(`เลข ${next} งด`)
      return
     }
     setValue(next)
     setMessage("")
    }}
   /></label>
   <label>ยอด<input inputMode="numeric" pattern="[0-9]*" value={amount} onChange={e=>{setAmount(e.target.value.replace(/\D/g,""));setMessage("")}}/></label>
   
   <button type="button" className="red-action" onClick={add}>＋ เพิ่ม</button>
   {message&&<p className="play-message">{message}</p>}
  </section>

  {!!items.length&&<section className="picked-list">
   <div
    className="picked-table-head"
    style={{display:"grid",gridTemplateColumns:"1fr 1.4fr 1fr auto",alignItems:"center",gap:"12px",fontWeight:700}}
   >
    <strong>เลข</strong>
    <strong>ประเภท</strong>
    <strong style={{textAlign:"right"}}>ยอด</strong>
    <span/>
   </div>
   {items.map((x,i)=><div
    key={`${x.value}-${i}`}
    style={{display:"grid",gridTemplateColumns:"1fr 1.4fr 1fr auto",alignItems:"center",gap:"12px"}}
   >
    <strong style={{fontWeight:700}}>{x.value}</strong>
    <strong style={{fontWeight:700}}>{x.category_label}</strong>
    <strong style={{fontWeight:700,textAlign:"right"}}>{x.heart.toLocaleString()}</strong>
    <button type="button" onClick={()=>setItems(v=>v.filter((_,j)=>j!==i))}>⌫</button>
   </div>)}
  </section>}

  <section className="send-card">
   <div><b>{items.length} รายการ</b><span>รวม <strong>{total.toLocaleString()}</strong>{cash&&cashPercent>0?<small style={{display:"block"}}>สด -{cashPercent}%</small>:null}</span></div>
   <div className="review-action-row">
    <label className="cash-check">
     <input type="checkbox" checked={cash} onChange={e=>setCash(e.target.checked)}/>
     <span>สด</span>
    </label>
    <button type="button" className="red-action" onClick={openReview}>ทบทวนก่อนส่ง</button>
   </div>
   <label style={{display:"block",marginTop:"12px"}}>
    <span style={{display:"block",fontWeight:700,marginBottom:"6px"}}>อัพโหลดภาพ</span>
    <input
     type="file"
     accept="image/jpeg,image/png,image/webp"
     onChange={e=>{
      const file=e.target.files?.[0]||null
      if(file&&file.size>5*1024*1024){setMessage("รูปต้องไม่เกิน 5 MB");e.currentTarget.value="";return}
      setAttachment(file)
      setAttachmentPreview(file?URL.createObjectURL(file):"")
     }}
    />
   </label>
   {attachmentPreview&&<img src={attachmentPreview} alt="ภาพที่แนบ" style={{width:"100%",maxHeight:"220px",objectFit:"contain",marginTop:"10px",borderRadius:"10px"}}/>}
  </section>

  {reviewing&&<div className="review-overlay" role="dialog" aria-modal="true">
   <section className="review-sheet">
    <h2>ทบทวนรายการ</h2>
    <div className="review-items">
     <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr 1fr",gap:"12px",fontWeight:700}}>
      <strong>เลข</strong><strong>ประเภท</strong><strong style={{textAlign:"right"}}>ยอด</strong>
     </div>
     {items.map((x,i)=><div key={`${x.value}-${i}`}>
      <b>{x.value}</b><span>{x.category_label}</span><strong>{x.heart.toLocaleString()}</strong>
     </div>)}
    </div>
    <div className="review-sum"><span>{items.length} รายการ</span><b>รวม {total.toLocaleString()}{cash&&cashPercent>0?` (สด -${cashPercent}%)`:""}</b></div>
    {message&&<p className="play-message">{message}</p>}
    <button type="button" className="red-action" disabled={sending} onClick={submit}>
     {sending?"กำลังส่ง...":"บันทึกส่ง"}
    </button>
    <button type="button" className="review-back" disabled={sending} onClick={()=>setReviewing(false)}>กลับไปแก้ไข</button>
   </section>
  </div>}
 </main>
}
