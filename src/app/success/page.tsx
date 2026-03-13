import Link from "next/link";

export default function SuccessPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-zinc-50">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-10 rounded-2xl shadow-sm border border-zinc-100">
        <div className="flex justify-center pb-2">
          <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center">
            <span className="text-4xl">🎉</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Payment Successful!</h1>

        <p className="text-zinc-600 leading-relaxed">
          Thank you for your purchase. We have just emailed you the secure links to instantly access your digital
          templates.
        </p>

        <div className="pt-6">
          <Link
            href="/"
            className="inline-block w-full rounded-md bg-zinc-900 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800">
            Return to Homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
