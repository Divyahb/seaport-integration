export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-6 px-6 py-16">
      <div className="max-w-2xl space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-harbor-500">Searport</p>
        <h1 className="text-5xl font-semibold leading-tight">Port operations dashboard</h1>
        <p className="text-lg text-slate-600">
          Sample Next.js frontend using shadcn-style components and the backend GraphQL layer.
        </p>
      </div>
      <a
        className="inline-flex w-fit rounded-full bg-harbor-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-harbor-700"
        href="/dashboard"
      >
        Open dashboard
      </a>
    </main>
  );
}

