import Link from "next/link"
import { redirect } from "next/navigation"
import { getLineAdminSession } from "../../../lib/admin-session"
import { createAdminClient } from "../../../lib/supabase/admin"

export const dynamic = "force-dynamic"

type ReportItem = { id: number; value: string; category_label: string; heart: number }
type Report = {
  id: string
  source_submission_id: string
  reference_code: string
  member_name: string
  item_count: number
  total: number
  imported_at: string
  items: ReportItem[]
}

export default async function BackofficeReports() {
  const access = await getLineAdminSession()
  if (!access) redirect("/admin/login?next=/admin/backoffice")

  const { data, error } = await createAdminClient().rpc(
    "lekhub_line_admin_list_backoffice_reports",
    { p_token: access.token, p_limit: 300 },
  )
  const reports = (data || []) as Report[]

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-brand"><span>LH</span><div><b>LekHub</b><small>OA BACKOFFICE</small></div></div>
      <nav>
        <Link href="/admin">ภาพรวม</Link>
        <Link href="/admin/reports">กล่องรับจาก OA</Link>
        <Link className="active" href="/admin/backoffice">รายงานหลังบ้าน</Link>
        <Link href="/admin/settings">ตั้งค่าระบบ</Link>
      </nav>
      <form action="/api/admin/logout" method="post"><button type="submit">ออกจากระบบ</button></form>
    </aside>

    <section className="admin-content">
      <header className="admin-topbar">
        <div><small>แอดมิน LINE • {access.displayName}</small><h1>รายงานหลังบ้าน</h1></div>
        <Link href="/admin/reports">← กลับไปตรวจ OA</Link>
      </header>

      {error && <div className="admin-error">โหลดรายงานไม่สำเร็จ: {error.message}</div>}

      {!error && reports.length === 0 && (
        <div className="empty-state">
          <span>▤</span><h2>ยังไม่มีรายงานหลังบ้าน</h2>
          <p>ตรวจรายการในกล่อง OA แล้วกด “นำเข้าหลังบ้าน”</p>
        </div>
      )}

      <div className="submission-grid">
        {reports.map(report => (
          <article className="submission-card" key={report.id}>
            <div className="submission-head">
              <div>
                <span className="status-pill reviewed">นำเข้าแล้ว</span>
                <h2>{report.member_name}</h2>
                <small>นำเข้า {new Date(report.imported_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</small>
              </div>
              <div className="submission-code"><small>เลขอ้างอิง</small><b>{report.reference_code}</b></div>
            </div>

            <div className="submission-items">
              {report.items.map(item => (
                <div key={item.id}>
                  <b>{item.value}</b><span>{item.category_label}</span>
                  <strong>{Number(item.heart).toLocaleString()}</strong>
                </div>
              ))}
            </div>

            <div className="submission-total">
              <span>{report.item_count} รายการ</span>
              <b>รวม {Number(report.total).toLocaleString()}</b>
            </div>
          </article>
        ))}
      </div>
    </section>
  </main>
}
