'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from "jspdf";

// ── Types ──────────────────────────────────────────────────────────────────
type Platform = 'chatgpt' | 'claude' | 'gemini' | 'grok' | 'perplexity';
type PromptLevel = 'standard' | 'advanced' | 'expert';
type Template =
  | 'coding' | 'resume' | 'study' | 'business' | 'marketing'
  | 'content' | 'youtube' | 'research' | 'image';

interface GeneratedPrompt {
  standard: string;
  advanced: string;
  expert: string;
  score: number;
  scoreBreakdown: { label: string; value: number; max: number }[];
  followUps: string[];
  missing: string[];
}

interface HistoryItem {
  id: string;
  input: string;
  prompt: GeneratedPrompt;
  platform: Platform;
  template: Template | null;
  timestamp: number;
}

// ── Constants ──────────────────────────────────────────────────────────────
const PLATFORMS: { id: Platform; name: string; color: string; icon: string }[] = [
  { id: 'chatgpt',    name: 'ChatGPT',    color: '#10a37f', icon: '✦' },
  { id: 'claude',     name: 'Claude',     color: '#cc785c', icon: '◈' },
  { id: 'gemini',     name: 'Gemini',     color: '#4285f4', icon: '✧' },
  { id: 'grok',       name: 'Grok',       color: '#1a1a2e', icon: '⟡' },
  { id: 'perplexity', name: 'Perplexity', color: '#20b2aa', icon: '∞' },
];

const TEMPLATES: { id: Template; label: string; icon: string; hint: string }[] = [
  { id: 'coding',    label: 'Coding',          icon: '⌨',  hint: 'Write a Python function that...' },
  { id: 'resume',    label: 'Resume',           icon: '📄', hint: 'Help me write a resume for...' },
  { id: 'study',     label: 'Study Plan',       icon: '📚', hint: 'Create a study plan for...' },
  { id: 'business',  label: 'Business',         icon: '💼', hint: 'Help me build a business plan for...' },
  { id: 'marketing', label: 'Marketing',        icon: '📣', hint: 'Create a marketing strategy for...' },
  { id: 'content',   label: 'Content Writing',  icon: '✍',  hint: 'Write a blog post about...' },
  { id: 'youtube',   label: 'YouTube',          icon: '▶',  hint: 'Create a YouTube script for...' },
  { id: 'research',  label: 'Research',         icon: '🔬', hint: 'Research and summarize...' },
  { id: 'image',     label: 'Image Gen',        icon: '🎨', hint: 'Generate an image of...' },
];

// ── AI Prompt Generator Logic ──────────────────────────────────────────────
async function generateWithAI(
  input: string,
  platform: Platform,
  template: Template | null,
  action: 'generate' | 'improve' | 'shorten' | 'detail' = 'generate',
  existingPrompt?: string
): Promise<GeneratedPrompt> {
  const platformTips: Record<Platform, string> = {
    chatgpt:    'ChatGPT responds best to clear role assignments, step-by-step instructions, and explicit output formatting. Use "Act as" framing and numbered lists.',
    claude:     'Claude excels with XML tags like <context>, <instructions>, <format>. Be explicit about reasoning style and use structured sections.',
    gemini:     'Gemini benefits from multimodal context hints, Google-style structured data requests, and clear factual constraints with source preferences.',
    grok:       'Grok handles casual tone well. Include real-time data requests, opinion-based framing, and X/Twitter context where relevant.',
    perplexity: 'Perplexity is search-augmented. Frame prompts as research queries with cited-source requirements and recency constraints.',
  };

  const templateContext: Record<Template, string> = {
    coding:    'Focus on language, version, edge cases, error handling, time/space complexity, and code comments.',
    resume:    'Include role, years of experience, industry, key achievements, and target company type.',
    study:     'Specify subject, current level, available hours/day, exam date, and preferred learning style.',
    business:  'Cover market, target audience, budget, timeline, competitive landscape, and success metrics.',
    marketing: 'Define product/service, target demographic, channels, budget, and KPIs.',
    content:   'Specify audience, tone, length, SEO keywords, call-to-action, and publication platform.',
    youtube:   'Include niche, target subscriber base, video length, thumbnail style, and monetization goals.',
    research:  'Clarify scope, depth, sources preference, time period, and output format (report/summary/bullets).',
    image:     'Specify art style, mood, lighting, color palette, composition, aspect ratio, and negative prompts.',
  };

  const actionInstruction = {
    generate: '',
    improve:  `You are improving this existing prompt: "${existingPrompt}". Make it significantly better.`,
    shorten:  `You are condensing this prompt to be 40% shorter while keeping all key intent: "${existingPrompt}".`,
    detail:   `You are expanding this prompt with 3x more detail, examples, and constraints: "${existingPrompt}".`,
  }[action];

  const systemPrompt = `You are PromptPerfect, an elite prompt engineering AI that transforms raw user input into world-class AI prompts.

Your task: Convert user input into 3 tiers of optimized prompts for ${platform.toUpperCase()}.

Platform guidance: ${platformTips[platform]}
${template ? `Template context: ${templateContext[template]}` : ''}
${actionInstruction}

Analyze the input for:
- Clarity gaps
- Missing context  
- Ambiguous intent
- Lack of role assignment
- No output format specified
- Missing constraints

Return a JSON object with this EXACT structure (no markdown, raw JSON only):
{
  "standard": "A clean, well-structured prompt that's 2-3x better than raw input. Add role, context, and clear output format.",
  "advanced": "A comprehensive prompt with role assignment, detailed context, step-by-step instructions, output format, constraints, and 1-2 examples. 3-4 paragraphs.",
  "expert": "A masterclass prompt with XML/markdown structure, chain-of-thought instructions, few-shot examples, explicit reasoning steps, quality criteria, fallback instructions, and platform-specific optimizations. Use headers and sections.",
  "score": <number 0-100 based on original input quality>,
  "scoreBreakdown": [
    {"label": "Clarity", "value": <0-20>, "max": 20},
    {"label": "Context", "value": <0-20>, "max": 20},
    {"label": "Specificity", "value": <0-20>, "max": 20},
    {"label": "Output Format", "value": <0-20>, "max": 20},
    {"label": "Constraints", "value": <0-20>, "max": 20}
  ],
  "followUps": ["<question to improve prompt>", "<question>", "<question>"],
  "missing": ["<missing element>", "<missing element>"]
}`;

  const res = await fetch('/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: systemPrompt + '\n\n' + input
  })
})


const data = await res.json();

console.log("FULL DATA:", data);

if (data.error) {
  throw new Error(data.error);
}

const text =
  data?.choices?.[0]?.message?.content ||
  "";

console.log("TEXT:", text);

if (!text) {
  throw new Error("No AI response received");
}
try {
  const clean = text.replace(/```json|```/g, '').trim();
  const jsonStart = clean.indexOf('{');
  const jsonEnd = clean.lastIndexOf('}') + 1;

  if (jsonStart === -1 || jsonEnd === 0) {
    throw new Error("No JSON found");
  }

  const jsonText = clean.slice(jsonStart, jsonEnd);

  return JSON.parse(jsonText);

} catch (err) {
  console.error("PARSE ERROR:", err);
  console.log("RAW RESPONSE:", text);

  return {
    standard: text || "No response received",
    advanced: text || "No response received",
    expert: text || "No response received",
    score: 50,
    scoreBreakdown: [
      { label: "Clarity", value: 10, max: 20 },
      { label: "Context", value: 10, max: 20 },
      { label: "Specificity", value: 10, max: 20 },
      { label: "Output Format", value: 10, max: 20 },
      { label: "Constraints", value: 10, max: 20 },
    ],
    followUps: [],
    missing: [],
  };
}


// ── Sub-components ─────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? '#00f5a0' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
      <svg width="88" height="88" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle
          cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'var(--font-mono, monospace)' }}>{score}</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: 1 }}>SCORE</span>
      </div>
    </div>
  );
}
const downloadPDF = (text: string = "") => {
  const doc = new jsPDF();

  doc.setFontSize(12);

  doc.text(
    text || "No prompt generated",
    10,
    20,
    {
      maxWidth: 180,
    }
  );

  doc.save("optimized-prompt.pdf");
};

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
      background: copied ? 'rgba(0,245,160,0.15)' : 'rgba(255,255,255,0.07)',
      border: `1px solid ${copied ? 'rgba(0,245,160,0.4)' : 'rgba(255,255,255,0.12)'}`,
      borderRadius: 8, cursor: 'pointer', fontSize: 12, color: copied ? '#00f5a0' : 'rgba(255,255,255,0.7)',
      transition: 'all 0.2s',
    }}>
      {copied ? '✓ Copied!' : `⧉ ${label}`}
    </button>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function PromptPerfect() {
  const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

  const [dark, setDark] = useState(true);
  const [input, setInput] = useState('');
  const [platform, setPlatform] = useState<Platform>('chatgpt');
  const [template, setTemplate] = useState<Template | null>(null);
  const [level, setLevel] = useState<PromptLevel>('standard');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedPrompt | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showFollowUps, setShowFollowUps] = useState(false);
  const [listening, setListening] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    try {
      const h = localStorage.getItem('pp_history');
      if (h) setHistory(JSON.parse(h));
    } catch {}
  }, []);
  
  const saveHistory = (item: HistoryItem) => {
    const updated = [item, ...history].slice(0, 50);
    setHistory(updated);
    localStorage.setItem('pp_history', JSON.stringify(updated));
  };

  const generate = useCallback(async (action: 'generate' | 'improve' | 'shorten' | 'detail' = 'generate') => {
    if (!input.trim()) return;
    setLoading(true);
    setActiveAction(action);
    try {
      const existing = result ? result[level] : undefined;
      const res = await generateWithAI(input, platform, template, action, existing);
      setResult(res);
      setShowFollowUps(res.followUps.length > 0);
      if (action === 'generate') {
        saveHistory({ id: Date.now().toString(), input, prompt: res, platform, template, timestamp: Date.now() });
      }
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  }, [input, platform, template, result, level, history]);

  const startVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice input not supported in this browser.');
      return;
    }
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.onresult = (e: any) => {
      setInput(e.results[0][0].transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const exportTxt = () => {
    if (!result) return;
    const blob = new Blob([
      `PROMPT PERFECT EXPORT\n${'='.repeat(40)}\n\nInput: ${input}\nPlatform: ${platform}\n\nSTANDARD:\n${result.standard}\n\nADVANCED:\n${result.advanced}\n\nEXPERT:\n${result.expert}\n\nScore: ${result.score}/100`
    ], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'prompt.txt'; a.click();
  };

 const exportPdf = () => {
  if (!result) return;

  const doc = new jsPDF();

  let y = 20;

  doc.setFontSize(18);
  doc.text("Prompt Perfect Export", 10, y);

  y += 15;

  doc.setFontSize(12);

  doc.text(`Input: ${input}`, 10, y);

  y += 15;

  doc.text("STANDARD:", 10, y);
  y += 10;

  const standardLines = doc.splitTextToSize(
    result.standard || "",
    180
  );
  doc.text(standardLines, 10, y);

  y += standardLines.length * 7 + 10;

  doc.text("ADVANCED:", 10, y);
  y += 10;

  const advancedLines = doc.splitTextToSize(
    result.advanced || "",
    180
  );
  doc.text(advancedLines, 10, y);

  y += advancedLines.length * 7 + 10;

  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  doc.text("EXPERT:", 10, y);
  y += 10;

  const expertLines = doc.splitTextToSize(
    result.expert || "",
    180
  );
  doc.text(expertLines, 10, y);

  doc.save("prompt-perfect.pdf");
};

  const bg = dark
    ? 'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #0a0e1a 100%)'
    : 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f0f9ff 100%)';
  const card = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const text = dark ? '#f1f5f9' : '#0f172a';
  const muted = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const accent = '#7c6ef5';

  const currentPrompt = result?.[level] || '';
  const selPlatform = PLATFORMS.find(p => p.id === platform)!;

  return (
    <div style={{
      minHeight: '100vh', background: bg, fontFamily: "'DM Sans', -apple-system, sans-serif",
      color: text, transition: 'all 0.3s',
    }}>
      {/* Ambient orbs */}
      {dark && <>
        <div style={{ position: 'fixed', top: -200, left: -200, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,110,245,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'fixed', bottom: -100, right: -100, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,245,160,0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      </>}

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '0 20px 60px' }}>

        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0 32px', borderBottom: `1px solid ${border}`, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg, #7c6ef5, #00f5a0)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✦</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px' }}>Prompt<span style={{ color: accent }}>Perfect</span></h1>
              <p style={{ margin: 0, fontSize: 11, color: muted, letterSpacing: 0.5 }}>AI PROMPT ENGINEERING</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => setShowHistory(!showHistory)} style={{ padding: '8px 14px', background: showHistory ? `${accent}20` : card, border: `1px solid ${showHistory ? accent + '60' : border}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, color: showHistory ? accent : muted }}>
              ⏱ History ({history.length})
            </button>
            <button onClick={() => setDark(!dark)} style={{ width: 36, height: 36, background: card, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', fontSize: 16 }}>
              {dark ? '☀' : '🌙'}
            </button>
          </div>
        </header>

        {/* History Panel */}
        <AnimatePresence>
          {showHistory && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 20, marginBottom: 24, backdropFilter: 'blur(20px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Prompt History</h3>
                <button onClick={() => { setHistory([]); localStorage.removeItem('pp_history'); }} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Clear all</button>
              </div>
              {history.length === 0 ? <p style={{ color: muted, fontSize: 13, margin: 0 }}>No history yet.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                  {history.map(h => (
                    <div key={h.id} onClick={() => { setInput(h.input); setResult(h.prompt); setPlatform(h.platform); setShowHistory(false); }}
                      style={{ padding: '10px 14px', background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${border}`, borderRadius: 10, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{h.input.slice(0, 60)}{h.input.length > 60 ? '…' : ''}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: muted }}>{new Date(h.timestamp).toLocaleString()} · {h.platform} · Score: {h.prompt.score}</p>
                      </div>
                      <span style={{ fontSize: 11, color: accent }}>Load →</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Template Row */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: muted, marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Quick Templates</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => { setTemplate(template === t.id ? null : t.id); if (template !== t.id) setInput(t.hint); }}
                style={{ padding: '7px 14px', background: template === t.id ? `${accent}20` : card, border: `1px solid ${template === t.id ? accent + '60' : border}`, borderRadius: 20, cursor: 'pointer', fontSize: 12, color: template === t.id ? accent : muted, display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.2s' }}>
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Platform Selector */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: muted, marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Optimize For</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PLATFORMS.map(p => (
              <button key={p.id} onClick={() => setPlatform(p.id)}
                style={{ padding: '8px 16px', background: platform === p.id ? `${p.color}20` : card, border: `1px solid ${platform === p.id ? p.color + '80' : border}`, borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: platform === p.id ? 600 : 400, color: platform === p.id ? p.color : muted, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
                <span style={{ fontSize: 16 }}>{p.icon}</span> {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Main Input */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate(); }}
            placeholder={`Describe what you need… e.g. "Make me a study plan for DSA in 30 days"\n\nCtrl+Enter to generate`}
            style={{
              width: '100%', minHeight: 130, padding: '18px 60px 18px 20px',
              background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              border: `1px solid ${border}`, borderRadius: 16,
              color: text, fontSize: 15, lineHeight: 1.6, resize: 'vertical',
              outline: 'none', backdropFilter: 'blur(20px)',
              fontFamily: 'inherit', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />
          <button onClick={startVoice}
            style={{ position: 'absolute', top: 14, right: 14, width: 36, height: 36, background: listening ? 'rgba(239,68,68,0.2)' : card, border: `1px solid ${listening ? '#ef4444' : border}`, borderRadius: 8, cursor: 'pointer', fontSize: 16, color: listening ? '#ef4444' : muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {listening ? '⏹' : '🎙'}
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 32 }}>
          <button onClick={() => generate('generate')} disabled={!input.trim() || loading}
            style={{ padding: '11px 28px', background: `linear-gradient(135deg, ${accent}, #00d4aa)`, border: 'none', borderRadius: 10, cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 600, color: '#fff', opacity: input.trim() && !loading ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}>
            {loading && activeAction === 'generate' ? '⟳ Generating…' : '✦ Generate Prompt'}
          </button>
          {result && <>
            <button onClick={() => generate('improve')} disabled={loading}
              style={{ padding: '11px 18px', background: card, border: `1px solid ${border}`, borderRadius: 10, cursor: 'pointer', fontSize: 13, color: muted, display: 'flex', alignItems: 'center', gap: 6 }}>
              {loading && activeAction === 'improve' ? '⟳' : '⚡'} Make Better
            </button>
            <button onClick={() => generate('shorten')} disabled={loading}
              style={{ padding: '11px 18px', background: card, border: `1px solid ${border}`, borderRadius: 10, cursor: 'pointer', fontSize: 13, color: muted, display: 'flex', alignItems: 'center', gap: 6 }}>
              {loading && activeAction === 'shorten' ? '⟳' : '◈'} Shorten
            </button>
            <button onClick={() => generate('detail')} disabled={loading}
              style={{ padding: '11px 18px', background: card, border: `1px solid ${border}`, borderRadius: 10, cursor: 'pointer', fontSize: 13, color: muted, display: 'flex', alignItems: 'center', gap: 6 }}>
              {loading && activeAction === 'detail' ? '⟳' : '◎'} More Detail
            </button>
            <button onClick={exportTxt} style={{ padding: '11px 18px', background: card, border: `1px solid ${border}`, borderRadius: 10, cursor: 'pointer', fontSize: 13, color: muted }}>↓ TXT</button>
            <button onClick={exportPdf} style={{ padding: '11px 18px', background: card, border: `1px solid ${border}`, borderRadius: 10, cursor: 'pointer', fontSize: 13, color: muted }}>↓ PDF</button>
          </>}
        </div>

        {/* Loading skeleton */}
        {loading && !result && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height: 180, background: card, border: `1px solid ${border}`, borderRadius: 16, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

              {/* Score + Breakdown */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                <div style={{ flex: '0 0 auto', background: card, border: `1px solid ${border}`, borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, backdropFilter: 'blur(20px)' }}>
                  <ScoreRing score={result.score} />
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: muted, marginBottom: 6 }}>Input quality</p>
                    {result.scoreBreakdown.map(s => (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: muted, width: 80 }}>{s.label}</span>
                        <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(s.value / s.max) * 100}%`, background: s.value / s.max > 0.6 ? '#00f5a0' : s.value / s.max > 0.3 ? '#f59e0b' : '#ef4444', borderRadius: 2, transition: 'width 0.8s ease' }} />
                        </div>
                        <span style={{ fontSize: 10, color: muted }}>{s.value}/{s.max}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Missing / Follow-ups */}
                {result.missing.length > 0 && (
                  <div style={{ flex: 1, minWidth: 200, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: '16px 20px' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: '#ef4444', fontWeight: 600 }}>⚠ Missing Elements</p>
                    {result.missing.map(m => <p key={m} style={{ margin: '0 0 4px', fontSize: 12, color: muted }}>· {m}</p>)}
                  </div>
                )}
                {showFollowUps && result.followUps.length > 0 && (
                  <div style={{ flex: 1, minWidth: 200, background: 'rgba(124,110,245,0.05)', border: '1px solid rgba(124,110,245,0.2)', borderRadius: 16, padding: '16px 20px' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: accent, fontWeight: 600 }}>💡 Follow-up Questions</p>
                    {result.followUps.map(q => (
                      <button key={q} onClick={() => { setInput(input + '. ' + q.replace('?', '')); }}
                        style={{ display: 'block', margin: '4px 0', fontSize: 12, color: muted, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                        · {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Level Tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 4, width: 'fit-content' }}>
                {(['standard', 'advanced', 'expert'] as PromptLevel[]).map(l => (
                  <button key={l} onClick={() => setLevel(l)}
                    style={{ padding: '8px 20px', background: level === l ? accent : 'transparent', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: level === l ? 600 : 400, color: level === l ? '#fff' : muted, transition: 'all 0.2s', textTransform: 'capitalize' }}>
                    {l === 'standard' ? '◎ Standard' : l === 'advanced' ? '⬡ Advanced' : '✦ Expert'}
                  </button>
                ))}
              </div>

              {/* Prompt Display */}
              <AnimatePresence mode="wait">
                <motion.div key={level} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                  <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden', backdropFilter: 'blur(20px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${border}`, background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, color: selPlatform.color }}>{selPlatform.icon}</span>
                        <span style={{ fontSize: 12, color: muted }}>Optimized for {selPlatform.name} · <span style={{ textTransform: 'capitalize' }}>{level}</span></span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 11, color: muted }}>{currentPrompt.length} chars</span>
                        <CopyBtn text={currentPrompt} label="Copy Prompt" />
                      </div>
                    </div>
                    <pre style={{ margin: 0, padding: '20px', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: dark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)', fontFamily: "'JetBrains Mono', 'Fira Code', monospace', maxHeight: 400, overflowY: 'auto'" }}>
                      {currentPrompt}
                    </pre>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* All 3 versions side by side quick view */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 16 }}>
                {(['standard', 'advanced', 'expert'] as PromptLevel[]).map(l => (
                  <div key={l} onClick={() => setLevel(l)} style={{ padding: 14, background: level === l ? `${accent}10` : card, border: `1px solid ${level === l ? accent + '50' : border}`, borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: level === l ? accent : muted, textTransform: 'capitalize' }}>{l}</span>
                      <CopyBtn text={result[l]} />
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: muted, lineHeight: 1.5 }}>{result[l].slice(0, 100)}…</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

    </div>
  );
}
