/** The HANDYO "Y" mark alone (public/brand/icon-192.png), for tight spots like the bottom nav or favicons. */
export function Mark({ size = 36 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/icon-192.png" width={size} height={size} alt="" aria-hidden className="shrink-0 select-none" draggable={false} />
}

/**
 * The official HANDYO wordmark (navy letters, blue/orange Y). `light` swaps in
 * the white-letter version for dark bars; `short` shrinks it on tiny phones.
 */
export function Logo({ light = false, size = 30, short = false }: { light?: boolean; size?: number; bn?: boolean; short?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={light ? "/brand/logo-white.png" : "/brand/logo.png"} alt="HANDYO" style={{ height: size, width: "auto" }} className={`shrink-0 select-none ${short ? "max-[400px]:h-6" : ""}`} draggable={false} />
}
