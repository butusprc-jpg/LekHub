"use server"

import { revalidatePath } from "next/cache"
import { getLineAdminSession } from "../../../lib/admin-session"
import { createAdminClient } from "../../../lib/supabase/admin"

export async function saveSettings(formData: FormData) {
  const access = await getLineAdminSession()
  if (!access) throw new Error("admin_required")

  const accepting = formData.get("accepting") === "on"
  const closeTime = String(formData.get("close_time") || "")

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(closeTime)) {
    throw new Error("invalid_close_time")
  }

  const { error } = await createAdminClient().rpc(
    "admin_update_lekhub_settings",
    { p_accepting: accepting, p_close_time: closeTime },
  )

  if (error) throw new Error(error.message)

  revalidatePath("/admin/settings")
  revalidatePath("/member/play")
}
