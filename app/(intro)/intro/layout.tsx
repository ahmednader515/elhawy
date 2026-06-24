export default function IntroLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="intro-route-root min-h-screen overflow-hidden bg-[#06040c]">
      {children}
    </div>
  );
}
