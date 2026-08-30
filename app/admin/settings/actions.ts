"use server"

import { revalidatePath } from "next/cache"
import { getLineAdminSession } from "../../../lib/admin-session"
import { createAdminClient } from "../../../lib/neon/admin"

export async function saveSettings(formData: FormData) {
  const access = await getLineAdminSession()
  if (!access) throw new Error("admin_required")

  const accepting = formData.get("accepting") === "on"

  const { error } = await createAdminClient().rpc(
    "lekhub_line_admin_update_settings",
    {
      p_token: access.token,
      p_accepting: accepting,
      p_close_time: "23:59",
    },
  )

  if (error) throw new Error(error.message)

  revalidatePath("/admin/settings")
  revalidatePath("/member/play")
}
