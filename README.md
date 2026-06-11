# ✦ Prompt Perfect

> AI-Powered Prompt Engineering SaaS — Transform any idea into perfectly optimized prompts for ChatGPT, Claude, Gemini, Grok, and Perplexity.

![Version](https://img.shields.io/badge/version-1.0.0-7c6ef5)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🚀 Features

### Core
- **3-Tier Prompt Generation** — Standard, Advanced, and Expert prompts from any input
- **5 Platform Optimizers** — Tailored for ChatGPT, Claude, Gemini, Grok, Perplexity
- **Prompt Quality Scoring** — 0-100 score with detailed breakdown (Clarity, Context, Specificity, Format, Constraints)
- **AI Follow-up Detection** — Automatically identifies missing info and asks clarifying questions
- **One-Click Copy** — Instant clipboard copy for any prompt level

### Prompt Tools
- **Make Better** — AI improves the current prompt
- **Shorten** — Condenses by 40% without losing intent
- **More Detail** — Expands with 3x more depth and examples
- **Voice Input** — Speech-to-text prompt input

### Templates (9 categories)
Coding · Resume · Study Plan · Business · Marketing · Content Writing · YouTube · Research · Image Generation

### UX
- **Dark/Light Mode** — Toggleable with smooth transition
- **Prompt History** — Last 50 prompts saved in localStorage
- **Export** — Download as TXT or PDF
- **Mobile Responsive** — Works on all screen sizes
- **Glassmorphism UI** — Modern AI SaaS aesthetic with ambient effects

---

## 📦 Tech Stack

| Layer       | Technology                    |
|-------------|-------------------------------|
| Framework   | Next.js 14 (App Router)       |
| Language    | TypeScript 5                  |
| Styling     | Tailwind CSS 3                |
| Animation   | Framer Motion 11              |
| AI Backend  | Anthropic Claude API          |
| Storage     | Browser localStorage          |
| Deployment  | Vercel (recommended)          |

---

## ⚡ Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/your-username/prompt-perfect.git
cd prompt-perfect
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

Get your API key at: https://console.anthropic.com

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Build for Production

```bash
npm run build
npm start
```

---

## 🌐 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push to GitHub
2. Import to Vercel
3. Add `ANTHROPIC_API_KEY` in Environment Variables
4. Deploy

---

## 📁 Project Structure

```
prompt-perfect/
├── src/
│   └── app/
│       ├── layout.tsx        # Root layout with metadata
│       ├── page.tsx          # Main application
│       └── globals.css       # Global styles
├── public/
│   └── favicon.ico
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── postcss.config.js
├── package.json
├── .env.example
└── README.md
```

---

## 🧠 How It Works

1. **User Input** → Enter any idea or rough prompt
2. **Platform Selection** → Choose target AI model
3. **Template** (optional) → Pick a use-case template for better context
4. **AI Generation** → Claude analyzes the input and generates 3 optimized tiers:
   - **Standard**: Clean, well-structured, 2-3x better than raw input
   - **Advanced**: Role + context + instructions + format + constraints
   - **Expert**: Full prompt engineering — chain-of-thought, few-shot examples, XML structure
5. **Quality Score** → AI scores the original input on 5 dimensions
6. **Follow-ups** → AI detects missing info and suggests clarifying questions

---

## 🔧 Customization

### Adding a New Platform

In `src/app/page.tsx`, add to the `PLATFORMS` array:

```typescript
{ id: 'mistral', name: 'Mistral', color: '#ff7000', icon: '▲' }
```

And add platform-specific tips in the `platformTips` object inside `generateWithAI`.

### Adding a New Template

```typescript
{ id: 'legal', label: 'Legal', icon: '⚖', hint: 'Draft a legal document for...' }
```

---

## 📄 License

MIT © 2024 PromptPerfect

---

## 🤝 Contributing

PRs welcome! Please open an issue first to discuss major changes.

---

*Built with ❤ using Next.js + Claude API*
