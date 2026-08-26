export type VerifiedLineMember={
 userId:string
 displayName:string
 pictureUrl:string|null
 channelId:string
}

type TokenVerify={
 client_id?:string
 expires_in?:number
 scope?:string
}

type LineProfile={
 userId?:string
 displayName?:string
 pictureUrl?:string
}

export function bearerToken(request:Request){
 const header=request.headers.get("authorization")||""
 const match=header.match(/^Bearer\s+(.+)$/i)
 return match?.[1]?.trim()||""
}

export async function verifyLineMember(accessToken:string):Promise<VerifiedLineMember>{
 if(!accessToken)throw new Error("missing_line_access_token")

 const verifyResponse=await fetch(
  `https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(accessToken)}`,
  {cache:"no-store",signal:AbortSignal.timeout(8000)}
 )
 if(!verifyResponse.ok)throw new Error("line_token_invalid")
 const verify=await verifyResponse.json() as TokenVerify
 const channelId=String(verify.client_id||"").trim()
 if(!channelId||Number(verify.expires_in||0)<=0)throw new Error("line_token_invalid")

 const profileResponse=await fetch("https://api.line.me/v2/profile",{
  headers:{Authorization:`Bearer ${accessToken}`},
  cache:"no-store",
  signal:AbortSignal.timeout(8000),
 })
 if(!profileResponse.ok)throw new Error("line_profile_invalid")
 const profile=await profileResponse.json() as LineProfile
 const userId=String(profile.userId||"").trim()
 const displayName=String(profile.displayName||"").trim()
 if(!userId||!displayName)throw new Error("line_profile_invalid")

 return{
  userId,
  displayName,
  pictureUrl:profile.pictureUrl?String(profile.pictureUrl):null,
  channelId,
 }
}
