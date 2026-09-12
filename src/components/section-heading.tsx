import type { ReactNode } from "react";

export function SectionHeading({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-navy px-3 py-2">
      <h2 className="text-lg font-semibold text-white">{children}</h2>
      {action}
    </div>
  );
}
