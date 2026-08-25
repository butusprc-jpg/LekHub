import Link from "next/link"
import { redirect } from "next/navigation"
import { getLineAdminSession } from "../../../lib/admin-session"
import { createAdminClient } from "../../../lib/supabase/admin"
import { importSubmission, updateSubmission } from "./actions"

export const dynamic = "force-dynamic"

type SubmissionItem = { id: number; value: string; category_label: string; heart: number }
type Submission = {
  id: string
  reference_code: string
  member_name: string
  status: "pending" | "reviewed" | "cancelled"
  item_count: number
  total: number
  created_at: string
  reviewed_at?: string | null
  imported_at?: string | null
  items: SubmissionItem[]
}

const statusText = { pending: "รอตรวจ", reviewed: "ตรวจแล้ว", cancelled: "ยกเลิก" }

export default async function Reports({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; focus?: string }>
}) {
  const access = await getLineAdminSession()
  if (!access) redirect("/admin/login?next=/admin/reports")

  const { status, focus } = await searchParams
  const activeStatus = ["pending", "reviewed", "cancelled"].includes(status || "") ? status! : null

  const { data, error } = await createAdminClient().rpc(
    "lekhub_line_admin_list_oa_inbox",
    { p_token: access.token, p_status: activeStatus, p_limit: 200 },
  )
  const submissions = (data || []) as Submission[]

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-brand"><span>LH</span><div><b>LekHub</b><small>OA BACKOFFICE</small></div></div>
      <nav>
        <Link href="/admin">ภาพรวม</Link>
        <Link className="active" href="/admin/reports">กล่องรับจาก OA</Link>
        <Link href="/admin/backoffice">รายงานหลังบ้าน</Link>
        <Link href="/admin/settings">ตั้งค่าระบบ</Link>
      </nav>
      <form action="/api/admin/logout" method="post"><button type="submit">ออกจากระบบ</button></form>
    </aside>

    <section className="admin-content">
      <header className="admin-topbar">
        <div><small>แอดมิน LINE • {access.displayName}</small><h1>กล่องรับจาก OA</h1></div>
        <Link href="/admin/backoffice">ดูรายงานหลังบ้าน →</Link>
      </header>

      <div className="report-tabs">
        <Link className={!activeStatus ? "active" : ""} href="/admin/reports">ทั้งหมด</Link>
        <Link className={activeStatus === "pending" ? "active" : ""} href="/admin/reports?status=pending">รอตรวจ</Link>
        <Link className={activeStatus === "reviewed" ? "active" : ""} href="/admin/reports?status=reviewed">ตรวจแล้ว</Link>
        <Link className={activeStatus === "cancelled" ? "active" : ""} href="/admin/reports?status=cancelled">ยกเลิก</Link>
      </div>

      {error && <div className="admin-error">โหลดข้อมูลไม่สำเร็จ: {error.message}</div>}

      {!error && submissions.length === 0 && (
        <div className="empty-state">
          <span>📥</span><h2>ยังไม่มีรายการเข้า OA</h2>
          <p>เมื่อสมาชิกกด “บันทึกส่ง” รายการจะเข้าหน้านี้ก่อน</p>
        </div>
      )}

      <div className="submission-grid">
        {submissions.map(submission => (
          <article
            className="submission-card"
            key={submission.id}
            id={`submission-${submission.id}`}
            style={focus === submission.id ? {outline:"3px solid #2563eb"} : undefined}
          >
            <div className="submission-head">
              <div>
                <span className={`status-pill ${submission.status}`}>{statusText[submission.status]}</span>
                {submission.imported_at && <span className="status-pill reviewed" style={{marginLeft:8}}>นำเข้าแล้ว</span>}
                <h2>{submission.member_name}</h2>
                <small>{new Date(submission.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</small>
              </div>
              <div className="submission-code"><small>เลขอ้างอิง</small><b>{submission.reference_code}</b></div>
            </div>

            <div className="submission-items">
              {submission.items.map(item => (
                <div key={item.id}>
                  <b>{item.value}</b><span>{item.category_label}</span>
                  <strong>{Number(item.heart).toLocaleString()}</strong>
                </div>
              ))}
            </div>

            <div className="submission-total">
              <span>{submission.item_count} รายการ</span>
              <b>รวม {Number(submission.total).toLocaleString()}</b>
            </div>

            <form className="submission-actions" action={updateSubmission}>
              <input type="hidden" name="id" value={submission.id} />
              <button type="submit" name="status" value="pending" className={submission.status === "pending" ? "selected" : ""}>รอตรวจ</button>
              <button type="submit" name="status" value="reviewed" className={submission.status === "reviewed" ? "selected approved" : "approved"}>ตรวจแล้ว</button>
              <button type="submit" name="status" value="cancelled" className={submission.status === "cancelled" ? "selected cancelled" : "cancelled"}>ยกเลิก</button>
            </form>

            <form action={importSubmission} style={{padding:"0 14px 14px"}}>
              <input type="hidden" name="id" value={submission.id} />
              <button
                type="submit"
                className="red-action"
                disabled={submission.status !== "reviewed" || Boolean(submission.imported_at)}
              >
                {submission.imported_at ? "นำเข้าหลังบ้านแล้ว" : submission.status === "reviewed" ? "นำเข้าหลังบ้าน" : "ตรวจรายการก่อนนำเข้า"}
              </button>
            </form>
          </article>
        ))}
      </div>
    </section>
  </main>
}
