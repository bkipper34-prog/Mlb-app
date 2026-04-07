export const metadata = { title: "MLB Prop Engine" };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#080A0D" }}>
        {children}
      </body>
    </html>
  );
}
