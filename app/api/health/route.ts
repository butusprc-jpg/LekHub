import { NextResponse } from "next/server"

export const runtime="nodejs"

export async function GET(){
 const checks={
  neonDatabase:Boolean((process.env.DATABASE_URL||process.env.NEON_DATABASE_URL)?.trim()),
  blobToken:Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim()),
  liffId:Boolean(process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim()),
 }
 return NextResponse.json(
  {ok:Object.values(checks).every(Boolean),checks},
  {status:Object.values(checks).every(Boolean)?200:503,headers:{"cache-control":"no-store"}}
 )
}
