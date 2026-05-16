import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { AppChrome } from "@/components/app-chrome"
import "./globals.css"

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" })
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-jetbrains",
})

export const metadata: Metadata = {
  title: "Bartery — Платформа обмена навыками",
  description:
    "Обменивайтесь знаниями и умениями с другими людьми. Учите Python в обмен на французский, дизайн на гитару и многое другое.",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#16a34a",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  )
}
