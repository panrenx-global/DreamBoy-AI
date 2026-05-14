import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: `${siteConfig.name} - AI 虚拟恋爱聊天`,
  description: siteConfig.description,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: `${siteConfig.name} - AI 虚拟恋爱聊天`,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: 'zh_CN',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV !== 'production' ? (
          <Script id="suppress-dev-console-error-true" strategy="beforeInteractive">
            {`
              (function() {
                var originalConsoleError = console.error;
                console.error = function() {
                  if (arguments.length === 1 && arguments[0] === true) {
                    return;
                  }
                  return originalConsoleError.apply(console, arguments);
                };
              })();
            `}
          </Script>
        ) : null}
        <Script id="tawk-to-widget" strategy="lazyOnload">
          {`
            var Tawk_API = Tawk_API || {};
            var Tawk_LoadStart = new Date();
            (function() {
              var s1 = document.createElement("script");
              var s0 = document.getElementsByTagName("script")[0];
              s1.async = true;
              s1.src = "https://embed.tawk.to/6a047226de615d1c36e51e02/1joglrpjg";
              s1.charset = "UTF-8";
              s1.setAttribute("crossorigin", "*");
              s0.parentNode.insertBefore(s1, s0);
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
