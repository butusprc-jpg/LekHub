import Link from "next/link"

export default function Report() {
  return <main className="member-shell">
    <header className="member-header">
      <Link href="/member" className="back-link">‹</Link>
      <div><small>LEKHUB MEMBER</small><h1>รายงานของฉัน</h1></div>
    </header>
    <section className="member-card">
      <p>หน้ารายงานพร้อมใช้งานสำหรับเชื่อมข้อมูลรายการที่สมาชิกส่ง</p>
      <Link href="/member">กลับเมนูสมาชิก</Link>
    </section>
  </main>
}
