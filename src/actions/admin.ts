"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { AppError } from "@/lib/errors"
import { run, type ActionState } from "@/lib/action"
import { actor } from "@/lib/auth"
import { normalisePhone } from "@/lib/format"
import { saveImages } from "@/lib/uploads"
import { saveSettings, SETTING_DEFAULTS, SETTING_KEYS } from "@/lib/settings"
import { ADMINS, OFFICE } from "@/lib/roles"
import { OFFICE_SHOP_COOKIE, officeShopId, staffCanSee } from "@/lib/shops"
import { areaSchema, categorySchema, couponSchema, faqSchema, formObject, offeringSchema, parse, shopSchema, staffSchema, templateSchema, workerSchema } from "@/lib/validation"
import { saveCoupon } from "@/lib/coupons"

const done = (path = "/admin") => {
  revalidatePath(path, "layout")
  revalidatePath("/", "layout")
}

/** Row must exist and belong to the shop the admin is working in. */
function owned<T extends { shopId: string }>(row: T | null, user: { role: string; shopId?: string | null }, shopId: string) {
  if (!row || row.shopId !== shopId || !staffCanSee(user, row.shopId)) throw new AppError("পাওয়া যায়নি।", "Not found.")
  return row
}

// ── Shops (owner only) ─────────────────────────────────────────────────────

/** Owner switches which shop the office panels show. */
export async function setOfficeShopAction(form: FormData) {
  await actor(["OWNER"])
  const id = String(form.get("shopId") ?? "")
  const shop = await db.shop.findUnique({ where: { id }, select: { id: true } })
  if (shop) {
    const jar = await cookies()
    jar.set(OFFICE_SHOP_COOKIE, shop.id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true })
  }
  const back = String(form.get("back") ?? "/admin")
  redirect(back.startsWith("/") && !back.startsWith("//") ? back : "/admin")
}

/** Parse "slug | English | বাংলা | charge" lines into area rows. */
function parseAreas(text: string) {
  const rows: Array<{ slug: string; name: string; nameBn: string; charge: number }> = []
  const seen = new Set<string>()
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const [slug = "", name = "", nameBn = "", charge = "0"] = line.split("|").map((v) => v.trim())
    if (!/^[a-z0-9-]{2,40}$/.test(slug) || name.length < 2 || seen.has(slug)) {
      throw new AppError(`এলাকার লাইনটা ঠিক নেই: "${line}" (slug | English | বাংলা | চার্জ)`, `Bad area line: "${line}" (slug | English | Bangla | charge)`)
    }
    seen.add(slug)
    rows.push({ slug, name, nameBn: nameBn || name, charge: Math.max(0, Math.min(5000, Number(charge) || 0)) })
  }
  return rows
}

export async function saveShopAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const out: { id?: string; created?: boolean } = {}
  const state = await run(async () => {
    await actor(["OWNER"])
    const { id, copyFrom, areasText, adminName, adminEmail, adminPassword, ...data } = parse(shopSchema, formObject(form))
    const clash = await db.shop.findFirst({ where: { slug: data.slug, NOT: id ? { id } : undefined } })
    if (clash) throw new AppError("এই স্লাগে আগে থেকে একটা শপ আছে।", "A shop with that slug already exists.")

    if (id) {
      if (!(await db.shop.findUnique({ where: { id }, select: { id: true } }))) throw new AppError("শপ পাওয়া যায়নি।", "Shop not found.")
      await db.shop.update({ where: { id }, data })
      out.id = id
      return "শপ সেভ হয়েছে।"
    }

    const areas = parseAreas(areasText)
    if (!areas.length) throw new AppError("অন্তত একটা এলাকা দিন (প্রতি লাইনে একটা)।", "Add at least one area (one per line).")
    const email = adminEmail.toLowerCase()
    if (email) {
      if (adminPassword.length < 6) throw new AppError("অ্যাডমিনের পাসওয়ার্ড অন্তত ৬ অক্ষরের দিন।", "Admin password must be at least 6 characters.")
      if (await db.user.findUnique({ where: { email } })) throw new AppError("অ্যাডমিনের এই ইমেইল আগে থেকে আছে।", "That admin email is already used.")
    }
    const source = copyFrom
      ? await db.shop.findUnique({ where: { id: copyFrom }, include: { categories: { orderBy: { sort: "asc" }, include: { offerings: { orderBy: { sort: "asc" } } } }, templates: true, settings: true } })
      : null

    const shop = await db.shop.create({ data })
    await db.serviceArea.createMany({ data: areas.map((a, i) => ({ ...a, shopId: shop.id, sort: i })) })
    const copied: Record<string, string> = {}
    if (source) {
      for (const c of source.categories) {
        await db.serviceCategory.create({
          data: {
            shopId: shop.id,
            slug: c.slug,
            name: c.name,
            nameBn: c.nameBn,
            blurb: c.blurb,
            blurbBn: c.blurbBn,
            icon: c.icon,
            image: c.image,
            flow: c.flow,
            sort: c.sort,
            active: c.active,
            offerings: {
              create: c.offerings.map((o) => ({
                slug: o.slug,
                name: o.name,
                nameBn: o.nameBn,
                detail: o.detail,
                detailBn: o.detailBn,
                pricing: o.pricing,
                price: o.price,
                minQty: o.minQty,
                durationMin: o.durationMin,
                image: o.image,
                sort: o.sort,
                active: o.active,
              })),
            },
          },
        })
      }
      if (source.templates.length) {
        await db.replyTemplate.createMany({ data: source.templates.map((t) => ({ shopId: shop.id, title: t.title, body: t.body, sort: t.sort })) })
      }
      for (const s of source.settings) copied[s.key] = s.value
    }
    await saveSettings(shop.id, {
      ...SETTING_DEFAULTS,
      ...copied,
      helpline: data.phone || copied.helpline || SETTING_DEFAULTS.helpline,
      whatsapp: data.whatsapp || copied.whatsapp || SETTING_DEFAULTS.whatsapp,
      supportEmail: data.email || copied.supportEmail || SETTING_DEFAULTS.supportEmail,
      address: data.addressBn || copied.address || SETTING_DEFAULTS.address,
      addressEn: data.address || copied.addressEn || SETTING_DEFAULTS.addressEn,
    })
    if (email) {
      await db.user.create({ data: { name: adminName || `${data.name} admin`, email, role: "ADMIN", shopId: shop.id, passwordHash: await bcrypt.hash(adminPassword, 10) } })
    }
    out.id = shop.id
    out.created = true
    return "নতুন শপ তৈরি হয়েছে।"
  })
  done("/admin/shops")
  if (state.ok && out.created && out.id) redirect(`/admin/shops/${out.id}`)
  return state
}

export async function toggleShopAction(form: FormData) {
  await actor(["OWNER"])
  const id = String(form.get("id") ?? "")
  const row = await db.shop.findUnique({ where: { id } })
  if (row) await db.shop.update({ where: { id }, data: { active: !row.active } })
  done("/admin/shops")
}

// ── Services ───────────────────────────────────────────────────────────────

export async function saveCategoryAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor(ADMINS)
    const shopId = await officeShopId(user)
    const { id, ...data } = parse(categorySchema, formObject(form))
    const clash = await db.serviceCategory.findFirst({ where: { shopId, slug: data.slug, NOT: id ? { id } : undefined } })
    if (clash) throw new AppError("এই স্লাগ আগে থেকে আছে।", "That slug is already used.")
    const image = (await saveImages(form.getAll("imageFile"), 1))[0]
    const payload = { ...data, ...(image ? { image: `/api/uploads/${image}` } : {}) }
    if (id) {
      owned(await db.serviceCategory.findUnique({ where: { id } }), user, shopId)
      await db.serviceCategory.update({ where: { id }, data: payload })
    } else await db.serviceCategory.create({ data: { ...payload, shopId } })
    done()
    return "সেবা সেভ হয়েছে।"
  })
}

export async function toggleCategoryAction(form: FormData) {
  const user = await actor(ADMINS)
  const shopId = await officeShopId(user)
  const id = String(form.get("id") ?? "")
  const row = await db.serviceCategory.findUnique({ where: { id } })
  if (row && row.shopId === shopId) await db.serviceCategory.update({ where: { id }, data: { active: !row.active } })
  done()
}

export async function saveOfferingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor(ADMINS)
    const shopId = await officeShopId(user)
    const { id, ...data } = parse(offeringSchema, formObject(form))
    owned(await db.serviceCategory.findUnique({ where: { id: data.categoryId } }), user, shopId)
    const clash = await db.serviceOffering.findFirst({ where: { categoryId: data.categoryId, slug: data.slug, NOT: id ? { id } : undefined } })
    if (clash) throw new AppError("এই সেবায় এই স্লাগ আগে থেকে আছে।", "That slug already exists in this service.")
    if (id) {
      const existing = await db.serviceOffering.findUnique({ where: { id }, include: { category: { select: { shopId: true } } } })
      if (!existing || existing.category.shopId !== shopId) throw new AppError("পাওয়া যায়নি।", "Not found.")
      await db.serviceOffering.update({ where: { id }, data })
    } else await db.serviceOffering.create({ data })
    done()
    return "সাব-সার্ভিস সেভ হয়েছে।"
  })
}

export async function toggleOfferingAction(form: FormData) {
  const user = await actor(ADMINS)
  const shopId = await officeShopId(user)
  const id = String(form.get("id") ?? "")
  const row = await db.serviceOffering.findUnique({ where: { id }, include: { category: { select: { shopId: true } } } })
  if (row && row.category.shopId === shopId) await db.serviceOffering.update({ where: { id }, data: { active: !row.active } })
  done()
}

// ── Areas ──────────────────────────────────────────────────────────────────

export async function saveAreaAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await actor(ADMINS)
    const shopId = await officeShopId(user)
    const { id, ...data } = parse(areaSchema, formObject(form))
    const clash = await db.serviceArea.findFirst({ where: { shopId, slug: data.slug, NOT: id ? { id } : undefined } })
    if (clash) throw new AppError("এই স্লাগ আগে থেকে আছে।", "That slug is already used.")
    if (id) {
      owned(await db.serviceArea.findUnique({ where: { id } }), user, shopId)
      await db.serviceArea.update({ where: { id }, data })
    } else await db.serviceArea.create({ data: { ...data, shopId } })
    done()
    return "এলাকা সেভ হয়েছে।"
  })
}

export async function toggleAreaAction(form: FormData) {
  const user = await actor(ADMINS)
  const shopId = await officeShopId(user)
  const id = String(form.get("id") ?? "")
  const row = await db.serviceArea.findUnique({ where: { id } })
  if (row && row.shopId === shopId) await db.serviceArea.update({ where: { id }, data: { active: !row.active } })
  done()
}

// ── Workers ────────────────────────────────────────────────────────────────

export async function saveWorkerAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const me = await actor(ADMINS)
    const shopId = await officeShopId(me)
    const raw = formObject(form)
    const input = parse(workerSchema, {
      ...raw,
      skills: form.getAll("skills"),
      areas: form.getAll("areas"),
    })
    const phone = normalisePhone(input.phone)
    if (!phone) throw new AppError("সঠিক মোবাইল নম্বর দিন।", "Enter a valid mobile number.")
    const email = input.email ? input.email.toLowerCase() : null
    const [photo] = await saveImages(form.getAll("photoFile"), 1)
    const [nidPhoto] = await saveImages(form.getAll("nidFile"), 1)

    // Skills and areas must be this shop's own rows.
    const [skillCount, areaCount] = await Promise.all([
      db.serviceCategory.count({ where: { shopId, id: { in: input.skills } } }),
      db.serviceArea.count({ where: { shopId, id: { in: input.areas } } }),
    ])
    if (skillCount !== input.skills.length || areaCount !== input.areas.length) throw new AppError("দক্ষতা বা এলাকা ঠিক নেই।", "Bad skill or area.")

    let userId: string
    if (input.id) {
      const profile = owned(await db.workerProfile.findUnique({ where: { id: input.id } }), me, shopId)
      userId = profile.userId
    } else {
      if (!input.password || input.password.length < 6) throw new AppError("নতুন কর্মীর জন্য অন্তত ৬ অক্ষরের পাসওয়ার্ড দিন।", "Give the new worker a password of at least 6 characters.")
      userId = ""
    }
    const clash = await db.user.findFirst({
      where: { OR: [{ phone }, ...(email ? [{ email }] : [])], NOT: userId ? { id: userId } : undefined },
    })
    if (clash) throw new AppError("এই মোবাইল বা ইমেইল অন্য অ্যাকাউন্টে আছে।", "That mobile or email belongs to another account.")

    const userData = {
      name: input.name,
      phone,
      email,
      shopId,
      ...(input.password ? { passwordHash: await bcrypt.hash(input.password, 10) } : {}),
    }
    const user = userId
      ? await db.user.update({ where: { id: userId }, data: userData })
      : await db.user.create({ data: { ...userData, role: "WORKER" } })
    const profileData = {
      isRider: input.isRider,
      nid: input.nid,
      ...(photo ? { photo: `/api/uploads/${photo}` } : {}),
      ...(nidPhoto ? { nidPhoto: `/api/uploads/${nidPhoto}` } : {}),
    }
    const profile = await db.workerProfile.upsert({
      where: { userId: user.id },
      update: profileData,
      create: { userId: user.id, shopId, ...profileData },
    })
    await db.$transaction([
      db.workerSkill.deleteMany({ where: { workerId: profile.id } }),
      db.workerSkill.createMany({ data: input.skills.map((categoryId) => ({ workerId: profile.id, categoryId })) }),
      db.workerArea.deleteMany({ where: { workerId: profile.id } }),
      db.workerArea.createMany({ data: input.areas.map((areaId) => ({ workerId: profile.id, areaId })) }),
    ])
    done()
    return "কর্মী সেভ হয়েছে।"
  })
}

export async function toggleUserAction(form: FormData) {
  const me = await actor(ADMINS)
  const shopId = await officeShopId(me)
  const id = String(form.get("id") ?? "")
  if (id === me.id) return
  const row = await db.user.findUnique({ where: { id } })
  if (!row || row.role === "OWNER") return
  // Shop admins switch only their own shop's people; owners anyone (customers are shared, so any admin may block one).
  const allowed = me.role === "OWNER" || row.role === "CUSTOMER" || row.shopId === shopId
  if (allowed) await db.user.update({ where: { id }, data: { active: !row.active } })
  done()
}

export async function saveStaffAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const me = await actor(ADMINS)
    const input = parse(staffSchema, formObject(form))
    const shopId = me.role === "OWNER" && input.shopId ? input.shopId : await officeShopId(me)
    if (!(await db.shop.findUnique({ where: { id: shopId }, select: { id: true } }))) throw new AppError("শপ পাওয়া যায়নি।", "Shop not found.")
    const email = input.email.toLowerCase()
    if (await db.user.findUnique({ where: { email } })) throw new AppError("এই ইমেইল আগে থেকে আছে।", "That email is already used.")
    const phone = input.phone ? normalisePhone(input.phone) || null : null
    if (phone && (await db.user.findUnique({ where: { phone } }))) throw new AppError("এই মোবাইল অন্য অ্যাকাউন্টে আছে।", "That mobile belongs to another account.")
    await db.user.create({ data: { name: input.name, email, phone, role: input.role, shopId, passwordHash: await bcrypt.hash(input.password, 10) } })
    done()
    return "স্টাফ অ্যাকাউন্ট তৈরি হয়েছে।"
  })
}

export async function resetPasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const me = await actor(ADMINS)
    const shopId = await officeShopId(me)
    const id = String(form.get("id") ?? "")
    const password = String(form.get("password") ?? "")
    if (password.length < 6) throw new AppError("পাসওয়ার্ড অন্তত ৬ অক্ষরের দিন।", "Password must be at least 6 characters.")
    const row = await db.user.findUnique({ where: { id } })
    if (!row || row.role === "CUSTOMER") throw new AppError("পাওয়া যায়নি।", "Not found.")
    if (me.role !== "OWNER" && (row.shopId !== shopId || row.role === "OWNER")) throw new AppError("অনুমতি নেই।", "Not allowed.")
    await db.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 10) } })
    return "পাসওয়ার্ড বদলানো হয়েছে।"
  })
}

// ── Content & settings ─────────────────────────────────────────────────────

export async function saveSettingsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const me = await actor(ADMINS)
    const shopId = await officeShopId(me)
    const entries: Record<string, string> = {}
    for (const key of SETTING_KEYS) {
      if (key.startsWith("pay")) entries[key] = form.get(key) ? "1" : "0"
      else if (form.has(key)) entries[key] = String(form.get(key)).trim().slice(0, 500)
    }
    if (entries.workerShare !== undefined) {
      const share = Number(entries.workerShare)
      if (!(share >= 0 && share <= 100)) throw new AppError("কর্মীর ভাগ ০–১০০% এর মধ্যে দিন।", "Worker share must be 0–100%.")
    }
    if (entries.partnerShare !== undefined) {
      const share = Number(entries.partnerShare)
      if (!(share >= 0 && share <= 100)) throw new AppError("পার্টনারের ভাগ ০–১০০% এর মধ্যে দিন।", "Partner share must be 0–100%.")
    }
    await saveSettings(shopId, entries)
    done()
    return "সেটিংস সেভ হয়েছে।"
  })
}

export async function saveFaqAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    await actor(ADMINS)
    const { id, ...data } = parse(faqSchema, formObject(form))
    if (id) await db.faq.update({ where: { id }, data })
    else await db.faq.create({ data })
    done()
    return "FAQ সেভ হয়েছে।"
  })
}

export async function deleteFaqAction(form: FormData) {
  await actor(ADMINS)
  await db.faq.deleteMany({ where: { id: String(form.get("id") ?? "") } })
  done()
}

export async function saveTemplateAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const me = await actor(OFFICE)
    const shopId = await officeShopId(me)
    const { id, ...data } = parse(templateSchema, formObject(form))
    if (id) {
      owned(await db.replyTemplate.findUnique({ where: { id } }), me, shopId)
      await db.replyTemplate.update({ where: { id }, data })
    } else await db.replyTemplate.create({ data: { ...data, shopId } })
    revalidatePath("/support", "layout")
    revalidatePath("/admin", "layout")
    return "টেমপ্লেট সেভ হয়েছে।"
  })
}

export async function deleteTemplateAction(form: FormData) {
  const me = await actor(OFFICE)
  const shopId = await officeShopId(me)
  await db.replyTemplate.deleteMany({ where: { id: String(form.get("id") ?? ""), shopId } })
  revalidatePath("/support", "layout")
  revalidatePath("/admin", "layout")
}

/** Admin: create or edit a discount code of their shop. */
export async function saveCouponAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const me = await actor(ADMINS)
    const shopId = await officeShopId(me)
    const input = parse(couponSchema, formObject(form))
    await saveCoupon(shopId, { ...input, id: input.id || undefined })
    revalidatePath("/admin/coupons")
    return "কুপন সেভ হয়েছে।"
  })
}

/** Admin: switch a coupon on/off. */
export async function toggleCouponAction(form: FormData) {
  const me = await actor(ADMINS)
  const shopId = await officeShopId(me)
  const id = String(form.get("id") ?? "")
  const coupon = await db.coupon.findFirst({ where: { id, shopId } })
  if (!coupon) throw new AppError("কুপন পাওয়া যায়নি।", "Coupon not found.")
  await db.coupon.update({ where: { id }, data: { active: !coupon.active } })
  revalidatePath("/admin/coupons")
}
