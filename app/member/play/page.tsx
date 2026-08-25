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
 const [sending,setSending]=useState(false),[open,setOpen]=useState(true),[closeTime,setCloseTime]=useState("15:30")
 const [reviewing,setReviewing]=useState(false)

 useEffect(()=>{
  localStorage.removeItem("lekhub_member_name")
  localStorage.removeItem("lekhub_member_key")
  setItems([])
  initLIFF()
   .then(line=>{if(line){setProfile(line.profile);setLiff(line.liff);setMessage("")}})
   .catch(()=>setMessage("กรุณาเปิดผ่าน LINE OA"))
  createClient().rpc("get_lekhub_public_status").then(({data})=>{
   if(data&&typeof data==="object"){
    if("is_open" in data)setOpen(Boolean(data.is_open))
    if("close_time" in data&&data.close_time)setCloseTime(String(data.close_time).slice(0,5))
   }
  },()=>{})
 },[])

 const total=useMemo(()=>items.reduce((s,x)=>s+x.heart,0),[items])

 function add(){
  const number=value.replace(/\D/g,"")
  const parts=amount.split(/[x×]/i).map(x=>Number(x.trim())).filter(x=>x>0)
  if(!/^\d{1,6}$/.test(number)||!parts.length){
   setMessage("กรุณากรอกเลขและยอดให้ครบ")
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

 async function submit(){
  const activeLiff=liff
  if(!items.length||sending)return
  if(!open){setMessage("ปิดรับรายการแล้ว");return}
  if(!profile||!activeLiff){setMessage("ยังเชื่อม LINE ไม่สำเร็จ กรุณาเปิดผ่าน LINE OA แล้วลองอีกครั้ง");return}
  setSending(true)
  setMessage("")
  const code=`SL-${Date.now().toString(36).toUpperCase()}`
  const {data,error}=await createClient().rpc("submit_lekhub_submission",{
   p_reference_code:code,
   p_line_user_id:profile.userId,
   p_member_name:profile.displayName,
   p_member_avatar:profile.pictureUrl||null,
   p_items:items
  })
  if(error||!data?.success){
   setMessage(error?.message||"ส่งไม่สำเร็จ กรุณาลองใหม่")
   setSending(false)
   return
  }

  try{
   await activeLiff.sendMessages([{
    type:"flex",
    altText:`รายการใหม่ ${code} รวม ${total}`,
    contents:{
     type:"bubble",
     header:{
      type:"box",layout:"horizontal",backgroundColor:"#B90000",paddingAll:"16px",
      contents:[
       {type:"text",text:"รายการเลือกเลขใหม่",color:"#FFFFFF",weight:"bold",size:"lg"},
       {type:"text",text:"รอตรวจสอบ",color:"#111111",align:"end",flex:1}
      ]
     },
     body:{
      type:"box",layout:"vertical",
      contents:[
       {type:"text",text:`สมาชิก  ${profile.displayName}`,weight:"bold"},
       {type:"text",text:`รหัส  ${data.reference_code||code}`,margin:"md"},
       {type:"separator",margin:"lg"},
       ...items.map(x=>({
        type:"box",layout:"horizontal",paddingAll:"10px",
        contents:[
         {type:"text",text:x.value,weight:"bold",size:"xl",flex:2},
         {type:"text",text:`${x.category_label} ${x.heart}`,size:"sm",wrap:true,flex:5}
        ]
       })),
       {type:"separator",margin:"md"},
       {type:"text",text:`${items.length} รายการ     รวม ${total.toLocaleString()}`,weight:"bold",size:"lg",margin:"lg",align:"center"}
      ]
     },
     footer:{
      type:"box",layout:"vertical",
      contents:[{
       type:"button",style:"primary",color:"#C40000",
       action:{type:"uri",label:"ส่งเข้าหลังบ้าน",uri:"https://lek-hub.vercel.app/admin/reports"}
      }]
     }
    }
   }])
  }catch{}

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
   <button aria-label="ปิดหน้าจอ" onClick={close}>×</button>
   <h1>เลือกเลข</h1>
   <span/>
  </header>

  <section className="line-person">
   {profile?.pictureUrl
    ?<img src={profile.pictureUrl} alt="รูปโปรไฟล์ LINE"/>
    :<div className="line-avatar">LINE</div>}
   <b>{profile?.displayName||"กำลังโหลดชื่อ LINE..."}</b>
   <strong>{open?`ปิดรับ ${closeTime}`:"ปิดรับแล้ว"}</strong>
  </section>

  <section className="pick-card">
   <label>ประเภท
    <select value={category} onChange={e=>setCategory(e.target.value)}>
     {types.map(([k,n])=><option key={k} value={k}>{n}</option>)}
    </select>
   </label>
   <label>เลข
    <input inputMode="numeric" maxLength={6} value={value}
     onChange={e=>setValue(e.target.value.replace(/\D/g,""))} placeholder="456"/>
   </label>
   <label>ยอด
    <input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="100 × 100"/>
   </label>
   <small>ใส่ 100 × 100 เพื่อเลือกเป็นคู่</small>
   <button className="red-action" onClick={add}>＋ เพิ่ม</button>
  </section>

  {!!items.length&&
   <section className="picked-list">
    {items.map((x,i)=>
     <div key={`${x.value}-${i}`}>
      <b>{x.value}</b>
      <span>{x.category_label} {x.heart.toLocaleString()}</span>
      <button onClick={()=>setItems(v=>v.filter((_,j)=>j!==i))}>⌫</button>
     </div>
    )}
   </section>
  }

  <section className="send-card">
   <div>
    <b>{items.length} รายการ</b>
    <span>รวม <strong>{total.toLocaleString()}</strong></span>
   </div>
   <button
    className="red-action"
    disabled={!items.length||sending}
    onClick={()=>setReviewing(true)}
   >
    ทบทวนก่อนส่ง
   </button>
   {message&&<p className="play-message">{message}</p>}
  </section>

  {reviewing&&
   <div className="review-overlay" role="dialog" aria-modal="true">
    <section className="review-sheet">
     <h2>ทบทวนรายการ</h2>
     <div className="review-items">
      {items.map((x,i)=>
       <div key={`${x.value}-${i}`}>
        <b>{x.value}</b>
        <span>{x.category_label}</span>
        <strong>{x.heart.toLocaleString()}</strong>
       </div>
      )}
     </div>
     <div className="review-sum">
      <span>{items.length} รายการ</span>
      <b>รวม {total.toLocaleString()}</b>
     </div>
     <button className="red-action" disabled={sending} onClick={submit}>
      {sending?"กำลังส่ง...":"บันทึกส่ง"}
     </button>
     <button className="review-back" disabled={sending} onClick={()=>setReviewing(false)}>
      กลับไปแก้ไข
     </button>
    </section>
   </div>
  }
 </main>
}
