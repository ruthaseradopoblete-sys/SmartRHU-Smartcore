import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pharmacist",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      {/* background updated from #eef0f4 → #f0f7f2 (dashboard module --bg) */}
      <body style={{ margin: 0, padding: 0, fontFamily: "'Nunito', sans-serif", background: "#f0f7f2", height: "100vh", overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
