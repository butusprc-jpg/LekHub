import { NextResponse } from "next/server"
import { getLineAdminSession } from "../../../../lib/admin-session"

export const runtime="nodejs"

type WinnerItem={
 selected_value?:unknown
 value?:unknown
 category_label?:unknown
 category?:unknown
 stake?:unknown
 heart?:unknown
 multiplier?:unknown
 reward_amount?:unknown
 reward?:unknown
}

type Winner={
 line_user_id?:unknown
 member_name?:unknown
 display_name?:unknown
 reward_total?:unknown
 items?:unknown
 rewards?:unknown
 winning_items?:unknown
 selected_value?:unknown
 value?:unknown
 category_label?:unknown
 category?:unknown
 stake?:unknown
 heart?:unknown
 multiplier?:unknown
 reward_amount?:unknown
 reward?:unknown
}


function money(value:unknown){
 return Math.max(0,Number(value)||0).toLocaleString("th-TH")
}

function text(value:unknown,fallback="-"){
 const result=String(value??"").trim()
 return result||fallback
}

function winnerItems(winner:Winner):WinnerItem[]{
 const list=[winner.winning_items,winner.items,winner.rewards].find(Array.isArray)
 if(Array.isArray(list)&&list.length)return list as WinnerItem[]
 if(winner.selected_value||winner.value||winner.category_label||winner.category){
  return [winner]
 }
 return []
}

function makeFlex(winner:Winner,roundDate:unknown,prizeNumber:unknown){
 const items=winnerItems(winner)
 const total=Number(winner.reward_total||items.reduce((sum,item)=>sum+Number(item.reward_amount??item.reward??0),0))||0
 const detailContents:any[]=[]

 for(const item of items.slice(0,8)){
  const selected=text(item.selected_value??item.value)
  const category=text(item.category_label??item.category)
  const stake=Number(item.stake??item.heart??0)||0
  const multiplier=Number(item.multiplier||0)||0
  const reward=Number(item.reward_amount??item.reward??0)||0
  detailContents.push({
   type:"box",layout:"vertical",spacing:"xs",margin:"md",contents:[
    {type:"box",layout:"horizontal",contents:[
     {type:"text",text:`${category} • ${selected}`,weight:"bold",size:"sm",color:"#111111",flex:5,wrap:true},
     {type:"text",text:`${money(reward)}`,weight:"bold",size:"sm",color:"#E11D48",align:"end",flex:2},
    ]},
    {type:"text",text:`ยอดเล่น ${money(stake)}${multiplier?` • คูณ ${money(multiplier)}`:""}`,size:"xs",color:"#6B7280",wrap:true},
   ]
  })
 }
 if(items.length>8){
  detailContents.push({type:"text",text:`และอีก ${items.length-8} รายการ`,size:"xs",color:"#6B7280",margin:"md"})
 }
 if(!detailContents.length){
  detailContents.push({type:"text",text:"ระบบบันทึกรางวัลของคุณเรียบร้อยแล้ว",size:"sm",color:"#6B7280",wrap:true,margin:"md"})
 }

 return {
  type:"flex",
  altText:`ยินดีด้วย คุณได้รับรางวัล ${money(total)}`,
  contents:{
   type:"bubble",
   size:"mega",
   header:{
    type:"box",layout:"vertical",paddingAll:"20px",backgroundColor:"#111827",contents:[
     {type:"text",text:"LEKHUB",size:"xs",weight:"bold",color:"#F9A8D4"},
     {type:"text",text:"🎉 ยินดีด้วย คุณถูกรางวัล",size:"xl",weight:"bold",color:"#FFFFFF",wrap:true,margin:"sm"},
     {type:"text",text:text(winner.member_name??winner.display_name,"สมาชิก"),size:"sm",color:"#D1D5DB",margin:"sm",wrap:true},
    ]
   },
   body:{
    type:"box",layout:"vertical",paddingAll:"20px",contents:[
     {type:"box",layout:"vertical",backgroundColor:"#FFF1F2",cornerRadius:"12px",paddingAll:"14px",contents:[
      {type:"text",text:"ยอดรางวัลรวม",size:"sm",color:"#9F1239"},
      {type:"text",text:money(total),size:"xxl",weight:"bold",color:"#E11D48",margin:"xs"},
     ]},
     {type:"separator",margin:"lg",color:"#E5E7EB"},
     {type:"box",layout:"horizontal",margin:"lg",contents:[
      {type:"text",text:"รอบ",size:"sm",color:"#6B7280",flex:2},
      {type:"text",text:text(roundDate),size:"sm",weight:"bold",align:"end",flex:4,wrap:true},
     ]},
     {type:"box",layout:"horizontal",margin:"sm",contents:[
      {type:"text",text:"ผลรางวัล",size:"sm",color:"#6B7280",flex:2},
      {type:"text",text:text(prizeNumber),size:"sm",weight:"bold",align:"end",flex:4,wrap:true},
     ]},
     {type:"separator",margin:"lg",color:"#E5E7EB"},
     {type:"text",text:"รายการที่ถูกรางวัล",size:"sm",weight:"bold",color:"#111827",margin:"lg"},
     ...detailContents,
    ]
   },
   footer:{
    type:"box",layout:"vertical",paddingAll:"16px",contents:[
     {type:"text",text:"รางวัลได้รับการบันทึกในรายงานสมาชิกแล้ว",size:"xs",color:"#6B7280",align:"center",wrap:true},
    ]
   }
  }
 }
}

export async function POST(request:Request){
 try{
  const body=await request.json().catch(()=>({}))
  const winners=Array.isArray(body.winners)?body.winners as Winner[]:[]
  const session=await getLineAdminSession()
  if(!session)return NextResponse.json({ok:false,error:"admin_required"},{status:401,headers:{"cache-control":"no-store"}})

  const channelToken=process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim()
  if(!channelToken)return NextResponse.json({ok:true,pushed:0,failed:0,skipped:"line_push_not_configured"},{headers:{"cache-control":"no-store"}})

  let pushed=0
  let failed=0
  const errors:string[]=[]
  for(const winner of winners){
   const to=String(winner.line_user_id||"").trim()
   if(!/^U[0-9a-f]{32}$/i.test(to)){
    failed+=1
    errors.push("invalid_line_user_id")
    continue
   }
   const message=makeFlex(winner,body.roundDate,body.prizeNumber)
   const response=await fetch("https://api.line.me/v2/bot/message/push",{
    method:"POST",
    headers:{"content-type":"application/json",authorization:`Bearer ${channelToken}`},
    cache:"no-store",
    body:JSON.stringify({to,messages:[message]}),
   })
   if(response.ok){pushed+=1;continue}
   failed+=1
   const detail=await response.text().catch(()=>"")
   console.error("LekHub LINE reward push failed",response.status,detail.slice(0,500))
   errors.push(`line_${response.status}`)
  }
  return NextResponse.json({ok:failed===0,pushed,failed,errors:[...new Set(errors)]},{status:failed?207:200,headers:{"cache-control":"no-store"}})
 }catch(error){
  console.error("LekHub reward notify failed",error)
  return NextResponse.json({ok:false,error:error instanceof Error?error.message:"notify_failed"},{status:500,headers:{"cache-control":"no-store"}})
 }
}
