import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import { Noto_Sans_Bengali, Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { brand } from "@/theme/brand"
import { SITE_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/seo"
import { getLocale } from "@/lib/auth"
import { Toaster } from "@/components/ui/sonner"

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})

/** Body text in Bangla: readable at small sizes on phones. */
const bengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bengali",
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

/** Nikosh, the Bangladesh Government's standard Bangla face, for headings. */
const nikosh = localFont({
  src: "../fonts/Nikosh.woff2",
  variable: "--font-nikosh",
  display: "swap",
  weight: "400",
})

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const bn = locale === "bn"
  const title = bn ? brand.nameBn : brand.name
  const description = bn ? brand.taglineBn : brand.tagline
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s · ${SITE_NAME}` },
    description,
    applicationName: SITE_NAME,
    keywords: SITE_KEYWORDS,
    category: "home services",
    creator: SITE_NAME,
    publisher: SITE_NAME,
    formatDetection: { telephone: true, email: false, address: false },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    appleWebApp: { capable: true, title: brand.nameBn, statusBarStyle: "default" },
    openGraph: {
      title,
      description,
      url: SITE_URL,
      siteName: SITE_NAME,
      locale: bn ? "bn_BD" : "en_US",
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE_NAME} · Home services at your door` }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  }
}

export const viewport: Viewport = {
  themeColor: "#1259e8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export const dynamic = "force-dynamic"

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  return (
    <html
      lang={locale}
      data-theme={brand.theme}
      className={`${sans.variable} ${bengali.variable} ${nikosh.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
