export type LineProfile = { userId: string; displayName: string; pictureUrl?: string }

export type LiffClient = {
  init(o: { liffId: string }): Promise<void>
  isLoggedIn(): boolean
  login(o?: { redirectUri?: string }): void
  getProfile(): Promise<LineProfile>
  getAccessToken(): string | null
  sendMessages(m: unknown[]): Promise<void>
  closeWindow?(): void
}

declare global {
  interface Window {
    liff?: LiffClient
  }
}

function tenantFromLocation(){
  const merged=new URLSearchParams()
  const add=(raw:string)=>{
    if(!raw)return
    let text=raw.trim()
    for(let i=0;i<3;i++){
      try{
        const decoded=decodeURIComponent(text)
        if(decoded===text)break
        text=decoded
      }catch{break}
    }
    const q=text.indexOf("?")
    if(q>=0)text=text.slice(q+1)
    if(text.startsWith("#"))text=text.slice(1)
    if(text.startsWith("?"))text=text.slice(1)
    new URLSearchParams(text).forEach((value,key)=>{
      if(key!=="liff.state"&&!merged.has(key))merged.set(key,value)
    })
  }
  const direct=new URLSearchParams(window.location.search)
  direct.forEach((value,key)=>{
    if(key!=="liff.state"&&!merged.has(key))merged.set(key,value)
  })
  add(direct.get("liff.state")||"")
  add(window.location.hash)
  const tenant=(merged.get("tenant")||"").trim().toLowerCase()
  if(tenant){
    sessionStorage.setItem("lekhub_tenant_key",tenant)
    return tenant
  }
  return (sessionStorage.getItem("lekhub_tenant_key")||"").trim().toLowerCase()
}

async function resolveLiffId(){
  const tenant=tenantFromLocation()
  if(!tenant){
    return (process.env.NEXT_PUBLIC_LINE_LIFF_ID || "2011199813-swdN7h10").trim()
  }
  const response=await fetch(`/api/tenant/liff?tenant=${encodeURIComponent(tenant)}`,{cache:"no-store"})
  const result=await response.json().catch(()=>({}))
  if(!response.ok||!result.ok||!result.liffId){
    throw new Error(String(result.error||"tenant_not_ready"))
  }
  return String(result.liffId).trim()
}

export async function initLIFF() {
  const liff = await new Promise<LiffClient>((resolve, reject) => {
    let tries = 0
    const timer = window.setInterval(() => {
      if (window.liff) {
        clearInterval(timer)
        resolve(window.liff)
      } else if (++tries > 50) {
        clearInterval(timer)
        reject(new Error("liff_not_ready"))
      }
    }, 100)
  })

  await liff.init({liffId:await resolveLiffId()})

  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href })
    return null
  }

  return { liff, profile: await liff.getProfile() }
}
