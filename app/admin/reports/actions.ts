"use server"

import { revalidatePath } from "next/cache"
import { getLineAdminSession } from "../../../lib/admin-session"
import { createAdminClient } from "../../../lib/neon/admin"

export async function updateSubmission(formData: FormData) {
  const access = await getLineAdminSession()
  if (!access) throw new Error("admin_required")

  const id = String(formData.get("id") || "")
  const status = String(formData.get("status") || "")

  if (!/^[0-9a-f-]{36}$/i.test(id) || !["pending", "reviewed", "cancelled"].includes(status)) {
    throw new Error("invalid_request")
  }

  const { error } = await createAdminClient().rpc(
    "lekhub_line_admin_set_submission_status",
    { p_token: access.token, p_submission_id: id, p_status: status },
  )
  if (error) throw new Error(error.message)

  revalidatePath("/admin/reports")
  revalidatePath("/admin")
}

export async function importSubmission(formData: FormData) {
  const access = await getLineAdminSession()
  if (!access) throw new Error("admin_required")

  const id = String(formData.get("id") || "")
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("invalid_request")

  const { data, error } = await createAdminClient().rpc(
    "lekhub_line_admin_import_submission",
    { p_token: access.token, p_submission_id: id },
  )

  if (error) throw new Error(error.message)
  if (!data?.success) {
    if (data?.reason === "review_required") throw new Error("review_required")
    throw new Error(data?.reason || "import_failed")
  }

  revalidatePath("/admin/reports")
  revalidatePath("/admin/backoffice")
  revalidatePath("/admin")
}
