import { redirect } from "next/navigation"
import { checkAdminAccess } from "../../../lib/supabase-auth"

export const dynamic = "force-dynamic"

export default async function Reports() {
  const access = await checkAdminAccess()
  if (!access.ok) redirect("/admin/login?next=/admin/reports")

  return <main>
    <h1>รายงาน</h1>
    <button>Export</button>
  </main>
}
