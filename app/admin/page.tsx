import Link from "next/link"
import { redirect } from "next/navigation"
import { getLineAdminSession } from "../../lib/admin-session"
import { createAdminClient } from "../../lib/supabase/admin"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const access = await getLineAdminSession()
  if (!access) redirect("/admin/login")

  const { data, error } = await createAdminClient().rpc(
    "lekhub_line_admin_list_submissions",
    { p_token: access.token, p_status: null, p_limit: 200 },
  )

  const rows = data || []
  const pending = rows.filter((row: { status: string }) => row.status === "pending").length
  const reviewed = rows.filter((row: { status: string }) => row.status === "reviewed").length
  const total = rows.reduce(
    (sum: number, row: { total: number }) => sum + Number(row.total || 0),
    0,
  )

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-brand"><span>LH</span><div><b>LekHub</b><small>OA BACKOFFICE</small></div></div>
      <nav>
        <Link className="active" href="/admin">ภาพรวม</Link>
        <Link href="/admin/reports">รายงานที่ส่งมา</Link>
        <Link href="/admin/settings">ตั้งค่าระบบ</Link>
      </nav>
      <form action="/api/admin/logout" method="post"><button>ออกจากระบบ</button></form>
    </aside>

    <section className="admin-content">
      <header className="admin-topbar">
        <div><small>แอดมิน LINE • {access.displayName}</small><h1>ภาพรวมหลังบ้าน</h1></div>
        <Link href="/member/play" target="_blank">ทดลองส่งรายการ ↗</Link>
      </header>

      {error && <div className="admin-error">โหลดข้อมูลไม่สำเร็จ: {error.message}</div>}

      <div className="stat-grid">
        <article><span>📥</span><small>รายการทั้งหมด</small><b>{rows.length}</b></article>
        <article className="warning"><span>⏳</span><small>รอตรวจ</small><b>{pending}</b></article>
        <article className="success"><span>✓</span><small>ตรวจแล้ว</small><b>{reviewed}</b></article>
        <article><span>Σ</span><small>ยอดรวม</small><b>{total.toLocaleString()}</b></article>
      </div>

      <section className="dashboard-panel">
        <div>
          <small>กล่องรับรายการ</small>
          <h2>รายงานที่สมาชิกส่งมา</h2>
          <p>ข้อมูลบันทึกใน Supabase และเปิดดูย้อนหลังได้ ไม่หายเมื่อ deploy ใหม่</p>
        </div>
        <Link href="/admin/reports">เปิดดูรายการทั้งหมด →</Link>
      </section>
    </section>
  </main>
}
