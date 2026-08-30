import { Pool } from "@neondatabase/serverless"

const FUNCTION_NAME=/^[a-zA-Z_][a-zA-Z0-9_]*$/

function connectionString(){
 const value=(process.env.DATABASE_URL||process.env.NEON_DATABASE_URL||"").trim()
 if(!value)throw new Error("Missing Neon DATABASE_URL")
 return value
}

function pool(){
 return new Pool({connectionString:connectionString()})
}

const TABLE_RPC=new Set([
 "lekhub_line_admin_list_backoffice_reports",
 "lekhub_line_admin_list_members",
 "lekhub_line_admin_list_oa_inbox",
 "lekhub_member_list_submissions_v2",
])

export async function neonQuery<T=Record<string,unknown>>(text:string,values:unknown[]=[]):Promise<T[]>{
 const db=pool()
 try{
  const result=await db.query(text,values)
  return result.rows as T[]
 }finally{
  await db.end().catch(()=>{})
 }
}

export async function neonRpc<T=any>(
 name:string,
 args:Record<string,unknown>={}
):Promise<{data:T|null;error:{message:string}|null}>{
 if(!FUNCTION_NAME.test(name))return {data:null,error:{message:"invalid_rpc_name"}}
 const entries=Object.entries(args)
 for(const [key] of entries){
  if(!FUNCTION_NAME.test(key))return {data:null,error:{message:"invalid_rpc_argument"}}
 }
 const named=entries.map(([key],i)=>`${key} => $${i+1}`).join(",")
 const JSON_ARGS=new Set(["p_items","p_category_amounts","p_patch"])
 const values=entries.map(([key,value])=>{
  if(JSON_ARGS.has(key))return JSON.stringify(value??(key==="p_items"?[]:{}))
  if(Array.isArray(value))return value
  if(value&&typeof value==="object")return JSON.stringify(value)
  return value
 })
 const call=`public.${name}(${named})`
 try{
  if(TABLE_RPC.has(name)){
   const rows=await neonQuery<any>(`select * from ${call}`,values)
   return {data:rows as T,error:null}
  }
  const rows=await neonQuery<any>(`select ${call} as data`,values)
  return {data:(rows[0]?.data??null) as T,error:null}
 }catch(error){
  return {data:null,error:{message:error instanceof Error?error.message:"neon_rpc_failed"}}
 }
}

export async function getTenantLineToken(tenantKey:string){
 const rows=await neonQuery<{line_channel_access_token:string|null}>(
  "select line_channel_access_token from public.lekhub_tenant_secrets where tenant_key=$1 limit 1",
  [tenantKey],
 )
 return String(rows[0]?.line_channel_access_token||"").trim()
}

export async function setTenantLineToken(tenantKey:string,token:string){
 await neonQuery(
  `insert into public.lekhub_tenant_secrets(tenant_key,line_channel_access_token,updated_at)
   values($1,$2,now())
   on conflict(tenant_key) do update
   set line_channel_access_token=excluded.line_channel_access_token,updated_at=now()
   returning tenant_key`,
  [tenantKey,token],
 )
}

export async function deleteTenantLineToken(tenantKey:string){
 await neonQuery("delete from public.lekhub_tenant_secrets where tenant_key=$1 returning tenant_key",[tenantKey])
}

export async function hasTenantLineToken(tenantKey:string){
 const rows=await neonQuery<{ok:boolean}>(
  "select exists(select 1 from public.lekhub_tenant_secrets where tenant_key=$1 and nullif(trim(line_channel_access_token),'') is not null) as ok",
  [tenantKey],
 )
 return Boolean(rows[0]?.ok)
}
