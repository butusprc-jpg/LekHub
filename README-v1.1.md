# v1.1 — LINE Reminder Workflow
- หน้าแรกหลังบ้านมี “สิ่งที่ต้องทำของแอดมิน” รวมวันนี้และพรุ่งนี้
- แสดงโต๊ะรอยืนยัน, ห้องไพรเวทที่ต้องจัดการ, และรายการพรุ่งนี้
- Supabase มีคิว LINE notification
- แอดมิน: สรุปงานพรุ่งนี้ล่วงหน้า 1 วัน (คิวเวลา 18:00 น. ไทย) และเตือนซ้ำ 09:00 น.
- ลูกค้า: จองโต๊ะที่ยืนยันแล้วและมี LINE user id จะถูกเตือนก่อนเวลา 30 นาที
- Edge Function dispatch-line-reminders ถูก deploy แล้ว
- ต้องตั้ง LINE_CHANNEL_ACCESS_TOKEN ใน Supabase Edge Function secrets และผูก line_user_id ผ่าน LINE LIFF จึงจะส่งออก LINE จริง
