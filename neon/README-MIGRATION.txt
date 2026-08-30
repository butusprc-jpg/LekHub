LekHub Neon preparation

1. Run 001_lekhub_neon_schema.sql on a NEW Neon database.
2. Run 002_neon_smoke_test.sql. It must finish without error; it rolls back test data.
3. Set DATABASE_URL, BLOB_READ_WRITE_TOKEN, NEXT_PUBLIC_LINE_LIFF_ID in Vercel.
4. Keep the existing Supabase production project untouched until data export/import is verified.
5. Migrate production data tenant-by-tenant only after row counts and tenant isolation checks match.
6. Do not switch the production Vercel DATABASE_URL until member submit, admin login, reports, settings, rental lifecycle, and LINE push all pass on staging.
