import { NextResponse } from "next/server"
import { getLineAdminSession } from "../../../../lib/admin-session"

export const runtime="nodejs"

export async function POST(request:Request){
 try{
  const body=await request.json().catch(()=>({}))
  const session=await getLineAdminSession()
  if(!session)return NextResponse.json({ok:false,error:"admin_required"},{status:401,headers:{"cache-control":"no-store, max-age=0"}})
  const winners=Array.isArray(body.winners)?body.winners:[]

  const channelToken=process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim()
  if(!channelToken)return NextResponse.json({ok:true,pushed:0,skipped:"line_push_not_configured"})

  let pushed=0
  for(const winner of winners){
   const to=String(winner.line_user_id||"").trim()
   if(!to.startsWith("U"))continue
   const reward=Number(winner.reward_total||0)
   const text=`สรุปรางวัลกิจกรรม\nรอบวันที่ ${body.roundDate||"-"}\nเลขรางวัล ${body.prizeNumber||"-"}\nยอดรางวัล ${reward.toLocaleString()}`
   const response=await fetch("https://api.line.me/v2/bot/message/push",{
    method:"POST",
    headers:{"content-type":"application/json",authorization:`Bearer ${channelToken}`},
    body:JSON.stringify({to,messages:[{type:"text",text}]}),
   })
   if(response.ok)pushed+=1
  }
  return NextResponse.json({ok:true,pushed})
 }catch(error){
  return NextResponse.json({ok:false,error:error instanceof Error?error.message:"notify_failed"},{status:500})
 }
}
