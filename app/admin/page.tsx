import Link from "next/link"
import { redirect } from "next/navigation"
import { getLineAdminSession } from "../../lib/admin-session"
import { createAdminClient } from "../../lib/supabase/admin"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const access = await getLineAdminSession()
  if (!access) redirect("/admin/login")

  const { data, error } = await createAdminClient().rpc(
    "lekhub_line_admin_list_oa_inbox",
    { p_token: access.token, p_status: null, p_limit: 200 },
  )

  const rows = data || []
  const pending = rows.filter((row: { status: string }) => row.status === "pending").length
  const reviewed = rows.filter((row: { status: string }) => row.status === "reviewed").length
  const imported = rows.filter((row: { imported_at?: string | null }) => Boolean(row.imported_at)).length
  const total = rows.reduce((sum: number, row: { total: number }) => sum + Number(row.total || 0), 0)

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-brand"><span>LH</span><div><b>LekHub</b><small>OA BACKOFFICE</small></div></div>
      <nav>
        <Link className="active" href="/admin">ภาพรวม</Link>
        <Link href="/admin/reports">กล่องรับจาก OA</Link>
        <Link href="/admin/backoffice">รายงานหลังบ้าน</Link>
        <Link href="/admin/settings">ตั้งค่าระบบ</Link>
      </nav>
      <form action="/api/admin/logout" method="post"><button type="submit">ออกจากระบบ</button></form>
    </aside>

    <section className="admin-content">
      <header className="admin-topbar">
        <div><small>แอดมิน LINE • {access.displayName}</small><h1>ภาพรวมหลังบ้าน</h1></div>
        <Link href="/member/play" target="_blank">ทดลองส่งรายการ ↗</Link>
      </header>

      {error && <div className="admin-error">โหลดข้อมูลไม่สำเร็จ: {error.message}</div>}

      <div className="stat-grid">
        <article><span>📥</span><small>เข้า OA ทั้งหมด</small><b>{rows.length}</b></article>
        <article className="warning"><span>⏳</span><small>รอตรวจ</small><b>{pending}</b></article>
        <article className="success"><span>✓</span><small>ตรวจแล้ว</small><b>{reviewed}</b></article>
        <article><span>⇩</span><small>นำเข้าหลังบ้านแล้ว</small><b>{imported}</b></article>
      </div>

      <section className="dashboard-panel">
        <div>
          <small>FLOW</small>
          <h2>OA → ตรวจสอบ → นำเข้าหลังบ้าน</h2>
          <p>สมาชิกบันทึกส่ง รายการเข้ากล่อง OA ก่อน แอดมินตรวจแล้วจึงกดนำเข้าหลังบ้าน</p>
        </div>
        <Link href="/admin/reports">เปิดกล่องรับจาก OA →</Link>
      </section>

      <p style={{marginTop:16}}>ยอดรายการทั้งหมด {total.toLocaleString()}</p>
    </section>
  </main>
}
