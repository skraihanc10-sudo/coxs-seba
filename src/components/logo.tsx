import { brand } from "@/theme/brand"

/** The HANDYO mark: a blue rounded tile with a wave that turns into a checkmark (public/brand/icon.png). */
export function Mark({ size = 36 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/icon-192.png" width={size} height={size} alt="" aria-hidden className="shrink-0 select-none" draggable={false} />
}

export function Logo({ light = false, size = 34, bn = false }: { light?: boolean; size?: number; bn?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Mark size={size} />
      <span className={`display text-[1.15rem] font-extrabold ${light ? "text-white" : "text-ink"}`}>{bn ? brand.nameBn : brand.name}</span>
    </span>
  )
}
