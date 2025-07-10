// app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
// Import AuthContextProvider
import { AuthContextProvider } from '../context/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Aplikasi Penjualan',
  description: 'Aplikasi pencatat penjualan',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Bungkus children dengan provider */}
        <AuthContextProvider>{children}</AuthContextProvider>
      </body>
    </html>
  );
}