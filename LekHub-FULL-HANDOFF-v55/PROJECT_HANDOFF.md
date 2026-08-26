# LekHub – FULL HANDOFF

This bundle is for continuing the same program in another ChatGPT room.

## Source of truth
- GitHub repository: `butusprc-jpg/LekHub`
- Branch: `main`
- GitHub snapshot inspected: `4da51eb0ce41f1cde572db586f778caab8932a54`
- Production: `https://lek-hub.vercel.app`
- Supabase project: `uhpgnwclyzjnmnbrnglb`
- LIFF ID: `2011199813-swdN7h10`
- LINE OA/business ID: `maty80791hunger`

## Important
The full historical GitHub repository also contains many old audit/readme files, legacy `src/main.jsx`, old assets, and UI reference images. The active deployment is the root Next.js app (`app/`, `lib/`, root configs).

`LATEST_OVERLAY/` contains the latest operational files from this conversation and the auth/session helpers most likely to matter when continuing. The current GitHub snapshot already matched the latest edited file sizes for the v54 pages, but overlaying this folder is the safest transfer method.

## Current member flow
1. Member opens `/member/play` through LINE/LIFF.
2. Member picks type/number/amount.
3. Blocked numbers are enforced.
4. If `สด` is selected, an image is required for that submission.
5. Member reviews and submits.
6. Supabase stores submission and items with round date.
7. OA Flex message can link admin to `/admin/reports?focus=<submission-id>`.
8. Admin reviews then imports.
9. Imported rows appear in `/admin/backoffice`.
10. Member can open `/report` to see own submissions/rewards and edit a persistent long note.

## Round rules
Automatic round if admin does not override:
- day 1 -> round 01 of same month
- day 2..16 -> round 16 of same month
- day 17 onward -> round 01 of next month
Admin can override the round date in settings.

## Activity reward
Admin settings contain:
- previous round 6-digit number
- activity prize 6-digit number
- category multipliers

When prize is saved, backend compares current-round submission items and creates reward rows.
Example: prize `123456`, a matching `3 บน` item `456` with stake `100`, multiplier `X` => reward `100 × X`.

## Current matching logic in backend
- `3top`: exact last 3 digits
- `3topmix`/`mix`: same three digits in any order
- `2top` and current backend `bottom`: exact last 2 digits
- `single`: exact last digit

## Admin sections
- ภาพรวม
- กล่องรับ
- สมาชิก
- ตารางกิจกรรม
- ตั้งค่าระบบ

## Table activity exports
Dropdown:
- เก็บเอง
- ส่งสำนักงาน
- วิเคราะห์

`ส่งสำนักงาน` columns:
- รอบเล่น
- วันที่ส่ง
- เลขที่เลือก
- ประเภท
- ยอด
Last row = รวมยอดทั้งหมด

`วิเคราะห์` columns:
- เลข
- ประเภท
- รางวัล

## Member note
The report page no longer uses a member report image upload. It uses a long editable text note.
The note is stored per LINE user and shown in Admin > สมาชิก.

## LINE reward push
`/api/admin/reward-notify` uses `LINE_CHANNEL_ACCESS_TOKEN`.
If the secret is absent, database rewards still work but LINE push is skipped.

## Locked historical constraints
- Do not bring back the old Supabase Auth middleware redirect loop.
- LINE admin client session is the working admin flow.
- Do not confuse OA business ID / LIFF ID with a Messaging API recipient user ID.
- Do not change ID rules casually.
- Always verify the actual file before delivering a patch.
- Static parser checks are not browser/LINE end-to-end tests.
