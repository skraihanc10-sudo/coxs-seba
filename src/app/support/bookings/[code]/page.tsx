import { notFound } from "next/navigation"
import { requireUser, getLocale } from "@/lib/auth"
import { isAdmin, OFFICE } from "@/lib/roles"
import { officeShop } from "@/lib/shops"
import { AppError } from "@/lib/errors"
import { bookingChat } from "@/lib/support"
import { replyTemplates, workerOptions } from "@/lib/office"
import { named } from "@/lib/i18n"
import { PageHeader, StatusPill } from "@/components/bits"
import { OfficeBooking } from "@/components/booking/office"

export default async function SupportBookingPage({ params }: { params: Promise<{ code: string }> }) {
  const [{ code }, user, locale] = await Promise.all([params, requireUser(OFFICE, "/support/bookings"), getLocale()])
  let data
  try {
    data = await bookingChat(user, code)
  } catch (error) {
    if (error instanceof AppError) notFound()
    throw error
  }
  const { booking, thread } = data
  const shop = await officeShop(user)
  const [workers, templates] = await Promise.all([workerOptions(shop.id, booking.categoryId, booking.areaId), replyTemplates(shop.id)])
  return (
    <div>
      <PageHeader back="/support/bookings" title={`${booking.code} · ${named(locale, booking.offering)}`} sub={named(locale, booking.category)} action={<StatusPill status={booking.status} locale={locale} flow={booking.category.flow} className="mt-1" />} />
      <OfficeBooking booking={booking} locale={locale} me={user.id} isAdmin={isAdmin(user.role)} workers={workers} messages={thread.messages} templates={templates} />
    </div>
  )
}
