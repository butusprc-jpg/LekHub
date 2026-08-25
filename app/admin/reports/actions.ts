"use server"

import { revalidatePath } from "next/cache"
import { getLineAdminSession } from "../../../lib/admin-session"
import { createAdminClient } from "../../../lib/supabase/admin"

export async function updateSubmission(formData: FormData) {
  const access = await getLineAdminSession()
  if (!access) throw new Error("admin_required")

  const id = String(formData.get("id") || "")
  const status = String(formData.get("status") || "")

  if (
    !/^[0-9a-f-]{36}$/i.test(id) ||
    !["pending", "reviewed", "cancelled"].includes(status)
  ) {
    throw new Error("invalid_request")
  }

  const { error } = await createAdminClient().rpc(
    "admin_set_lekhub_submission_status",
    { p_submission_id: id, p_status: status },
  )

  if (error) throw new Error(error.message)

  revalidatePath("/admin/reports")
  revalidatePath("/admin")
}
