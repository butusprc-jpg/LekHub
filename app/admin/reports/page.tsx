import Link from "next/link"
import { redirect } from "next/navigation"
import { checkAdminAccess } from "../../../lib/supabase-auth"
import { createClient } from "../../../lib/supabase/server"
import { updateSubmission } from "./actions"

export const dynamic = "force-dynamic"
type SubmissionItem = { id: number; value: string; category_label: string; heart: number }
type Submission = { id: string; reference_code: string; member_name: string; status: "pending" | "reviewed" | "cancelled"; item_count: number; total: number; created_at: string; items: SubmissionItem[] }
const statusText = { pending: "รอตรวจ", reviewed: "ตรวจแล้ว", cancelled: "ยกเลิก" }

export default async function Reports({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const access = await checkAdminAccess()
  if (!access.ok) redirect("/admin/login?next=/admin/reports")
  const { status } = await searchParams
  const activeStatus = ["pending", "reviewed", "cancelled"].includes(status || "") ? status! : null
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("admin_list_lekhub_submissions", { p_status: activeStatus, p_limit: 200 })
  const submissions = (data || []) as Submission[]

  return <main className="admin-shell">
    <aside className="admin-sidebar"><div className="admin-brand"><span>LH</span><div><b>LekHub</b><small>OA BACKOFFICE</small></div></div>
      <nav><Link href="/admin">ภาพรวม</Link><Link className="active" href="/admin/reports">รายงานที่ส่งมา</Link><Link href="/admin/settings">ตั้งค่าระบบ</Link></nav>
      <form action="/auth/signout" method="post"><button>ออกจากระบบ</button></form>
    </aside>
    <section className="admin-content">
      <header className="admin-topbar"><div><small>ระบบจัดการหลังบ้าน</small><h1>รายงานที่ส่งมา</h1></div><Link href="/member/play" target="_blank">เปิดหน้าสมาชิก ↗</Link></header>
      <div className="report-tabs"><Link className={!activeStatus ? "active" : ""} href="/admin/reports">ทั้งหมด <b>{submissions.length}</b></Link><Link className={activeStatus === "pending" ? "active" : ""} href="/admin/reports?status=pending">รอตรวจ</Link><Link className={activeStatus === "reviewed" ? "active" : ""} href="/admin/reports?status=reviewed">ตรวจแล้ว</Link><Link className={activeStatus === "cancelled" ? "active" : ""} href="/admin/reports?status=cancelled">ยกเลิก</Link></div>
      {error && <div className="admin-error">โหลดข้อมูลไม่สำเร็จ: {error.message}</div>}
      {!error && submissions.length === 0 && <div className="empty-state"><span>📥</span><h2>ยังไม่มีรายการส่งมา</h2><p>เมื่อสมาชิกกด “บันทึกส่ง” รายการจะปรากฏที่หน้านี้</p></div>}
      <div className="submission-grid">{submissions.map(submission => <article className="submission-card" key={submission.id}>
        <div className="submission-head"><div><span className={`status-pill ${submission.status}`}>{statusText[submission.status]}</span><h2>{submission.member_name}</h2><small>{new Date(submission.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</small></div><div className="submission-code"><small>เลขอ้างอิง</small><b>{submission.reference_code}</b></div></div>
        <div className="submission-items">{submission.items.map(item => <div key={item.id}><b>{item.value}</b><span>{item.category_label}</span><strong>{Number(item.heart).toLocaleString()}</strong></div>)}</div>
        <div className="submission-total"><span>{submission.item_count} รายการ</span><b>รวม {Number(submission.total).toLocaleString()} หน่วย</b></div>
        <form className="submission-actions" action={updateSubmission}><input type="hidden" name="id" value={submission.id} /><button name="status" value="pending" className={submission.status === "pending" ? "selected" : ""}>รอตรวจ</button><button name="status" value="reviewed" className={submission.status === "reviewed" ? "selected approved" : "approved"}>ตรวจแล้ว</button><button name="status" value="cancelled" className={submission.status === "cancelled" ? "selected cancelled" : "cancelled"}>ยกเลิก</button></form>
      </article>)}</div>
    </section>
  </main>
}
