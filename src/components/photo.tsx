import { House } from 'lucide-react';
import Image from 'next/image';

import { supabaseEnv } from '@/lib/supabase/env';
import { cx } from './ui';

/** Listing photo from /public/sample (development content), or a neutral placeholder. */
export function Photo({ image, sizes, className, priority }: { image: { key: string; alt: string } | null; sizes: string; className?: string; priority?: boolean }) {
  if (!image)
    return (
      <div className={cx('grid place-items-center bg-surface-muted text-text-muted', className)} role="img" aria-label="No photo yet">
        <House size={28} aria-hidden />
      </div>
    );
  return (
    <div className={cx('relative overflow-hidden bg-surface-muted', className)}>
      <Image src={`/sample/${image.key}.jpg`} alt={image.alt} fill sizes={sizes} priority={priority} className="object-cover" />
    </div>
  );
}

export const firstImage = (images: { image_key: string; alt: string; sort_order: number }[]) => {
  const i = [...images].sort((a, b) => a.sort_order - b.sort_order)[0];
  return i ? { key: i.image_key, alt: i.alt } : null;
};

/** Public URL of a profile photo: seed photos live in /public/sample, uploads in the "avatars" bucket. */
export function avatarUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('sample/')) return `/${path}`;
  const env = supabaseEnv();
  return env ? `${env.url}/storage/v1/object/public/avatars/${path}` : null;
}

export function Avatar({ path, name, size = 56 }: { path: string | null; name: string; size?: number }) {
  const url = avatarUrl(path);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
  if (!url)
    return (
      <span className="grid shrink-0 place-items-center rounded-full bg-amber-soft t-card-title text-amber" style={{ width: size, height: size }} aria-hidden>
        {initials}
      </span>
    );
  // eslint-disable-next-line @next/next/no-img-element -- Storage URLs vary per environment; avatars are small.
  return <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
}
