// @ts-nocheck
"use client";

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Bot, Loader2, Award, Clock, ChevronRight, AlertCircle, Mic } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { loadSession, saveReport } from '@/lib/session';
import type { InterviewSession, FullReport } from '@/lib/types';

type InterviewState = 'ready' | 'interviewing' | 'complete';

function useTimer(running: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function getMessageText(msg: any): string {
  if (Array.isArray(msg.parts)) {
    const text = msg.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text ?? '').join('');
    if (text) return text;
  }
  if (typeof msg.content === 'string' && msg.content) return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content.filter((p: any) => p.type === 'text').map((p: any) => p.text ?? '').join('');
  }
  return '';
}

export default function InterviewPage() {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [interviewState, setInterviewState] = useState<InterviewState>('ready');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const timer = useTimer(interviewState === 'interviewing');
  const sessionRef = useRef<InterviewSession | null>(null);
  const questionIndexRef = useRef(0);
  const prevUserMsgCount = useRef(0);

  useEffect(() => {
    const s = loadSession();
    if (!s) { router.push('/'); return; }
    setSession(s);
    sessionRef.current = s;
  }, [router]);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/interview',
      body: () => ({
        jdContext: sessionRef.current?.jdContext,
        questionBank: sessionRef.current?.questionBank,
        questionIndex: questionIndexRef.current,
      }),
    }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Advance question index when user sends a message
  useEffect(() => {
    const userMsgs = messages.filter((m) => m.role === 'user').length;
    if (userMsgs > prevUserMsgCount.current && sessionRef.current) {
      prevUserMsgCount.current = userMsgs;
      const total = sessionRef.current.questionBank.questions.length;
      const newIdx = Math.min(questionIndexRef.current + 1, total - 1);
      setQuestionIndex(newIdx);
      questionIndexRef.current = newIdx;
    }
  }, [messages]);

  // Detect [COMPLETE]
  useEffect(() => {
    const lastAI = [...messages].reverse().find((m) => m.role === 'assistant');
    if (lastAI && getMessageText(lastAI).includes('[COMPLETE]')) {
      setInterviewState('complete');
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startInterview = useCallback(async () => {
    if (!sessionRef.current) return;
    setInterviewState('interviewing');
    await sendMessage({ text: `Hi, I'm ${sessionRef.current.candidateName}. I'm ready to begin.` });
  }, [sendMessage]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading || interviewState === 'complete') return;
    setInputText('');
    await sendMessage({ text });
  }, [inputText, isLoading, interviewState, sendMessage]);

  const endInterview = async () => {
    if (!sessionRef.current) return;
    setIsEnding(true);
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          jdContext: sessionRef.current.jdContext,
          questionBank: sessionRef.current.questionBank,
        }),
      });
      if (!res.ok) throw new Error('Evaluation failed');
      const report: FullReport = await res.json();
      saveReport(report);
      router.push('/report');
    } catch {
      setIsEnding(false);
    }
  };

  if (!session) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
  );

  const totalQuestions = session.questionBank.questions.length;
  const currentQ = session.questionBank.questions[Math.min(questionIndex, totalQuestions - 1)];
  const progressPct = (questionIndex / totalQuestions) * 100;

  const cleanMessages = messages.map((m) => ({
    ...m,
    displayText: getMessageText(m).replace('[COMPLETE]', '').trim(),
  })).filter((m) => m.displayText.length > 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white relative flex flex-col">
      <div className="absolute top-0 left-0 w-full h-[40%] bg-gradient-to-b from-indigo-950/40 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[30%] h-[30%] rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
            <Bot className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">{session.jdContext.roleTitle}</p>
            <p className="text-xs text-slate-400">{session.candidateName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {interviewState === 'interviewing' && (
            <div className="flex items-center gap-1.5 text-slate-400 text-sm">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-mono">{timer}</span>
            </div>
          )}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            Q {Math.min(questionIndex + 1, totalQuestions)} / {totalQuestions}
          </div>
          {(interviewState === 'interviewing' || interviewState === 'complete') && (
            <button
              id="end-interview-btn"
              onClick={endInterview}
              disabled={isEnding || messages.filter(m => m.role === 'user').length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                interviewState === 'complete'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40 border border-indigo-500/30'
              }`}
            >
              {isEnding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
              {isEnding ? 'Generating Report...' : 'End & Get Report'}
            </button>
          )}
        </div>
      </header>

      {/* Progress bar */}
      <div className="relative z-10 h-1 bg-white/5">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Topic chip */}
      {interviewState === 'interviewing' && currentQ && (
        <div className="relative z-10 flex items-center justify-center py-2 border-b border-white/5">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300">
            <ChevronRight className="w-3 h-3" />
            Topic: <span className="font-semibold">{currentQ.topic}</span>
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              currentQ.difficulty === 'hard' ? 'bg-rose-500/20 text-rose-300' :
              currentQ.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-300' :
              'bg-emerald-500/20 text-emerald-300'
            }`}>{currentQ.difficulty}</span>
          </div>
        </div>
      )}

      {/* Chat */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-5">

          {interviewState === 'ready' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-6 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.2)]">
                <Mic className="w-9 h-9 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Ready when you are, {session.candidateName}</h2>
                <p className="text-slate-400 max-w-sm">
                  Interview for <span className="text-indigo-300 font-medium">{session.jdContext.roleTitle}</span> — {totalQuestions} questions
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {session.jdContext.keyTopics.slice(0, 4).map((t) => (
                  <span key={t} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">{t}</span>
                ))}
              </div>
              <button
                id="begin-btn"
                onClick={startInterview}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-base flex items-center gap-2 transition-all shadow-[0_0_30px_rgba(99,102,241,0.4)]"
              >
                <Bot className="w-5 h-5" /> Begin Interview
              </button>
            </motion.div>
          )}

          {cleanMessages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-indigo-400" />
                </div>
              )}
              <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-white/[0.07] text-white/90 border border-white/[0.06] rounded-bl-sm'
              }`}>
                {message.displayText.split('\n').map((line: string, i: number) => (
                  <p key={i} className="mb-1 last:mb-0 min-h-[1.25em]">{line}</p>
                ))}
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-slate-300" />
                </div>
              )}
            </motion.div>
          ))}

          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-1">
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              </div>
              <div className="bg-white/[0.07] border border-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {interviewState === 'complete' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Interview complete!</p>
                  <p className="text-emerald-400/80">Click <strong>End & Get Report</strong> above for your performance analysis.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      {(interviewState === 'interviewing' || interviewState === 'complete') && (
        <div className="relative z-10 border-t border-white/5 bg-slate-950/80 backdrop-blur-md px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <textarea
                id="answer-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={interviewState === 'complete' ? 'Interview done — click End & Get Report ↑' : 'Type your answer... (Enter to send, Shift+Enter for new line)'}
                disabled={isLoading || interviewState === 'complete'}
                rows={1}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 pr-14 text-white placeholder:text-slate-500 text-sm resize-none min-h-[56px] max-h-[180px] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all disabled:opacity-50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
              />
              <button
                id="send-btn"
                onClick={handleSend}
                disabled={isLoading || !inputText.trim() || interviewState === 'complete'}
                className="absolute right-2.5 bottom-2.5 w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center text-slate-600 text-xs mt-2">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      )}
    </div>
  );
}
