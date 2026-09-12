import { signInWithGoogle } from "@/lib/actions/session";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="frame w-full max-w-sm">
        <div className="frame-inner flex flex-col items-center gap-6 text-center">
          <h1 className="text-2xl tracking-wide text-ink">NBS.CALENDAR</h1>
          <form action={signInWithGoogle} className="w-full">
            <button type="submit" className="btn w-full py-3 text-lg">
              Sign in with Google
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
