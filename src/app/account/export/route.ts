import { NextResponse } from 'next/server';

import { viewer } from '@/lib/services/data';

/** "Download my data": everything this account owns, read through RLS (so only the caller's rows). */
export async function GET() {
  const { db, userId } = await viewer();
  if (!userId) return new NextResponse('Sign in first', { status: 401 });
  const [profile, favorites, compare, viewed, searches, inquiries, viewings, notifications] = await Promise.all([
    db.from('profiles').select('*').eq('id', userId).maybeSingle(),
    db.from('favorites').select('property_id, created_at').eq('user_id', userId),
    db.from('compare_items').select('property_id, created_at').eq('user_id', userId),
    db.from('recently_viewed').select('property_id, viewed_at').eq('user_id', userId),
    db.from('recent_searches').select('label, detail, params, created_at').eq('user_id', userId),
    db.from('inquiries').select('*, events:inquiry_events(kind, actor, body, created_at)').eq('user_id', userId),
    db.from('viewings').select('*').eq('user_id', userId),
    db.from('notifications').select('*').eq('user_id', userId),
  ]);
  const failed = [profile, favorites, compare, viewed, searches, inquiries, viewings, notifications].find((r) => r.error);
  if (failed?.error) {
    console.error(`[nestora] export: ${failed.error.code ?? ''} ${failed.error.message}`);
    return new NextResponse('Couldn’t export your data. Please try again.', { status: 500 });
  }
  const body = JSON.stringify(
    { exported_at: new Date().toISOString(), profile: profile.data, saved_homes: favorites.data, compare: compare.data, recently_viewed: viewed.data, recent_searches: searches.data, inquiries: inquiries.data, viewings: viewings.data, notifications: notifications.data },
    null,
    2,
  );
  return new NextResponse(body, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="nestora-data.json"', 'Cache-Control': 'private, no-store' } });
}
