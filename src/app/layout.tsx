import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'WAYAPP — WhatsApp Marketing & Broadcast Platform',
  description: 'Enterprise Meta WhatsApp Cloud API Marketing, Template Management & Live 2-Way Inbox Platform',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-slate-50 text-slate-900`}>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
