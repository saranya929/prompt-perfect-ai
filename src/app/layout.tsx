import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prompt Perfect AI Prompt Engineering',
  description:
    'Transform any idea into perfectly optimized AI prompts for ChatGPT, Claude, Gemini, Grok, and more.',
  keywords: [
    'AI prompts',
    'prompt engineering',
    'ChatGPT prompts',
    'Claude prompts',
    'prompt optimizer',
  ],
  authors: [{ name: 'PromptPerfect' }],
  openGraph: {
    title: 'Prompt Perfect AI Prompt Engineering',
    description: 'Transform any idea into perfectly optimized AI prompts.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}