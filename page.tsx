import { redirect } from "next/navigation"

export default function Home() {
  // The existing LINE Rich Menu opens the site root. Route that entry point
  // straight to play so mobile users never stop at the intermediate menu.
  redirect("/member/play")
}
