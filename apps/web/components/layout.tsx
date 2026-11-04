import type { ReactNode } from 'react';

// Page structure pieces from the prototype: Panel, Toolbar, PageBody.

export function Panel({
  title,
  right,
  children,
}: {
  title: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col rounded-[14px] border border-line bg-paper shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-line px-[18px] py-3.5">
        <h2 className="flex-1 text-[14px] font-bold">{title}</h2>
        {right}
      </div>
      <div className="min-w-0 p-[18px]">{children}</div>
    </section>
  );
}

export function Toolbar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {left}
      <div className="flex-1" />
      {right}
    </div>
  );
}

export function PageHeader({
  title,
  sub,
  right,
}: {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold tracking-[-0.6px] text-text">{title}</h1>
        {sub ? <p className="mt-1 text-[13px] text-muted">{sub}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[18px] px-7 pb-6 pt-[22px]">{children}</div>
  );
}
