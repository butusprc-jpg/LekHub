"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { createClient } from "../../../lib/supabase/client"

type Item = { value: string; category: string; category_label: string; heart: string }
const categories = [["3top", "3 ตัวบน"], ["3topmix", "3 ตัวโต๊ด"], ["2top", "2 ตัวบน"], ["single", "วิ่งบน"], ["bottom", "2 ตัวล่าง"]]
const emptyItem = (): Item => ({ value: "", category: "3top", category_label: "3 ตัวบน", heart: "" })

function browserMemberKey() {
  const saved = localStorage.getItem("lekhub_member_key")
  if (saved) return saved
  const created = `web-${crypto.randomUUID()}`
  localStorage.setItem("lekhub_member_key", created)
  return created
}

export default function PlayPage() {
  const [memberName, setMemberName] = useState("")
  const [items, setItems] = useState<Item[]>([emptyItem()])
  const [stage, setStage] = useState<"edit" | "review" | "sent">("edit")
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState("")
  const [reference, setReference] = useState("")
  const [isOpen, setIsOpen] = useState(true)
  const [attempted, setAttempted] = useState(false)

  useEffect(() => {
    setMemberName(localStorage.getItem("lekhub_member_name") || "")
    createClient().rpc("get_lekhub_public_status").then(({ data }) => {
      if (data && typeof data === "object" && "is_open" in data) setIsOpen(Boolean(data.is_open))
    })
  }, [])

  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.heart || 0), 0), [items])
  const valid = Boolean(memberName.trim()) && items.every(item => /^\d{1,6}$/.test(item.value) && Number(item.heart) > 0)

  function update(index: number, field: keyof Item, value: string) {
    setItems(current => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item
      if (field !== "category") return { ...item, [field]: value }
      return { ...item, category: value, category_label: categories.find(([key]) => key === value)?.[1] || value }
    }))
  }

  async function submit() {
    if (!valid || sending) return
    setSending(true); setMessage("")
    const code = `LH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    const { data, error } = await createClient().rpc("submit_lekhub_submission", {
      p_reference_code: code, p_line_user_id: browserMemberKey(), p_member_name: memberName.trim(), p_member_avatar: null,
      p_items: items.map(item => ({ ...item, heart: Number(item.heart) })),
    })
    setSending(false)
    if (error || !data?.success) {
      const reason = error?.message || data?.reason || "unknown"
      setMessage(reason.includes("outside_accepting_time") ? "เลยเวลารับรายการแล้ว" : reason.includes("blocked_value") ? "มีรายการที่ปิดรับ กรุณาตรวจใหม่" : reason.includes("rate_limited") ? "ส่งถี่เกินไป กรุณารอสักครู่" : "ส่งไม่สำเร็จ กรุณาลองใหม่")
      return
    }
    localStorage.setItem("lekhub_member_name", memberName.trim())
    setReference(data.reference_code || code); setStage("sent")
  }

  function review() {
    setAttempted(true)
    if (!memberName.trim()) {
      setMessage("กรุณากรอกชื่อสมาชิก")
      return
    }
    const missingNumber = items.some(item => !/^\d{1,6}$/.test(item.value))
    const missingAmount = items.some(item => Number(item.heart) <= 0)
    if (missingNumber || missingAmount) {
      setMessage(missingNumber && missingAmount ? "กรุณากรอกเลขและจำนวนให้ครบทุกรายการ" : missingNumber ? "กรุณากรอกเลขให้ครบทุกรายการ" : "กรุณากรอกจำนวนให้ครบทุกรายการ")
      return
    }
    setMessage("")
    setStage("review")
  }

  if (stage === "sent") return <main className="member-shell"><section className="success-card">
    <div className="success-icon">✓</div><p>บันทึกเรียบร้อย</p><h1>ส่งเข้าหลังบ้านแล้ว</h1><div className="reference-code">{reference}</div>
    <p>แอดมินจะเห็นรายการนี้ทันทีในหน้า “รายงานที่ส่งมา”</p>
    <button onClick={() => { setItems([emptyItem()]); setStage("edit"); setReference("") }}>ส่งรายการใหม่</button><Link href="/">กลับหน้าหลัก</Link>
  </section></main>

  return <main className="member-shell">
    <header className="member-header"><Link href="/" className="back-link">‹</Link><div><small>LEKHUB MEMBER</small><h1>บันทึกรายการ</h1></div><span className={`open-badge ${isOpen ? "" : "closed"}`}>{isOpen ? "เปิดรับ" : "ปิดรับ"}</span></header>
    {stage === "edit" ? <>
      <section className="member-card"><label className="field-label">ชื่อสมาชิก</label><input className={`member-input ${attempted && !memberName.trim() ? "invalid" : ""}`} value={memberName} maxLength={120} onChange={event => setMemberName(event.target.value)} placeholder="ชื่อ LINE ของคุณ" />{attempted && !memberName.trim() && <small className="field-error">กรุณากรอกชื่อสมาชิก</small>}</section>
      <section className="member-card">
        <div className="section-title"><div><small>รายการที่เลือก</small><h2>{items.length} รายการ</h2></div><b>{total.toLocaleString()} หน่วย</b></div>
        <div className="item-list">{items.map((item, index) => <div className="entry-row" key={index}>
          <span className="entry-number">{index + 1}</span><input className={attempted && !/^\d{1,6}$/.test(item.value) ? "invalid" : ""} aria-label="หมายเลข" inputMode="numeric" maxLength={6} value={item.value} onChange={event => update(index, "value", event.target.value.replace(/\D/g, ""))} placeholder="เลข" />
          <select aria-label="ประเภท" value={item.category} onChange={event => update(index, "category", event.target.value)}>{categories.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select>
          <input className={attempted && Number(item.heart) <= 0 ? "invalid" : ""} aria-label="จำนวน" type="number" min="1" step="1" value={item.heart} onChange={event => update(index, "heart", event.target.value)} placeholder="จำนวน" />
          {items.length > 1 && <button className="remove-row" onClick={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))}>×</button>}
        </div>)}</div><button className="add-row" onClick={() => setItems(current => [...current, emptyItem()])}>+ เพิ่มรายการ</button>
      </section>{message && <p className="form-error">{message}</p>}<button className="primary-action" disabled={!isOpen} onClick={review}>สรุปรายการก่อนบันทึกส่ง</button>
    </> : <section className="review-card">
      <div className="review-head"><div><small>ตรวจสอบก่อนส่ง</small><h1>สรุปรายการ</h1></div><span>{items.length} รายการ</span></div><p className="review-member">สมาชิก <b>{memberName}</b></p>
      <div className="review-list">{items.map((item, index) => <div key={index}><span>{item.value}</span><small>{item.category_label}</small><b>{Number(item.heart).toLocaleString()}</b></div>)}</div>
      <div className="review-total"><span>รวมทั้งหมด</span><b>{total.toLocaleString()} หน่วย</b></div>{message && <p className="form-error">{message}</p>}
      <button className="primary-action" disabled={sending || !isOpen} onClick={submit}>{sending ? "กำลังบันทึก..." : "บันทึกส่งเข้าหลังบ้าน"}</button><button className="secondary-action" disabled={sending} onClick={() => setStage("edit")}>กลับไปแก้ไข</button>
    </section>}
  </main>
}
