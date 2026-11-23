import { notFound } from "next/navigation"
import { requireUser, getLocale } from "@/lib/auth"
import { ADMINS, isAdmin } from "@/lib/roles"
import { AppError } from "@/lib/errors"
import { bookingChat } from "@/lib/support"
import { replyTemplates, workerOptions } from "@/lib/office"
import { named } from "@/lib/i18n"
import { PageHeader, StatusPill } from "@/components/bits"
import { OfficeBooking } from "@/components/booking/office"

export default async function AdminBookingPage({ params }: { params: Promise<{ code: string }> }) {
  const [{ code }, user, locale] = await Promise.all([params, requireUser(ADMINS, "/admin/bookings"), getLocale()])
  let data
  try {
    data = await bookingChat(user, code)
  } catch (error) {
    if (error instanceof AppError) notFound()
    throw error
  }
  const { booking, thread } = data
  // Staff of another shop already got a 404 from bookingChat; the owner may open any
  // shop's booking, so workers and templates come from the booking's own shop.
  const [workers, templates] = await Promise.all([workerOptions(booking.shopId, booking.categoryId, booking.areaId), replyTemplates(booking.shopId)])
  return (
    <div>
      <PageHeader back="/admin/bookings" title={`${booking.code} · ${named(locale, booking.offering)}`} sub={named(locale, booking.category)} action={<StatusPill status={booking.status} locale={locale} flow={booking.category.flow} className="mt-1" />} />
      <OfficeBooking booking={booking} locale={locale} me={user.id} isAdmin={isAdmin(user.role)} workers={workers} messages={thread.messages} templates={templates} />
    </div>
  )
}
