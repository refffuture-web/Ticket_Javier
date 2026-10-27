import type { ReactNode } from "react";

import { LogoutButton } from "@/components/logout-button";

export function StaffShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <LogoutButton />
      </header>
      {children}
    </div>
  );
}
