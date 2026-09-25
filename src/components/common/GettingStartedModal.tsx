import { Clock3, Mic, Upload, WandSparkles } from "lucide-react";
import { useEffect, useState } from "react";

/** First-visit guide. It intentionally cannot be dismissed during its first five seconds. */
export default function GettingStartedModal() {
    const [open, setOpen] = useState(true);
    const [secondsLeft, setSecondsLeft] = useState(5);

    useEffect(() => {
        if (!open || secondsLeft === 0) return;
        const timer = window.setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [open, secondsLeft]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="getting-started-title">
            <section className="w-full max-w-xl rounded-3xl border border-cyan-400/20 bg-slate-900 p-6 shadow-2xl shadow-cyan-950/40 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Welcome to InterviewYou</p>
                <h1 id="getting-started-title" className="mt-2 text-2xl font-bold text-white">Your quick start guide</h1>
                <p className="mt-2 text-sm leading-6 text-slate-400">Set up your AI provider, add a resume, and practise aloud. Your spoken answer keeps recording until you press Next Question or Submit Interview.</p>
                <ol className="mt-6 space-y-4 text-sm text-slate-300">
                    <li className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300"><WandSparkles size={16} /></span><span><strong className="text-white">Configure your AI key.</strong><br />Open API Settings, choose Gemini or Groq, select a model, and save your key.</span></li>
                    <li className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300"><Upload size={16} /></span><span><strong className="text-white">Upload your resume.</strong><br />The app uses it with your job description to create relevant questions.</span></li>
                    <li className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300"><Mic size={16} /></span><span><strong className="text-white">Answer naturally.</strong><br />Allow microphone access. Pauses do not finish your answer; use Next Question or Submit when you are ready.</span></li>
                </ol>
                <button type="button" disabled={secondsLeft > 0} onClick={() => setOpen(false)} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
                    {secondsLeft > 0 ? <><Clock3 size={16} /> Please wait {secondsLeft}s</> : "Got it, let's begin"}
                </button>
            </section>
        </div>
    );
}
