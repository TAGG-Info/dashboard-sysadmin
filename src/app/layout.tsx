import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { RefreshIntervalsProvider } from '@/components/providers/RefreshIntervalsProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Toaster } from 'sonner';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
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
      <body className={`${inter.variable} ${jetbrainsMono.variable} bg-background text-foreground antialiased`}>
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
