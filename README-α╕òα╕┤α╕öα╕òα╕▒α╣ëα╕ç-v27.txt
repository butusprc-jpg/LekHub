LekHub LINE OA ADMIN FIX v27

แก้จุดหลัก:
- หน้า /admin/login ไม่มีช่องอีเมลแล้ว
- เปิดจาก LINE OA -> LIFF ตรวจ LINE account อัตโนมัติ
- เช็ค LINE userId ฝั่ง server ก่อนให้เข้าหลังบ้าน
- ตั้งค่า / รายงาน / เปลี่ยนสถานะ ใช้ admin session ที่เซ็นด้วย HMAC
- หน้า admin ใช้ Supabase service role เฉพาะ server หลังผ่าน LINE admin gate
- ปุ่มออกจากระบบล้าง LINE admin session

ไฟล์ใน ZIP ให้วางทับตาม path เดิม

ต้องเพิ่ม Environment Variables ใน Vercel Production:
1) LINE_ADMIN_USER_IDS
   = LINE userId ของแอดมินจริง เช่น Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   หลายคนคั่นด้วย comma
   หมายเหตุ: LINE Business ID / LINE ID / display name ใช้แทน userId ไม่ได้

2) ADMIN_SESSION_SECRET
   = ค่าสุ่มยาวอย่างน้อย 32 ตัวอักษร

3) SUPABASE_SERVICE_ROLE_KEY
   = Service Role key ของ Supabase
   เก็บเป็น Server-side เท่านั้น ห้ามใช้ NEXT_PUBLIC_

ของเดิมที่ต้องมี:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY หรือ anon key ตาม client เดิม
- NEXT_PUBLIC_LINE_LIFF_ID

หลังวางไฟล์:
- deploy Vercel
- เปิด /admin/settings ผ่าน LIFF/LINE OA
- ต้องไม่เห็นช่องอีเมล
- LINE userId ที่อยู่ใน LINE_ADMIN_USER_IDS จะเข้าได้
- user อื่นต้องโดน 403 และเข้าไม่ได้

สำคัญ:
Business ID เช่น maty80791hunger ไม่ใช่ LINE userId
LIFF ID เช่น 2011199813-swdN7h10 ก็ไม่ใช่ LINE userId


v28: เพิ่ม app/member/play/page.tsx และเปลี่ยนปุ่มหลักเป็น “บันทึกส่ง” พร้อมปุ่มยืนยัน “ยืนยันบันทึกส่ง”


v29: แก้ข้อความปุ่มตามที่กำหนด — ปุ่มหลัก “ทบทวนก่อนส่ง” และปุ่มยืนยันในหน้าทบทวน “บันทึกส่ง”
