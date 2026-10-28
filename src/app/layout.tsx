import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';

import { ToastProvider } from '@/components/toast';
import './globals.css';

const dmSans = DM_Sans({ variable: '--font-dm-sans', subsets: ['latin'], weight: ['300', '400', '500', '600'], style: ['normal', 'italic'] });

export const metadata: Metadata = {
  title: { default: 'Nestora', template: '%s · Nestora' },
  description: 'Find your next home to rent — browse, save and compare homes, ask the listing agent and book a viewing.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#EEEDEB' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full`}>
      <body className="min-h-full">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
