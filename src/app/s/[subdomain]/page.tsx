import { redirect, notFound } from 'next/navigation';
import fs from 'fs/promises';
import path from 'path';
import { SubdomainsData } from '@/types';
import { Metadata } from 'next';
import MarkdownRenderer from '@/components/MarkdownRenderer';

const DATA_FILE = path.join(process.cwd(), 'data', 'subdomains.json');

async function getSubdomain(subdomain: string) {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed: SubdomainsData = JSON.parse(data);
    return parsed.subdomains.find((s) => s.subdomain === subdomain);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;
  const config = await getSubdomain(subdomain);

  if (!config || config.type === 'redirect') {
    return { title: 'byaxon' };
  }

  return {
    title: config.title || subdomain,
    description: config.description || '',
  };
}

export default async function SubdomainPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const config = await getSubdomain(subdomain);

  if (!config) {
    notFound();
  }

  // Handle redirect
  if (config.type === 'redirect') {
    redirect(config.content);
  }

  // Handle HTML content
  if (config.type === 'html') {
    return (
      <div className="min-h-screen bg-white">
        <div dangerouslySetInnerHTML={{ __html: config.content }} />
      </div>
    );
  }

  // Handle markdown content
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {config.title && (
          <header className="mb-8 pb-8 border-b border-zinc-800">
            <h1 className="text-3xl font-bold text-white">{config.title}</h1>
            {config.description && (
              <p className="mt-2 text-zinc-400">{config.description}</p>
            )}
          </header>
        )}
        <article className="prose prose-invert prose-zinc max-w-none">
          <MarkdownRenderer content={config.content} />
        </article>
        <footer className="mt-12 pt-8 border-t border-zinc-800 text-center">
          <span className="text-zinc-600 text-sm">
            Powered by <span className="text-zinc-400">byaxon</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
