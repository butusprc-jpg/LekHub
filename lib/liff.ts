export type LineProfile = { userId: string; displayName: string; pictureUrl?: string }
export type LiffClient = { init(o:{liffId:string}):Promise<void>; isLoggedIn():boolean; login(o?:{redirectUri?:string}):void; getProfile():Promise<LineProfile>; sendMessages(m:unknown[]):Promise<void>; closeWindow?():void }
declare global { interface Window { liff?: LiffClient } }

export async function initLIFF() {
  const liff = await new Promise<LiffClient>((resolve, reject) => {
    let tries=0; const timer=window.setInterval(()=>{ if(window.liff){clearInterval(timer);resolve(window.liff)} else if(++tries>50){clearInterval(timer);reject(new Error("liff_not_ready"))}},100)
  })
  await liff.init({liffId:(process.env.NEXT_PUBLIC_LINE_LIFF_ID||"2011199813-swdN7h10").trim()})
  if(!liff.isLoggedIn()){ liff.login({redirectUri:window.location.href}); return null }
  return {liff,profile:await liff.getProfile()}
}
