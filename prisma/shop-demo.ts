/**
 * Starter catalogue for the product shop (category "cox-shutki"), taken from the
 * owner's existing Cox Shutki & Acher store. Photos live in public/demo/shop.
 * Only used by the seed when a shop has no products yet.
 */
export const SHOP_GROUPS: Array<{ slug: string; nameBn: string; name: string }> = [
  { slug: "shutki", nameBn: "শুঁটকি", name: "Dried fish" },
  { slug: "shutki-achar", nameBn: "শুঁটকি আচার", name: "Dried-fish pickle" },
  { slug: "pahari-achar", nameBn: "পাহাড়ি হোমমেড আচার", name: "Hill homemade pickle" },
  { slug: "burmese-achar", nameBn: "বার্মিজ আচার", name: "Burmese pickle" },
  { slug: "chatni", nameBn: "চাটনি", name: "Chutney" },
  { slug: "balachao", nameBn: "বালাচাও", name: "Balachao" },
  { slug: "dry-food", nameBn: "ড্রাই ফুড", name: "Dry food" },
  { slug: "mosla", nameBn: "পাহাড়ি মসলা", name: "Hill spices" },
  { slug: "combo", nameBn: "কম্বোপ্যাকেজ", name: "Combo packages" },
  { slug: "chocolate", nameBn: "চকলেট", name: "Chocolate & bars" }
]

export const SHOP_PRODUCTS: Array<{ group: string; name: string; nameBn: string; photo: string; badge: string; variants: Array<{ label: string; price: number; oldPrice: number }> }> = [
  { group: "burmese-achar", name: "Chanachur", nameBn: "মধুবন চানাচুর", photo: "mudobon.jpg", badge: "সেরা পছন্দ", variants: [{ label: "১ প্যাক", price: 80, oldPrice: 90 }] },
  { group: "burmese-achar", name: "Mango", nameBn: "আমসত্ব ছোট", photo: "mango-small.jpg", badge: "সেরা পছন্দ", variants: [{ label: "১ প্যাক", price: 190, oldPrice: 220 }] },
  { group: "dry-food", name: "Hajmi", nameBn: "ভাইরাল হজমী পাউডার", photo: "hojomi.jpg", badge: "সেরা পছন্দ", variants: [{ label: "১ প্যাক", price: 150, oldPrice: 180 }] },
  { group: "combo", name: "shutki pakage", nameBn: "শুঁটকি ভর্তা প্যাকেজ", photo: "shutki-borta-pakage-2.jpg", badge: "সেরা পছন্দ", variants: [{ label: "১ প্যাক", price: 1590, oldPrice: 1930 }] },
  { group: "chatni", name: "Haiko", nameBn: "নাগামরিচ চাটনি", photo: "haiko-naga-moric.jpg", badge: "সেরা পছন্দ", variants: [{ label: "১ প্যাক", price: 190, oldPrice: 260 }] },
  { group: "dry-food", name: "Mini Huney Nuts", nameBn: "Mini Huney Nuts", photo: "huney-nuts.jpg", badge: "সেরা পছন্দ", variants: [{ label: "১ প্যাক", price: 180, oldPrice: 240 }] },
  { group: "shutki-achar", name: "Dry fish pickle", nameBn: "ইলিশ শুঁটকি আচার", photo: "ilish-shutki-acher.jpg", badge: "", variants: [{ label: "২৫০ গ্রাম", price: 450, oldPrice: 0 }, { label: "৫০০ গ্রাম", price: 850, oldPrice: 0 }, { label: "১ কেজি", price: 1650, oldPrice: 0 }] },
  { group: "balachao", name: "Mix Balcaojpg", nameBn: "মিক্স বালাচাও", photo: "mix-balcaojpg.jpg", badge: "", variants: [{ label: "২৫০ গ্রাম", price: 250, oldPrice: 0 }, { label: "৫০০ গ্রাম", price: 500, oldPrice: 0 }, { label: "১ কেজি", price: 750, oldPrice: 0 }] },
  { group: "burmese-achar", name: "Spicy", nameBn: "বার্মিজ ৯৯৯", photo: "999-barmicsjpg.jpg", badge: "", variants: [{ label: "১ প্যাক", price: 180, oldPrice: 200 }] },
  { group: "combo", name: "Combo 1499 tk", nameBn: "Combo 1499 tk", photo: "combo-1499.jpg", badge: "", variants: [{ label: "১ প্যাক", price: 1499, oldPrice: 1700 }] },
  { group: "chocolate", name: "Mixed Oats", nameBn: "Mixed Oats", photo: "mixed-oat.jpg", badge: "", variants: [{ label: "১ প্যাক", price: 320, oldPrice: 350 }] },
  { group: "balachao", name: "Spicy", nameBn: "নাগা বালাচাও", photo: "naga-balacao.jpg", badge: "", variants: [{ label: "২৫০ গ্রাম", price: 380, oldPrice: 0 }, { label: "৫০০ গ্রাম", price: 690, oldPrice: 0 }, { label: "১ কেজি", price: 999, oldPrice: 0 }] },
  { group: "dry-food", name: "Nut", nameBn: "বার্মিজ কাঠবাদাম", photo: "katbadam-2.jpg", badge: "", variants: [{ label: "২৫০ গ্রাম", price: 170, oldPrice: 0 }, { label: "৫০০ গ্রাম", price: 250, oldPrice: 0 }, { label: "১ কেজি", price: 330, oldPrice: 0 }] },
  { group: "dry-food", name: "Sonpapri", nameBn: "ক্ষিরমালাই শনপাপড়ি", photo: "son-papri-3.jpg", badge: "", variants: [{ label: "১ প্যাক", price: 350, oldPrice: 400 }] },
  { group: "dry-food", name: "coconut", nameBn: "নারকেল ভাজা", photo: "narikel-baja.jpg", badge: "", variants: [{ label: "১ প্যাক", price: 350, oldPrice: 400 }] },
  { group: "balachao", name: "Spicy", nameBn: "চিংড়ি বালাচাও", photo: "small-balacao.jpg", badge: "", variants: [{ label: "২৫০ গ্রাম", price: 220, oldPrice: 0 }, { label: "৫০০ গ্রাম", price: 440, oldPrice: 0 }, { label: "১ কেজি", price: 660, oldPrice: 0 }] },
  { group: "chatni", name: "Sigma", nameBn: "নাগামরিচ চাটনি", photo: "sigma-naga---catni.jpg", badge: "", variants: [{ label: "১ প্যাক", price: 190, oldPrice: 250 }] },
  { group: "shutki-achar", name: "Cori Shutki Acher", nameBn: "ছুরি শুঁটকি আচার", photo: "cori-shutki-acher.jpg", badge: "", variants: [{ label: "২৫০ গ্রাম", price: 450, oldPrice: 0 }, { label: "৫০০ গ্রাম", price: 850, oldPrice: 0 }, { label: "১ কেজি", price: 1650, oldPrice: 0 }] },
  { group: "shutki-achar", name: "Loitta Shutki Acher", nameBn: "লইট্টা শুঁটকি আচার", photo: "loitta-shutki-acher.jpg", badge: "", variants: [{ label: "২৫০ গ্রাম", price: 450, oldPrice: 0 }, { label: "৫০০ গ্রাম", price: 850, oldPrice: 0 }, { label: "১ কেজি", price: 1650, oldPrice: 0 }] },
  { group: "shutki-achar", name: "Cepa Shutki Acher", nameBn: "চেপা শুটকি আচার", photo: "cepa-shutki-acher.jpg", badge: "", variants: [{ label: "২৫০ গ্রাম", price: 450, oldPrice: 0 }, { label: "৫০০ গ্রাম", price: 850, oldPrice: 0 }, { label: "১ কেজি", price: 1650, oldPrice: 0 }] },
  { group: "combo", name: "Combo 650 tk", nameBn: "Combo 650 tk", photo: "comboe-650.jpg", badge: "", variants: [{ label: "১ প্যাক", price: 650, oldPrice: 760 }] },
  { group: "combo", name: "Combo 1050 tk", nameBn: "Combo 1050 tk", photo: "combo-1050.jpg", badge: "", variants: [{ label: "১ প্যাক", price: 1050, oldPrice: 1200 }] },
  { group: "chatni", name: "Yammi", nameBn: "মিক্স চাটনি", photo: "yammi-mix-catni.jpg", badge: "", variants: [{ label: "১ প্যাক", price: 190, oldPrice: 250 }] },
  { group: "chatni", name: "Sigma", nameBn: "রসুন চাটনি", photo: "sigma-roson.jpg", badge: "", variants: [{ label: "১ প্যাক", price: 190, oldPrice: 250 }] },
  { group: "chocolate", name: "X Oats Bar", nameBn: "X Oats Bar", photo: "x-oat-bar.jpg", badge: "", variants: [{ label: "১ প্যাক", price: 320, oldPrice: 350 }] },
  { group: "chocolate", name: "Demy Vixel", nameBn: "Demy Vixel", photo: "demy-vixel.jpg", badge: "", variants: [{ label: "১ প্যাক", price: 300, oldPrice: 330 }] },
  { group: "chocolate", name: "Oat Choco G/O", nameBn: "Oat Choco G/O", photo: "go-oat-choco.jpg", badge: "", variants: [{ label: "১ প্যাক", price: 320, oldPrice: 350 }] },
  { group: "chocolate", name: "Healthy Bar", nameBn: "Healthy Bar", photo: "healty-bar.jpg", badge: "", variants: [{ label: "১ প্যাক", price: 320, oldPrice: 350 }] },
  { group: "chocolate", name: "Moonize", nameBn: "Moonize", photo: "moonize.jpg", badge: "", variants: [{ label: "১ প্যাক", price: 320, oldPrice: 350 }] },
  { group: "chocolate", name: "Nuts Crisp", nameBn: "Nuts Crisp", photo: "nuts-crisp.jpg", badge: "", variants: [{ label: "১ প্যাক", price: 320, oldPrice: 350 }] },
  { group: "shutki", name: "Borta Loitta", nameBn: "ভর্তা লইট্টা", photo: "borta-loitta.jpg", badge: "", variants: [{ label: "২৫০ গ্রাম", price: 700, oldPrice: 0 }, { label: "৫০০ গ্রাম", price: 1000, oldPrice: 0 }, { label: "১ কেজি", price: 1300, oldPrice: 0 }] },
  { group: "shutki", name: "Pachmisali", nameBn: "পাঁচমিশালি", photo: "pachmisali.jpg", badge: "", variants: [{ label: "২৫০ গ্রাম", price: 600, oldPrice: 0 }, { label: "৫০০ গ্রাম", price: 850, oldPrice: 0 }, { label: "১ কেজি", price: 1100, oldPrice: 0 }] },
  { group: "shutki", name: "Misti Cigri", nameBn: "মিষ্টি চিংড়ি", photo: "misti-cigri.jpg", badge: "", variants: [{ label: "২৫০ গ্রাম", price: 850, oldPrice: 0 }, { label: "৫০০ গ্রাম", price: 1250, oldPrice: 0 }, { label: "১ কেজি", price: 1650, oldPrice: 0 }] },
  { group: "shutki", name: "Shutki 22", nameBn: "সুরমা শুঁটকি", photo: "shutki-22.jpg", badge: "", variants: [{ label: "২৫০ গ্রাম", price: 1499, oldPrice: 0 }, { label: "৫০০ গ্রাম", price: 2100, oldPrice: 0 }, { label: "১ কেজি", price: 2699, oldPrice: 0 }] },
  { group: "shutki", name: "Shutki 8", nameBn: "রুপচাঁদা বড়", photo: "shutki-8.jpg", badge: "", variants: [{ label: "২৫০ গ্রাম", price: 900, oldPrice: 0 }, { label: "৫০০ গ্রাম", price: 2150, oldPrice: 0 }, { label: "১ কেজি", price: 3400, oldPrice: 0 }] },
  { group: "shutki", name: "Misti Cori", nameBn: "ফারা ছুরি", photo: "misti-cori.jpg", badge: "", variants: [{ label: "২৫০ গ্রাম", price: 900, oldPrice: 0 }, { label: "৫০০ গ্রাম", price: 1300, oldPrice: 0 }, { label: "১ কেজি", price: 1700, oldPrice: 0 }] },
  { group: "shutki", name: "Jati Cori", nameBn: "জাতি ছুরি", photo: "jati-cori.jpg", badge: "", variants: [{ label: "২৫০ গ্রাম", price: 1300, oldPrice: 0 }, { label: "৫০০ গ্রাম", price: 2000, oldPrice: 0 }, { label: "১ কেজি", price: 2700, oldPrice: 0 }] },
  { group: "shutki", name: "Lakka", nameBn: "সামুদ্রিক লাক্ষা ১০ দারি", photo: "lakka.jpg", badge: "", variants: [{ label: "২৫০ গ্রাম", price: 4700, oldPrice: 0 }, { label: "৫০০ গ্রাম", price: 6950, oldPrice: 0 }, { label: "১ কেজি", price: 9200, oldPrice: 0 }] },
]
