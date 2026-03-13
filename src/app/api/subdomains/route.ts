import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';
import { SubdomainConfig, SubdomainsData } from '@/types';

const DATA_FILE = path.join(process.cwd(), 'data', 'subdomains.json');

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('byaxon_auth');
  return !!authCookie?.value;
}

async function readData(): Promise<SubdomainsData> {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { subdomains: [] };
  }
}

async function writeData(data: SubdomainsData): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET - List all subdomains
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await readData();
  return NextResponse.json(data.subdomains);
}

// POST - Create new subdomain
export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: Partial<SubdomainConfig> = await request.json();

    if (!body.subdomain || !body.type || !body.content) {
      return NextResponse.json(
        { error: 'subdomain, type, and content are required' },
        { status: 400 }
      );
    }

    // Validate subdomain format
    if (!/^[a-z0-9-]+$/.test(body.subdomain)) {
      return NextResponse.json(
        { error: 'Subdomain must only contain lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    const data = await readData();

    // Check if subdomain already exists
    if (data.subdomains.some((s) => s.subdomain === body.subdomain)) {
      return NextResponse.json({ error: 'Subdomain already exists' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const newSubdomain: SubdomainConfig = {
      subdomain: body.subdomain,
      type: body.type,
      content: body.content,
      title: body.title || body.subdomain,
      description: body.description || '',
      createdAt: now,
      updatedAt: now,
    };

    data.subdomains.push(newSubdomain);
    await writeData(data);

    return NextResponse.json(newSubdomain, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
