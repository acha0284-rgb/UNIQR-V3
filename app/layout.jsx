export const metadata = {
  title: 'UniQR — Malaysian Super-Wallet',
  description: 'Consumer super-wallet & expense aggregator for urban Malaysia.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#16171b',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#16171b' }}>{children}</body>
    </html>
  );
}
