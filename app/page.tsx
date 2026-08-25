import Link from "next/link";

export default function Home() {
  return (
    <main style={{padding:"40px", fontFamily:"Arial"}}>
      <h1>LekHub</h1>
      <p>LINE OA Member System</p>

      <div style={{display:"grid",gap:"12px",maxWidth:"320px",marginTop:"30px"}}>
        <Link href="/member" style={{padding:"14px",border:"1px solid #ccc",borderRadius:"8px"}}>
          สมาชิก
        </Link>
        <Link href="/member/play" style={{padding:"14px",border:"1px solid #ccc",borderRadius:"8px"}}>
          เล่นกิจกรรม
        </Link>
        <Link href="/rules" style={{padding:"14px",border:"1px solid #ccc",borderRadius:"8px"}}>
          กฎกติกา
        </Link>
        <Link href="/report" style={{padding:"14px",border:"1px solid #ccc",borderRadius:"8px"}}>
          รายงาน
        </Link>
        <Link href="/admin/login" style={{padding:"14px",border:"1px solid #ccc",borderRadius:"8px"}}>
          หลังบ้าน Admin
        </Link>
      </div>
    </main>
  );
}
