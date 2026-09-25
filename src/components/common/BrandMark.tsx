export default function BrandMark({ size = 40 }: { size?: number }) {
    return (
        <div
            className="grid shrink-0 place-items-center rounded-xl border border-cyan-300/25 bg-gradient-to-br from-cyan-400/25 via-blue-500/20 to-violet-500/25 shadow-lg shadow-cyan-950/40"
            style={{ width: size, height: size }}
            aria-hidden="true"
        >
            <svg viewBox="0 0 40 40" className="h-[72%] w-[72%] fill-none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 12.5 14.2 18.7 20 11l5.8 7.7L32 12.5" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-100" />
                <path d="M20 11v18" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" className="text-cyan-100" />
                <circle cx="20" cy="31.5" r="2" className="fill-violet-200" />
            </svg>
        </div>
    );
}
