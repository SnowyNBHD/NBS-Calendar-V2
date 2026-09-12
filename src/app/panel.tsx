export function Panel({
  title,
  count,
  children,
}: {
  title: string;
  count?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel">
      <div className="panel-head">
        <span>{title}</span>
        {count ? <span className="nums panel-count">{count}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function PanelEmpty({ children }: { children: React.ReactNode }) {
  return <div className="panel-empty">{children}</div>;
}
