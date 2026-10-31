import "./globals.css";

export const metadata = {
  title: "Reel Drafts",
  description: "Draft and refine Instagram Reels scripts.",
  robots: { index: false, follow: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ee" },
    { media: "(prefers-color-scheme: dark)", color: "#16140f" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-IE">
      <body>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
