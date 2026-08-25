import Link from "next/link"
import { redirect } from "next/navigation"
import { getLineAdminSession } from "../../../lib/admin-session"
import { createAdminClient } from "../../../lib/supabase/admin"
import { saveSettings } from "./actions"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const access = await getLineAdminSession()
  if (!access) redirect("/admin/login?next=/admin/settings")

  const { data, error } = await createAdminClient().rpc("admin_get_lekhub_settings")
  const settings = data || {
    accepting: true,
    close_time: "15:30:00",
    timezone: "Asia/Bangkok",
  }

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-brand"><span>LH</span><div><b>LekHub</b><small>OA BACKOFFICE</small></div></div>
      <nav>
        <Link href="/admin">ภาพรวม</Link>
        <Link href="/admin/reports">รายงานที่ส่งมา</Link>
        <Link className="active" href="/admin/settings">ตั้งค่าระบบ</Link>
      </nav>
      <form action="/api/admin/logout" method="post"><button>ออกจากระบบ</button></form>
    </aside>

    <section className="admin-content">
      <header className="admin-topbar">
        <div><small>แอดมิน LINE • {access.displayName}</small><h1>ตั้งค่าระบบ</h1></div>
      </header>

      {error && <div className="admin-error">โหลดการตั้งค่าไม่สำเร็จ: {error.message}</div>}

      <form className="settings-card" action={saveSettings}>
        <label className="toggle-row">
          <div>
            <b>เปิดรับรายการ</b>
            <small>เมื่อปิด สมาชิกจะไม่สามารถส่งรายการใหม่</small>
          </div>
          <input type="checkbox" name="accepting" defaultChecked={Boolean(settings.accepting)} />
        </label>

        <label>
          <span>เวลาปิดรับ</span>
          <input
            type="time"
            name="close_time"
            required
            defaultValue={String(settings.close_time || "15:30").slice(0, 5)}
          />
        </label>

        <p>เขตเวลา: {settings.timezone || "Asia/Bangkok"}</p>
        <button>บันทึกการตั้งค่า</button>
      </form>
    </section>
  </main>
}
