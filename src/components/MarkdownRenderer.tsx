'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-3xl font-bold text-white mt-8 mb-4">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-2xl font-bold text-white mt-6 mb-3">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xl font-semibold text-white mt-4 mb-2">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-zinc-300 mb-4 leading-relaxed">{children}</p>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-blue-400 hover:text-blue-300 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-4 text-zinc-300 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-4 text-zinc-300 space-y-1">{children}</ol>
        ),
        li: ({ children }) => <li className="text-zinc-300">{children}</li>,
        code: ({ className, children }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-sm text-pink-400">
                {children}
              </code>
            );
          }
          return (
            <code className="block bg-zinc-900 p-4 rounded-lg text-sm overflow-x-auto mb-4">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="bg-zinc-900 p-4 rounded-lg overflow-x-auto mb-4 text-zinc-300">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-zinc-600 pl-4 italic text-zinc-400 mb-4">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="border-zinc-700 my-8" />,
        strong: ({ children }) => (
          <strong className="font-bold text-white">{children}</strong>
        ),
        em: ({ children }) => <em className="italic text-zinc-200">{children}</em>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
