import { Space_Grotesk, DM_Sans } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext";
import NavBar from "@/components/layout/NavBar";

export const metadata = {
  title: "GST Billing Pro",
  description: "Professional GST billing and invoice management system",
  generator: "v0.app",
};

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable} antialiased`}>
      <body className="font-sans bg-background text-foreground">
        <AuthProvider>
          <NavBar />
          <main className="min-h-[calc(100vh-4rem)]">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  )
}
