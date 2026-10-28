import { NextResponse, type NextRequest } from 'next/server';

import { getViewing, viewer } from '@/lib/services/data';

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

/** "Add to calendar": an iCalendar file for the signed-in renter's own viewing. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await viewer();
  if (!userId || !/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse('Not found', { status: 404 });
  const v = await getViewing(id);
  if (!v || v.user_id !== userId) return new NextResponse('Not found', { status: 404 });
  const where = v.viewing_type === 'video' ? 'Video call' : `${v.property.address_line}, ${v.property.city} ${v.property.postal_code}`;
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nestora//Viewing//EN',
    'BEGIN:VEVENT',
    `UID:${v.id}@nestora`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(v.starts_at)}`,
    `DTEND:${stamp(v.ends_at)}`,
    `SUMMARY:${esc(`Viewing · ${v.property.title}`)}`,
    `LOCATION:${esc(where)}`,
    `DESCRIPTION:${esc(`${v.reference} with ${v.agent.full_name} (${v.agent.phone}). Sample listing.`)}`,
    v.status === 'cancelled' ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
  return new NextResponse(body, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="${v.reference}.ics"`, 'Cache-Control': 'private, no-store' } });
}
