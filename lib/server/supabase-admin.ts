import { neonRpc } from "./neon-db"

export function createServerAdminClient(){
 return {rpc:neonRpc}
}
