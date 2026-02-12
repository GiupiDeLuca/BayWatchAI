import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Baywatch AI — Coast-Wide Beach Safety Intelligence',
  description: 'Real-time beach safety intelligence powered by AI vision and environmental data. Monitoring the LA to Orange County coastline.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
