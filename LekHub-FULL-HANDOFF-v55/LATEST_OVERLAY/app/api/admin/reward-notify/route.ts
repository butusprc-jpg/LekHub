import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const runtime="nodejs"

function supabase(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
 const key=(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim()
 if(!url||!key)throw new Error("Missing Supabase environment variables")
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
}

export async function POST(request:Request){
 try{
  const body=await request.json().catch(()=>({}))
  const adminToken=String(body.adminToken||"")
  const winners=Array.isArray(body.winners)?body.winners:[]
  const {data,error}=await supabase().rpc("lekhub_check_line_admin_session",{p_token:adminToken})
  if(error||!data?.ok)return NextResponse.json({ok:false,error:"admin_required"},{status:403})

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
