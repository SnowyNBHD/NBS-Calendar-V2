export function Chip({
  tone = "default",
  children,
}: {
  tone?: "high" | "low" | "default";
  children: React.ReactNode;
}) {
  const toneClass = tone === "high" ? "chip-high" : tone === "low" ? "chip-low" : "";
  return <span className={`chip ${toneClass}`}>{children}</span>;
}
