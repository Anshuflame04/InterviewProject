type PageHeaderProps = {
    title: string;
    description?: string;
    action?: React.ReactNode;
};

export default function PageHeader({
    title,
    description,
    action,
}: PageHeaderProps) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {title}
                </h1>

                {description && (
                    <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-400">
                        {description}
                    </p>
                )}
            </div>

            {action && (
                <div className="shrink-0">
                    {action}
                </div>
            )}
        </div>
    );
}