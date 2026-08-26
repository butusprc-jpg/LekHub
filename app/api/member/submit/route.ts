import { NextResponse } from "next/server"
import { createServerAdminClient } from "../../../../lib/server/supabase-admin"
import { bearerToken,verifyLineMember } from "../../../../lib/server/line-member"

export const runtime="nodejs"

const CATEGORY_DIGITS:Record<string,number>={
 "3topmix":3,
 "3top":3,
 "3front":3,
 "3back":3,
 "2top":2,
 "single":1,
 "bottom":2,
}
const CATEGORY_LABEL:Record<string,string>={
 "3topmix":"3 บนสลับ",
 "3top":"3 บน",
 "3front":"3 หน้า",
 "3back":"3 หลัง",
 "2top":"2 บน",
 "single":"วิ่งบน",
 "bottom":"2 ล่าง",
}

// Compatibility with the current production DB validator.
const DB_CATEGORY:Record<string,string>={
 "3front":"3top",
 "3back":"3top",
}

type RawItem={
 value?:unknown
 category?:unknown
 category_label?:unknown
 heart?:unknown
 cash?:unknown
}

function validAttachmentUrl(raw:unknown,userId:string){
 if(raw==null||raw==="")return null
 if(typeof raw!=="string"||raw.length>2048)throw new Error("invalid_attachment_url")
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
 if(!base)throw new Error("missing_supabase_url")
 const expected=`${base.replace(/\/$/,"")}/storage/v1/object/public/lekhub-uploads/${encodeURIComponent(userId)}/`
 const unencoded=`${base.replace(/\/$/,"")}/storage/v1/object/public/lekhub-uploads/${userId}/`
 if(!raw.startsWith(expected)&&!raw.startsWith(unencoded))throw new Error("invalid_attachment_url")
 return raw
}

function cleanItems(value:unknown){
 if(!Array.isArray(value)||value.length<1||value.length>200)throw new Error("invalid_items")
 return value.map((entry)=>{
  const item=(entry||{}) as RawItem
  const category=String(item.category||"")
  const digits=CATEGORY_DIGITS[category]
  if(!digits)throw new Error("invalid_category")
  const selected=String(item.value||"")
  if(!new RegExp(`^\\d{${digits}}$`).test(selected))throw new Error("invalid_value")
  const heart=Number(item.heart)
  if(!Number.isFinite(heart)||heart<=0||heart>100000000||Math.round(heart)!==heart||heart%10!==0){
   throw new Error("invalid_amount")
  }
  return{
   value:selected,
   category:DB_CATEGORY[category]||category,
   category_label:CATEGORY_LABEL[category],
   heart,
   cash:Boolean(item.cash),
  }
 })
}

export async function POST(request:Request){
 try{
  const length=Number(request.headers.get("content-length")||0)
  if(length>256*1024)return NextResponse.json({ok:false,error:"payload_too_large"},{status:413})

  const member=await verifyLineMember(bearerToken(request))
  const body=await request.json().catch(()=>null) as {items?:unknown;attachmentUrl?:unknown}|null
  if(!body)return NextResponse.json({ok:false,error:"invalid_json"},{status:400})

  const items=cleanItems(body.items)
  const attachmentUrl=validAttachmentUrl(body.attachmentUrl,member.userId)
  const referenceCode=`SL-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0,4).toUpperCase()}`

  const {data,error}=await createServerAdminClient().rpc("submit_lekhub_submission",{
   p_reference_code:referenceCode,
   p_line_user_id:member.userId,
   p_member_name:member.displayName,
   p_member_avatar:member.pictureUrl,
   p_items:items,
   p_attachment_url:attachmentUrl,
  })
  if(error){
   console.error("LekHub verified submit RPC failed",error)
   return NextResponse.json({ok:false,error:error.message},{status:400})
  }
  if(!data?.success){
   return NextResponse.json({ok:false,error:String(data?.reason||"submit_failed")},{status:400})
  }
  return NextResponse.json(
   {ok:true,data},
   {headers:{"cache-control":"no-store, max-age=0"}}
  )
 }catch(error){
  const code=error instanceof Error?error.message:"member_submit_failed"
  const auth=code.startsWith("line_")||code==="missing_line_access_token"
  const client=new Set(["invalid_items","invalid_category","invalid_value","invalid_amount","invalid_attachment_url"])
  return NextResponse.json(
   {ok:false,error:code},
   {status:auth?401:client.has(code)?400:500,headers:{"cache-control":"no-store, max-age=0"}}
  )
 }
}
