import { Building2, Droplets, Fish, HardHat, Pencil, Ship, Shirt, Snowflake, Sparkles, Store, Truck, Wifi, Wrench, Zap, type LucideIcon, Car } from "lucide-react"

const ICONS: Record<string, LucideIcon> = {
  shirt: Shirt,
  wifi: Wifi,
  zap: Zap,
  droplet: Droplets,
  snow: Snowflake,
  spark: Sparkles,
  building: Building2,
  truck: Truck,
  hardhat: HardHat,
  pencil: Pencil,
  wrench: Wrench,
  car: Car,
  fish: Fish,
  ship: Ship,
  store: Store,
}

export const ICON_NAMES = Object.keys(ICONS)

export function CategoryIcon({ name, className = "size-6" }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Sparkles
  return <Icon className={className} />
}
