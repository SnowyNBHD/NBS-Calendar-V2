export default function Frame({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <main className={`mx-auto px-4 py-10 ${wide ? "max-w-4xl" : "max-w-2xl"}`}>
      <div className="frame">
        <div className="frame-inner">{children}</div>
      </div>
    </main>
  );
}
