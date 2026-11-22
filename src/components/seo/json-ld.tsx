import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo"

type Json = Record<string, unknown>

/** Structured data for search engines. Renders one application/ld+json script. */
export function JsonLd({ data }: { data: Json | Json[] }) {
  const list = Array.isArray(data) ? data : [data]
  return (
    <>
      {list.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          // JSON is escaped so a "</script>" inside a string cannot close the tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, "\\u003c") }}
        />
      ))}
    </>
  )
}

type ShopLike = {
  slug: string
  name: string
  nameBn?: string
  city: string
  cityBn?: string
  phone?: string
  email?: string
  address?: string
}

type SettingsLike = { helpline?: string; whatsapp?: string; supportEmail?: string; addressEn?: string; officeHoursEn?: string }

export function organization(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/pwa-icon?size=512"),
    image: absoluteUrl("/opengraph-image"),
    description: "Every home service, done by our own team. Laundry, electricians, plumbers, cleaning, AC, moving and car & bike rental in Bangladesh.",
    areaServed: { "@type": "Country", name: "Bangladesh" },
  }
}

/** One branch as a local business: name, phone, address, the areas it serves. */
export function localBusiness(shop: ShopLike, settings: SettingsLike = {}, areas: Array<{ name: string }> = []): Json {
  const telephone = shop.phone || settings.helpline || ""
  const street = shop.address || settings.addressEn || ""
  return {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    "@id": absoluteUrl(`/branches/${shop.slug}#business`),
    name: shop.name,
    alternateName: shop.nameBn,
    url: absoluteUrl(`/branches/${shop.slug}`),
    image: absoluteUrl("/opengraph-image"),
    ...(telephone ? { telephone } : {}),
    ...(shop.email || settings.supportEmail ? { email: shop.email || settings.supportEmail } : {}),
    address: {
      "@type": "PostalAddress",
      ...(street ? { streetAddress: street } : {}),
      addressLocality: shop.city,
      addressCountry: "BD",
    },
    ...(areas.length ? { areaServed: areas.map((a) => ({ "@type": "Place", name: a.name })) } : { areaServed: { "@type": "City", name: shop.city } }),
    parentOrganization: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    priceRange: "৳৳",
    currenciesAccepted: "BDT",
    paymentAccepted: "Cash, bKash, Nagad",
  }
}

type CategoryLike = { slug: string; name: string; blurb?: string }
type OfferingLike = { slug: string; name: string; detail?: string; price: number; pricing: string }

/** A service category with its priced offerings as an OfferCatalog. */
export function serviceLd(category: CategoryLike, offerings: OfferingLike[], shop: ShopLike): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: category.name,
    ...(category.blurb ? { description: category.blurb } : {}),
    url: absoluteUrl(`/services/${category.slug}`),
    serviceType: category.name,
    areaServed: { "@type": "City", name: shop.city },
    provider: { "@type": "HomeAndConstructionBusiness", name: shop.name, url: absoluteUrl(`/branches/${shop.slug}`) },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: category.name,
      itemListElement: offerings.map((o) => ({
        "@type": "Offer",
        name: o.name,
        ...(o.detail ? { description: o.detail } : {}),
        url: absoluteUrl(`/book/${category.slug}/${o.slug}`),
        priceCurrency: "BDT",
        ...(o.pricing !== "QUOTE" && o.price > 0 ? { price: o.price } : {}),
        availability: "https://schema.org/InStock",
        itemOffered: { "@type": "Service", name: o.name },
      })),
    },
  }
}

export function faqLd(faqs: Array<{ question: string; answer: string }>): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  }
}

export function breadcrumbs(items: Array<{ name: string; path: string }>): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}
