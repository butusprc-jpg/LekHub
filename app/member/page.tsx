import Link from "next/link"

export default function Member() {
  return <main className="member-shell">
    <header className="member-header">
      <Link href="/member/play" className="back-link">‹</Link>
      <div><small>LEKHUB MEMBER</small><h1>เมนูสมาชิก</h1></div>
    </header>

    <section className="member-card member-menu">
      <Link href="/member/play">
        <span>▶</span><div><b>เล่น / บันทึกรายการ</b><small>เลือกและส่งรายการเข้าหลังบ้าน</small></div><strong>›</strong>
      </Link>
      <Link href="/report">
        <span>▤</span><div><b>รายงานของฉัน</b><small>ตรวจสอบรายการที่เคยส่ง</small></div><strong>›</strong>
      </Link>
      <Link href="/rules">
        <span>ⓘ</span><div><b>กฎกติกา</b><small>อ่านรายละเอียดก่อนใช้งาน</small></div><strong>›</strong>
      </Link>
    </section>
  </main>
}
