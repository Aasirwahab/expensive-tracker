import { NotebookText } from "lucide-react";

export function ComingSoon({ title, note }: { title: string; note?: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-ink/5 text-ink">
          <NotebookText className="h-5 w-5" />
        </div>
        <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
        <p className="mt-1.5 text-sm text-muted">
          {note ?? "This part of your ledger is coming next."}
        </p>
      </div>
    </div>
  );
}
