import Link from "next/link"

export default function Rules() {
  return <main className="member-shell">
    <header className="member-header">
      <Link href="/member" className="back-link">‹</Link>
      <div><small>LEKHUB MEMBER</small><h1>กฎกติกา</h1></div>
    </header>
    <section className="member-card">
      <p>หน้ากฎกติกาพร้อมสำหรับใส่รายละเอียดภายหลัง</p>
      <Link href="/member">กลับเมนูสมาชิก</Link>
    </section>
  </main>
}
