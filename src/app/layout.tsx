import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Vicious',
  description: 'The Vicious Series Logic Suite — Offline, Archi, Spark, and Script in one app.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=Source+Code+Pro&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root {
            --font-headline: 'Space Grotesk', system-ui, sans-serif;
            --font-body: 'Inter', system-ui, sans-serif;
            --font-code: 'Source Code Pro', monospace;
          }
        `}</style>
      </head>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
