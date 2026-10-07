import type { ReactNode } from "react";

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{title}</h1>
      {children}
    </>
  );
}
