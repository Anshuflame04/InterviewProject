import { Eye, EyeOff, KeyRound, Save, ShieldCheck } from "lucide-react";
import { useState } from "react";
import PageHeader from "../components/common/PageHeader";
import { LLM_MODELS, getLlmSettingsByProvider, saveLlmSettings, type LlmProvider } from "../services/llmSettings";

export default function ApiSettings() {
    const [savedSettings, setSavedSettings] = useState(getLlmSettingsByProvider);
    const [provider, setProvider] = useState<LlmProvider>("gemini");
    const [model, setModel] = useState(savedSettings.gemini?.model ?? LLM_MODELS.gemini[0].id);
    const [apiKey, setApiKey] = useState(savedSettings.gemini?.apiKey ?? "");
    const [savedMessage, setSavedMessage] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    const switchProvider = (next: LlmProvider) => {
        setProvider(next);
        setModel(savedSettings[next]?.model ?? LLM_MODELS[next][0].id);
        setApiKey(savedSettings[next]?.apiKey ?? "");
        setSavedMessage(false);
    };

    const save = () => {
        if (!apiKey.trim()) return;
        const settings = { provider, model, apiKey: apiKey.trim() };
        saveLlmSettings(settings);
        setSavedSettings((current) => ({ ...current, [provider]: settings }));
        setSavedMessage(true);
    };

    return <div className="max-w-2xl space-y-6">
        <PageHeader title="AI Provider & API Key" description="Choose the model used for resume analysis, interview questions, and evaluation." />
        <section className="rounded-2xl border border-white/10 bg-slate-900 p-5 sm:p-6">
            <div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><KeyRound size={19} /></div><div><h2 className="font-bold text-white">Your API configuration</h2><p className="mt-1 text-sm text-slate-400">Your key is stored in this browser for future sessions and is sent only to this app’s authenticated backend requests.</p></div></div>
            <div className="mt-6 grid gap-5">
                <label className="text-sm font-semibold text-slate-200">Provider<div className="mt-2 grid grid-cols-2 gap-2">{(["gemini", "groq"] as const).map((item) => <button key={item} type="button" onClick={() => switchProvider(item)} className={`rounded-xl border px-4 py-3 text-sm font-bold capitalize ${provider === item ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200" : "border-white/10 bg-white/[0.03] text-slate-400"}`}>{item}</button>)}</div></label>
                <label className="text-sm font-semibold text-slate-200">Model<select value={model} onChange={(event) => setModel(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-cyan-400">{LLM_MODELS[provider].map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                <label className="text-sm font-semibold text-slate-200">{provider === "groq" ? "Groq" : "Gemini"} API key<div className="relative mt-2"><input type={showApiKey ? "text" : "password"} autoComplete="off" value={apiKey} onChange={(event) => { setApiKey(event.target.value); setSavedMessage(false); }} placeholder="Paste your API key" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 pr-11 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400" /><button type="button" onClick={() => setShowApiKey((visible) => !visible)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white" aria-label={showApiKey ? "Hide API key" : "Show API key"} title={showApiKey ? "Hide API key" : "Show API key"}>{showApiKey ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
                <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.04] p-3 text-sm text-slate-300">Each provider has its own saved key and model. Switching providers will load that provider's separate configuration.</div>
                <button type="button" onClick={save} disabled={!apiKey.trim()} className="inline-flex w-fit items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-40"><Save size={16} /> Save configuration</button>
                {savedMessage && <p className="inline-flex items-center gap-2 text-sm text-emerald-300"><ShieldCheck size={16} /> Saved. Future requests will use this provider and model.</p>}
            </div>
        </section>
        <section className="rounded-2xl border border-white/10 bg-slate-900 p-5 sm:p-6">
            <h2 className="font-bold text-white">How to use AI Interview</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-400"><li>Save a Gemini or Groq API key above and select the model you want to use.</li><li>Upload your resume and start an interview from the Dashboard or Interview page.</li><li>Answer each question, then review your report, history, and Analytics for feedback.</li></ol>
        </section>
    </div>;
}
