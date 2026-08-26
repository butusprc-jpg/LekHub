import { redirect } from "next/navigation"

type SearchValue = string | string[] | undefined

type HomeProps = {
  searchParams: Promise<Record<string, SearchValue>>
}

function first(value: SearchValue) {
  return Array.isArray(value) ? value[0] || "" : value || ""
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams
  const liffState = first(params["liff.state"])
  const adminTarget = first(params.admin)

  // LIFF secondary redirects arrive at the Endpoint URL with the intended
  // destination encoded in liff.state. Route backoffice requests directly
  // instead of dropping the state and falling through to /member/play.
  if (
    adminTarget === "backoffice" ||
    liffState.includes("admin=backoffice") ||
    liffState.includes("/admin/backoffice")
  ) {
    redirect("/admin/backoffice")
  }

  // Preserve LIFF query/state for the member router so other LIFF entry
  // points keep working exactly as before.
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item)
    } else if (value) {
      query.set(key, value)
    }
  }

  const suffix = query.toString()
  redirect(`/member/play${suffix ? `?${suffix}` : ""}`)
}
