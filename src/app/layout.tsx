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
        {/* Prevent flash of dashboard content before auth check - only hide dashboard routes */}
        <style dangerouslySetInnerHTML={{__html: `
          body:not(.auth-page):not(.auth-checked) .dashboard-content { opacity: 0; }
        `}} />
        <script dangerouslySetInnerHTML={{__html: `
          // Show auth pages immediately
          if (window.location.pathname.includes('/auth/')) {
            document.body.classList.add('auth-page');
          }
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
