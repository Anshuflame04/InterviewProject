import type { ReactNode } from "react";

type MetricCardProps = {
    label: string;
    value: string;
    description?: string;
    icon?: ReactNode;
};

export default function MetricCard({
    label,
    value,
    description,
    icon,
}: MetricCardProps) {
    return (
        <article className="rounded-2xl border border-white/10 bg-slate-900 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">
                        {label}
                    </p>

                    <p className="mt-2 text-2xl font-bold tracking-tight text-white">
                        {value}
                    </p>
                </div>

                {icon && (
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.04]">
                        {icon}
                    </div>
                )}
            </div>

            {description && (
                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                    {description}
                </p>
            )}
        </article>
    );
}