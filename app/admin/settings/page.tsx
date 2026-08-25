"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  adminRpc,
  clearClientAdminSession,
  ensureLineAdminSession,
  type ClientAdminSession,
} from "../../../lib/line-admin-client"

export default function SettingsPage() {
  const [session, setSession] = useState<ClientAdminSession | null>(null)
  const [accepting, setAccepting] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("กำลังตรวจสอบสิทธิ์ LINE...")
  const [error, setError] = useState("")

  async function load() {
    setLoading(true)
    setError("")
    try {
      const current = await ensureLineAdminSession()
      setSession(current)

      const { data, error } = await adminRpc(current, "lekhub_line_admin_get_settings")
      if (error) throw new Error(error.message)

      setAccepting(Boolean(data?.accepting))
      setMessage(`เข้าระบบแล้ว: ${current.displayName}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "เข้าตั้งค่าไม่สำเร็จ")
      setMessage("")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!session || saving) return
    setSaving(true)
    setError("")
    setMessage("กำลังบันทึก...")
    try {
      const { data, error } = await adminRpc(session, "lekhub_line_admin_update_settings", {
        p_accepting: accepting,
        p_close_time: "23:59",
      })
      if (error) throw new Error(error.message)
      if (!data?.success) throw new Error("บันทึกการตั้งค่าไม่สำเร็จ")
      setAccepting(Boolean(data.accepting))
      setMessage("บันทึกการตั้งค่าแล้ว")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "บันทึกไม่สำเร็จ")
      setMessage("")
    } finally {
      setSaving(false)
    }
  }

  function logout() {
    clearClientAdminSession()
    window.location.replace("/admin/login?next=/admin/settings")
  }

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-brand"><span>LH</span><div><b>LekHub</b><small>OA BACKOFFICE</small></div></div>
      <nav>
        <Link href="/admin">ภาพรวม</Link>
        <Link href="/admin/reports">กล่องรับจาก OA</Link>
        <Link href="/admin/backoffice">รายงานหลังบ้าน</Link>
        <Link className="active" href="/admin/settings">ตั้งค่าระบบ</Link>
      </nav>
      <button type="button" onClick={logout}>ออกจากระบบ</button>
    </aside>

    <section className="admin-content">
      <header className="admin-topbar">
        <div><small>{session ? `แอดมิน LINE • ${session.displayName}` : "กำลังเชื่อม LINE"}</small><h1>ตั้งค่าระบบ</h1></div>
      </header>

      {message && <div className="admin-success">{message}</div>}
      {error && <div className="admin-error">{error}</div>}

      <section className="settings-card">
        <label className="toggle-row">
          <div>
            <b>เปิดรับรายการ</b>
            <small>เปิด = สมาชิกส่งรายการได้ทันที</small>
          </div>
          <input
            type="checkbox"
            checked={accepting}
            disabled={loading || !session || saving}
            onChange={e => setAccepting(e.target.checked)}
          />
        </label>

        <button type="button" onClick={save} disabled={loading || !session || saving}>
          {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
        </button>

        {error && <button type="button" onClick={load}>ลองเข้าใหม่</button>}
      </section>
    </section>
  </main>
}
