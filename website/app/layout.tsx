import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import Snowfall from '@/components/Snowfall';
import './globals.css';

export const metadata: Metadata = {
  title: 'Horizon Tweaks — Peak Performance for Gamers',
  description:
    'Horizon Tweaks is the professional Windows optimization studio. Download the desktop app to tune network, startup, debloat, and more.',
  icons: {
    icon: [
      { url: '/app-icon.ico', type: 'image/x-icon' },
      { url: '/app-icon.png', type: 'image/png' },
    ],
    apple: '/app-icon.png',
  },
  openGraph: {
    images: ['/app-icon.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@500;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="text-steel-200 antialiased selection:bg-stone-300/20 selection:text-white">
        <Snowfall />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
