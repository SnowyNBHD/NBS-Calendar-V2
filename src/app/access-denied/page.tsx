export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="frame w-full max-w-sm">
        <div className="frame-inner flex flex-col items-center gap-4 text-center">
          <h1 className="text-2xl text-oxblood-bright">access denied</h1>
          <p className="text-ink-muted">
            This app is only accessible to its owner&apos;s Google account.
          </p>
          <a href="/login" className="btn">
            Try a different account
          </a>
        </div>
      </div>
    </main>
  );
}
