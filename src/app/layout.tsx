import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { RefreshIntervalsProvider } from '@/components/providers/RefreshIntervalsProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Toaster } from 'sonner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SysAdmin Dashboard',
  description: 'Dashboard de supervision sysadmin multi-sources',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}>
        <SessionProvider>
          <ThemeProvider>
            <RefreshIntervalsProvider>
              <TooltipProvider delayDuration={300}>
                <DashboardShell>{children}</DashboardShell>
              </TooltipProvider>
            </RefreshIntervalsProvider>
          </ThemeProvider>
        </SessionProvider>
        <Toaster richColors position="top-right" theme="dark" />
      </body>
    </html>
  );
}
