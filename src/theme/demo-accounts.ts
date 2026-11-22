/** Demo sign-ins. The seed script and the login screen both read this list. */
export const demoAccounts = [
  { role: "CUSTOMER", label: "কাস্টমার", email: "customer@needcoxs.test", password: "customer123", name: "রাশেদ আহমেদ", phone: "01711000001" },
  { role: "OWNER", label: "মালিক (সব শপ)", email: "owner@needcoxs.test", password: "owner123", name: "HANDYO মালিক", phone: "01711000004" },
  { role: "ADMIN", label: "অ্যাডমিন (কক্সবাজার)", email: "admin@needcoxs.test", password: "admin123", name: "HANDYO অ্যাডমিন", phone: "01711000002" },
  { role: "SUPPORT", label: "সাপোর্ট (কক্সবাজার)", email: "support@needcoxs.test", password: "support123", name: "নুসরাত (কাস্টমার কেয়ার)", phone: "01711000003" },
] as const

/** Staff of the second demo branch (Dhaka). */
export const demoShopStaff = [
  { role: "ADMIN", shop: "dhaka", email: "dhaka.admin@needcoxs.test", password: "admin123", name: "ফারহানা (ঢাকা অ্যাডমিন)", phone: "01711000005" },
] as const

/** Our field team. Every worker signs in with the same demo password. */
export const WORKER_PASSWORD = "rider123"

export const demoWorkers = [
  { shop: "coxs", email: "rider@needcoxs.test", name: "সাইফুল (লন্ড্রি রাইডার)", phone: "01811000001", isRider: true, skills: ["laundry"] },
  { shop: "coxs", email: "sumon.wifi@needcoxs.test", name: "সুমন (ওয়াইফাই টেকনিশিয়ান)", phone: "01811000002", isRider: false, skills: ["wifi"] },
  { shop: "coxs", email: "jamal.electric@needcoxs.test", name: "জামাল (ইলেকট্রিশিয়ান)", phone: "01811000003", isRider: false, skills: ["electrician"] },
  { shop: "coxs", email: "rina.clean@needcoxs.test", name: "রিনা (ক্লিনিং টিম লিড)", phone: "01811000004", isRider: false, skills: ["home-cleaning", "resort-cleaning"] },
  { shop: "coxs", email: "karim.plumber@needcoxs.test", name: "করিম (প্লাম্বার)", phone: "01811000005", isRider: false, skills: ["plumber", "labour", "shifting"] },
  { shop: "coxs", email: "rafiq.ac@needcoxs.test", name: "রফিক (এসি ও ফ্রিজ মেকানিক)", phone: "01811000006", isRider: false, skills: ["ac-fridge", "electrician", "other"] },
  { shop: "coxs", email: "faruk.driver@needcoxs.test", name: "ফারুক (ড্রাইভার)", phone: "01811000007", isRider: false, skills: ["rent-a-car"] },
  /** An outside vehicle owner (partner) who rents through HANDYO. */
  { shop: "coxs", email: "partner.rony@needcoxs.test", name: "রনি (গাড়ির মালিক, পার্টনার)", phone: "01811000008", isRider: false, skills: ["rent-a-car"], kind: "PARTNER" },
  { shop: "dhaka", email: "dhaka.electric@needcoxs.test", name: "হাসান (ইলেকট্রিশিয়ান, ঢাকা)", phone: "01811000101", isRider: false, skills: ["electrician", "ac-fridge"] },
] as const
