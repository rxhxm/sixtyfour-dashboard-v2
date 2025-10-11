import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/session-provider";
import { SWRProvider } from "@/components/providers/swr-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sixtyfour Dashboard",
  description: "API metrics and workflow monitoring dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Prevent any flash of content before auth check */}
        <style dangerouslySetInnerHTML={{__html: `
          body { opacity: 0; transition: opacity 0.3s; }
          body.auth-checked { opacity: 1; }
        `}} />
        <script dangerouslySetInnerHTML={{__html: `
          (function() {
            // Immediately check if we're on a protected route
            const protectedPaths = ['/', '/workflows', '/credits-management', '/platform-access'];
            const isProtected = protectedPaths.some(p => window.location.pathname === p || window.location.pathname.startsWith(p + '/'));
            
            if (!isProtected || window.location.pathname.includes('/auth/')) {
              // Not protected or auth page - show immediately
              document.body.classList.add('auth-checked');
            }
            // Otherwise stay hidden until React auth check completes
          })();
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <SWRProvider>
            {children}
          </SWRProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
