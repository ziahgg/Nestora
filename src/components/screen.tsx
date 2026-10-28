import type { ReactNode } from 'react';

import { cx } from './ui';

/** Page column: 20 px margins (Figma screen margin), room for the floating tab bar or a sticky action bar. */
/** `bottomBar`: the page renders its own fixed action bar (e.g. a form's submit), so reserve the same space. */
export function Screen({ children, className, footer, wide, tabs = true, bottomBar }: { children: ReactNode; className?: string; footer?: ReactNode; wide?: boolean; tabs?: boolean; bottomBar?: boolean }) {
  return (
    <>
      <main className={cx('mx-auto flex w-full flex-col gap-5 px-5 pt-[max(16px,env(safe-area-inset-top))] lg:pt-8', wide ? 'max-w-[1040px]' : 'max-w-[640px]', footer || bottomBar ? 'pb-36' : tabs ? 'pb-32' : 'pb-12', className)}>
        {children}
      </main>
      {footer ? (
        <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-[28px] bg-surface px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(18,18,18,0.06)]">
          <div className="mx-auto flex max-w-[600px] gap-3">{footer}</div>
        </div>
      ) : null}
    </>
  );
}
