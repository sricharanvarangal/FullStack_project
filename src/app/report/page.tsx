"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { loadReport } from '@/lib/session';
import type { FullReport } from '@/lib/types';
import { ChevronDown, ChevronUp, Loader2, RotateCcw, TrendingUp, MessageSquare, Target, Zap } from 'lucide-react';

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.5s ease', filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{score}</span>
        <span className="text-xs text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

const metrics = [
  { key: 'technicalDepth', label: 'Technical Depth', icon: Zap, color: 'bg-indigo-500' },
  { key: 'communication', label: 'Communication', icon: MessageSquare, color: 'bg-violet-500' },
  { key: 'relevance', label: 'Role Relevance', icon: Target, color: 'bg-rose-500' },
  { key: 'confidence', label: 'Confidence', icon: TrendingUp, color: 'bg-amber-500' },
] as const;

export default function ReportPage() {
  const [report, setReport] = useState<FullReport | null>(null);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const r = loadReport();
    if (!r) { router.push('/'); return; }
    setReport(r);
    // Auto-expand first question
    if (r.questionFeedback?.[0]) setExpandedQ(r.questionFeedback[0].questionId);
  }, [router]);

  if (!report) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-1">Performance Report</p>
            <h1 className="text-3xl font-bold text-white">Interview Complete</h1>
          </div>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm"
          >
            <RotateCcw className="w-4 h-4" /> Practice Again
          </button>
        </div>

        {/* Score + Radar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {/* Score ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white/[0.04] border border-white/10 rounded-2xl p-6"
          >
            <p className="text-sm text-slate-400 text-center mb-4">Overall Score</p>
            <ScoreRing score={report.overallScore} />
            <div className="grid grid-cols-4 gap-2 mt-5 text-center">
              {metrics.map(({ key, label }) => (
                <div key={key}>
                  <p className="text-lg font-bold text-white">{report[key]}/10</p>
                  <p className="text-[10px] text-slate-500">{label.split(' ')[0]}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Metric bars */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white/[0.04] border border-white/10 rounded-2xl p-6"
          >
            <p className="text-sm font-semibold text-white mb-5">↗ Detailed Metrics</p>
            <div className="space-y-4">
              {metrics.map(({ key, label, icon: Icon, color }, i) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Icon className="w-3.5 h-3.5 text-slate-400" /> {label}
                    </div>
                    <span className="text-sm font-semibold text-white">{report[key]}/10</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${color} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(report[key] / 10) * 100}%` }}
                      transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Strengths + Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/[0.04] border border-white/10 rounded-2xl p-6"
          >
            <p className="text-emerald-400 font-semibold text-sm mb-3 flex items-center gap-2">
              <span>✓</span> Key Strengths
            </p>
            <ul className="space-y-2">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-emerald-400 mt-0.5 shrink-0">◆</span> {s}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white/[0.04] border border-white/10 rounded-2xl p-6"
          >
            <p className="text-amber-400 font-semibold text-sm mb-3 flex items-center gap-2">
              <span>⚠</span> Areas to Improve
            </p>
            <ul className="space-y-2">
              {report.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-amber-400 mt-0.5 shrink-0">→</span> {w}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Detailed Feedback */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 mb-6"
        >
          <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            💬 Actionable Feedback
          </p>
          <div className="text-sm text-slate-300 leading-relaxed space-y-3">
            {report.detailedFeedback.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </motion.div>

        {/* Per-question breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded border border-white/20 flex items-center justify-center text-xs">Q</span>
            Question-by-Question Breakdown
          </h2>
          <div className="space-y-3">
            {report.questionFeedback.map((qf, i) => {
              const isOpen = expandedQ === qf.questionId;
              const scoreColor = qf.score >= 8 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
                qf.score >= 6 ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                'text-rose-400 bg-rose-500/10 border-rose-500/30';
              return (
                <div key={qf.questionId} className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setExpandedQ(isOpen ? null : qf.questionId)}
                    className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.02] transition-all"
                  >
                    <span className="text-slate-500 text-sm shrink-0">0{i + 1}</span>
                    <span className="flex-1 text-sm text-slate-200 line-clamp-1">{qf.question}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${scoreColor}`}>{qf.score}/10</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
                          <div>
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">💬 What You Said</p>
                            <p className="text-sm text-slate-300">{qf.whatWasSaid}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">⭐ Strong Answer</p>
                            <p className="text-sm text-slate-300">{qf.idealAnswer}</p>
                          </div>
                          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
                            <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-1">💡 Improvement Tip</p>
                            <p className="text-sm text-amber-200/80">{qf.improvement}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Practice Again */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold flex items-center gap-2 mx-auto transition-all shadow-[0_0_30px_rgba(99,102,241,0.3)]"
          >
            <RotateCcw className="w-4 h-4" /> Practice Again
          </button>
        </div>
      </div>
    </div>
  );
}
