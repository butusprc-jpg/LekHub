# LekHub Cafe WebApp v0.5

Production-hardening update

## ร้าน / ลูกค้า
- จองโต๊ะและประวัติ
- จัดงานเลี้ยง
- สมาชิก + โปรไฟล์ + แต้ม
- ส่งใบเสร็จพร้อมรูปเข้า private storage
- แลกรางวัลและรับรหัส
- เกม QR ล่าตัวอักษรและต่อคำ

## หลังบ้าน
- Dashboard
- จัดการสถานะจองโต๊ะ
- จัดการงานเลี้ยง
- ตรวจ/อนุมัติบิลและเพิ่มแต้ม
- รายชื่อสมาชิก

## Security hardening applied in Supabase
- สมาชิกแก้ได้เฉพาะชื่อ เบอร์ และ avatar
- สมาชิกแก้ role / points / restaurant_id ไม่ได้
- game_collects และ word_submissions เขียนตรงไม่ได้ ต้องผ่าน RPC
- Admin RPC ใช้ได้เฉพาะ authenticated และตรวจ staff ภายใน
- handle_new_user ไม่เปิดเป็น public RPC
- receipt insert บังคับ pending/0 points/ร้านของสมาชิก
- Storage receipt-images เป็น private
- เพิ่ม WITH CHECK ให้ staff update policies
- new_booking_code มี fixed search_path

## Vercel
- Pin dependencies
- Node 24.x
- vercel.json ตั้ง Vite build -> dist
