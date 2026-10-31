import "./globals.css";

export const metadata = {
  title: "Reel Drafts",
  description: "Draft and refine Instagram Reels scripts.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Reel Drafts", statusBarStyle: "default" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-IE">
      <body>{children}</body>
    </html>
  );
}
