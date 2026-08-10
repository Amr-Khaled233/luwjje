import { redirect } from 'next/navigation';

/**
 * There is no Overview page — `/dashboard` lands on Orders, which is what the
 * store owner opens the dashboard for. The figures that used to live here are
 * on Analytics, and low stock has its own filter on the Stock page.
 */
export default function DashboardIndex() {
  redirect('/dashboard/orders');
}
