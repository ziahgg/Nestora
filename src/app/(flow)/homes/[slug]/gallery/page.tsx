import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Photo } from '@/components/photo';
import { ShareButton } from '@/components/share-button';
import { cx } from '@/components/ui';
import { getProperty } from '@/lib/services/data';

export const metadata: Metadata = { title: 'Photos' };

/** Figma "Property Gallery / Image 2 of 5": full-screen photo, counter, arrows, caption and thumbnails. */
export default async function GalleryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ i?: string }> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const p = await getProperty(slug);
  if (!p || !p.images.length) notFound();
  const n = p.images.length;
  const i = Math.min(n - 1, Math.max(0, (Number.parseInt(sp.i ?? '1', 10) || 1) - 1));
  const img = p.images[i]!;
  const href = (k: number) => `/homes/${p.slug}/gallery?i=${((k + n) % n) + 1}`;
  const btn = 'grid size-11 place-items-center rounded-full bg-white/85 text-ink backdrop-blur';

  return (
    <main className="fixed inset-0 flex flex-col bg-ink text-white">
      <header className="flex items-center justify-between px-5 pt-[max(16px,env(safe-area-inset-top))]">
        <Link href={`/homes/${p.slug}`} aria-label="Close photos" className={btn}>
          <X size={20} aria-hidden />
        </Link>
        <p className="t-screen-title num" aria-live="polite">
          {i + 1} / {n}
        </p>
        <ShareButton text={`${p.title} on Nestora (sample listing)`} path={`/homes/${p.slug}`} look="glass" label="Share this home" />
      </header>
      <div className="relative my-6 min-h-0 flex-1">
        <Photo image={{ key: img.image_key, alt: img.alt }} sizes="100vw" className="absolute inset-0 !bg-transparent [&_img]:!object-contain" priority />
        {n > 1 ? (
          <>
            <Link href={href(i - 1)} aria-label="Previous photo" className={cx(btn, 'absolute top-1/2 left-5 -translate-y-1/2')}>
              <ChevronLeft size={22} aria-hidden />
            </Link>
            <Link href={href(i + 1)} aria-label="Next photo" className={cx(btn, 'absolute top-1/2 right-5 -translate-y-1/2')}>
              <ChevronRight size={22} aria-hidden />
            </Link>
          </>
        ) : null}
      </div>
      <div className="px-5 pb-[max(24px,env(safe-area-inset-bottom))]">
        <p className="t-body text-white/80">{img.caption ?? img.alt}</p>
        <ul className="no-scrollbar mt-4 flex gap-2.5 overflow-x-auto">
          {p.images.map((m, k) => (
            <li key={m.image_key}>
              <Link href={href(k)} aria-label={`Photo ${k + 1}`} aria-current={k === i ? 'true' : undefined} className={cx('block overflow-hidden rounded-[14px] border-2', k === i ? 'border-amber' : 'border-transparent opacity-70')}>
                <Photo image={{ key: m.image_key, alt: '' }} sizes="64px" className="size-16" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
