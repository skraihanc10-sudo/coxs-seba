/** Shop-scoping helpers that are safe in client components (no next/headers, no db). */
export const isOffice = (role: string) => role === "ADMIN" || role === "SUPPORT" || role === "OWNER"

/** True when this staff member may touch rows of `shopId`. Owners see every shop. */
export function staffCanSee(user: { role: string; shopId?: string | null }, shopId: string) {
  if (user.role === "OWNER") return true
  return Boolean(user.shopId) && user.shopId === shopId
}
