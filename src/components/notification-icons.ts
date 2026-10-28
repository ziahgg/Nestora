import { BellRing, CalendarCheck, MessageSquare } from 'lucide-react';

import type { NotificationKind } from '@/types/database';

/** Icon per notification kind (server-safe; used by the list and details pages). */
export const KIND_ICON: Record<NotificationKind, typeof BellRing> = {
  viewing_reminder: CalendarCheck,
  viewing_update: CalendarCheck,
  inquiry_reply: MessageSquare,
  inquiry_update: MessageSquare,
  price_update: BellRing,
};
