import Link from "next/link"
import { redirect } from "next/navigation"
import { checkAdminAccess } from "../../lib/supabase-auth"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const access = await checkAdminAccess()
  if (!access.ok && access.reason === "unauthenticated") redirect("/admin/login")

  if (!access.ok) return <main>
    <h1>ไม่มีสิทธิ์เข้าหลังบ้าน</h1>
    <p>บัญชีนี้เข้าสู่ระบบแล้ว แต่ยังไม่ได้รับสิทธิ์แอดมิน LekHub</p>
    <Link href="/admin/login">กลับหน้าเข้าสู่ระบบ</Link>
  </main>

  return <main>
    <h1>หลังบ้าน OA</h1>
    <p>Role: {access.role}</p>
    <button>เช็คข้อมูล</button>
    <button>นำเข้าหลังบ้าน</button>
    <Link href="/admin/reports">รายงาน</Link>
    <form action="/auth/signout" method="post">
      <button type="submit">ออกจากระบบ</button>
    </form>
  </main>
}
