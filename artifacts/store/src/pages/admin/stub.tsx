export function AdminStub({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-xl text-ink-muted">{copy}</p>
      <p className="text-sm text-ink-subtle">Coming in a later ops release.</p>
    </div>
  );
}
