# Supabase live backend map

Project: `uhpgnwclyzjnmnbrnglb`

## Core tables
- `lekhub_settings`
- `lekhub_blocked_values`
- `lekhub_submissions`
- `lekhub_submission_items`
- `lekhub_backoffice_reports`
- `lekhub_backoffice_report_items`
- `lekhub_activity_rewards`
- LINE admin/session tables created by migrations

## Core RPCs currently used by UI
- `get_lekhub_public_status`
- `submit_lekhub_submission`
- `lekhub_member_list_submissions`
- `lekhub_member_get_note`
- `lekhub_member_set_note`
- `lekhub_check_line_admin_session`
- `lekhub_line_admin_login`
- `lekhub_logout_line_admin_session`
- `lekhub_line_admin_list_oa_inbox`
- `lekhub_line_admin_set_submission_status`
- `lekhub_line_admin_import_submission`
- `lekhub_line_admin_list_backoffice_reports`
- `lekhub_line_admin_get_settings`
- `lekhub_line_admin_update_settings`
- `lekhub_line_admin_update_category_amounts`
- `lekhub_line_admin_replace_blocked_values`
- `lekhub_line_admin_set_activity_result`
- `lekhub_line_admin_list_members`

## Storage
Bucket: `lekhub-uploads`
There is also an Edge Function `lekhub-cleanup-uploads` used for cleanup of old unreferenced uploads.

## Admin owner known in live DB at handoff
Display name: `lotus`
Role: `owner`
The new room should re-read live Supabase instead of copying a user ID into code.
