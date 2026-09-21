export default function Frame({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <main
      className={`mx-auto w-full px-3 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10 ${
        wide ? "max-w-[1600px]" : "max-w-[1200px]"
      }`}
    >
      <div className="frame">
        <div className="frame-inner">{children}</div>
      </div>
    </main>
  );
}
