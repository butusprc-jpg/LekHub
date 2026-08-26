# LekHub current routes

## Member
- `/` -> root entry
- `/member` -> member menu
- `/member/play` -> play / submit screen
- `/report` -> member report, rewards and persistent member note
- `/rules` -> rules page

## Admin
- `/admin` -> overview
- `/admin/login` -> admin login
- `/admin/reports` -> กล่องรับ
- `/admin/backoffice` -> ตารางกิจกรรม
- `/admin/members` -> สมาชิก
- `/admin/settings` -> settings

## API
- `POST /api/admin/line-login`
- `POST /api/admin/logout`
- `GET /api/admin/session`
- `GET /api/admin/session-check`
- `POST /api/admin/reward-notify`

## Legacy auth routes still present in GitHub
- `/auth/callback`
- `/auth/signout`
