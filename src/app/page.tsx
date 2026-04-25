"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Loader2, ChevronRight, Sparkles, User } from 'lucide-react';
import { saveSession } from '@/lib/session';
import type { JDContext, QuestionBank } from '@/lib/types';

type Step = 'input' | 'parsed' | 'name';

export default function HomePage() {
  const [step, setStep] = useState<Step>('input');
  const [jdText, setJdText] = useState('');
  const [jdContext, setJdContext] = useState<JDContext | null>(null);
  const [candidateName, setCandidateName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const analyzeJD = async () => {
    if (!jdText.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/parse-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: jdText }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message || 'Failed to analyze the job description. Please try again.');
        return;
      }
      const data: JDContext = await res.json();
      setJdContext(data);
      setStep('parsed');
    } catch {
      setError('Failed to analyze the job description. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startInterview = async () => {
    if (!candidateName.trim() || !jdContext) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdContext }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message || 'Failed to prepare the interview. Please try again.');
        return;
      }
      const questionBank: QuestionBank = await res.json();
      saveSession({ candidateName: candidateName.trim(), jdContext, questionBank });
      router.push('/interview');
    } catch {
      setError('Failed to prepare the interview. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-[100px]" />
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 mb-5 shadow-[0_0_40px_rgba(99,102,241,0.2)]">
            <Bot className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tight mb-3">
            InterviewAI
          </h1>
          <p className="text-slate-400 text-lg max-w-md">
            Paste a job description. Get a realistic AI-powered interview and detailed feedback.
          </p>
        </motion.div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          {(['input', 'parsed', 'name'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' :
                ['parsed', 'name'].indexOf(step) > ['parsed', 'name'].indexOf(s) - 1 && step !== s && i < ['input', 'parsed', 'name'].indexOf(step)
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-white/5 text-slate-500 border border-white/10'
              }`}>
                {i < ['input', 'parsed', 'name'].indexOf(step) ? '✓' : i + 1}
              </div>
              {i < 2 && <div className="w-8 h-px bg-white/10" />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">

            {/* Step 1: Input JD */}
            {step === 'input' && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-sm"
              >
                <h2 className="text-xl font-semibold text-white mb-2">Paste Job Description</h2>
                <p className="text-slate-400 text-sm mb-5">Our AI will extract the role, skills, and design your interview.</p>
                <textarea
                  id="jd-textarea"
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="e.g. We're looking for a Senior Full Stack Engineer with 5+ years of React, Node.js, and AWS experience..."
                  className="w-full h-44 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all"
                />
                {error && <p className="text-rose-400 text-sm mt-2">{error}</p>}
                <button
                  id="analyze-btn"
                  onClick={analyzeJD}
                  disabled={isLoading || !jdText.trim()}
                  className="mt-4 w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(99,102,241,0.3)]"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isLoading ? 'Analyzing Role...' : 'Analyze Role'}
                </button>
              </motion.div>
            )}

            {/* Step 2: Parsed result */}
            {step === 'parsed' && jdContext && (
              <motion.div
                key="parsed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-1">Role Detected</p>
                    <h2 className="text-2xl font-bold text-white">{jdContext.roleTitle}</h2>
                    <p className="text-slate-400 text-sm mt-1">{jdContext.experienceLevel} · {jdContext.interviewStyle}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <span className="text-emerald-400 text-lg">✓</span>
                  </div>
                </div>

                <div className="mb-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Skills to be Tested</p>
                  <div className="flex flex-wrap gap-2">
                    {jdContext.skills.map((s) => (
                      <span key={s} className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">{s}</span>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Interview Topics</p>
                  <ul className="space-y-1.5">
                    {jdContext.keyTopics.map((t) => (
                      <li key={t} className="flex items-center gap-2 text-slate-300 text-sm">
                        <ChevronRight className="w-3 h-3 text-indigo-400 shrink-0" /> {t}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  id="continue-btn"
                  onClick={() => setStep('name')}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_rgba(99,102,241,0.3)]"
                >
                  Looks Good — Continue <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Step 3: Enter name */}
            {step === 'name' && (
              <motion.div
                key="name"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                    <User className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Almost Ready</h2>
                    <p className="text-slate-400 text-sm">What should the interviewer call you?</p>
                  </div>
                </div>
                <input
                  id="name-input"
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="Your name (e.g. Alex)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all mb-4"
                  onKeyDown={(e) => e.key === 'Enter' && startInterview()}
                  autoFocus
                />
                {error && <p className="text-rose-400 text-sm mb-3">{error}</p>}
                <button
                  id="start-interview-btn"
                  onClick={startInterview}
                  disabled={isLoading || !candidateName.trim()}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(99,102,241,0.3)]"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                  {isLoading ? 'Preparing Interview...' : 'Start Interview Session'}
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
