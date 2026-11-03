import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { JsonLd } from "@/components/seo/json-ld";
import { Toaster } from "@/components/ui/toast";
import { siteConfig } from "@/config/site";
import { themeScript } from "@/lib/theme-script";
import "./globals.css";

const defaultTitle = `${siteConfig.name} — ${siteConfig.church}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: defaultTitle, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.church }],
  formatDetection: { telephone: false },
  appleWebApp: { capable: true, title: siteConfig.name, statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    title: defaultTitle,
    description: siteConfig.description,
    images: [{ url: "/brand/og.png", width: 1200, height: 630, alt: `${siteConfig.name} — ${siteConfig.church}` }],
  },
  twitter: { card: "summary_large_image", title: defaultTitle, description: siteConfig.description },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F4EF" },
    { media: "(prefers-color-scheme: dark)", color: siteConfig.themeColor },
  ],
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full" suppressHydrationWarning>
      <head>
        <Script id="ctf-theme" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Toaster>{children}</Toaster>
        {process.env.NODE_ENV === "production" && (
          <Script
            id="ctf-sw"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("/sw.js"))`,
            }}
          />
        )}
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            name: siteConfig.name,
            alternateName: siteConfig.church,
            url: siteConfig.url,
            logo: new URL("/brand/emblem.png", siteConfig.url).toString(),
            description: siteConfig.description,
            parentOrganization: { "@type": "Church", name: siteConfig.church },
          }}
        />
      </body>
    </html>
  );
}
