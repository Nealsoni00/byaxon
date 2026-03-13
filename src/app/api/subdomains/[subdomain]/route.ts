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

// GET - Get specific subdomain (public)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const data = await readData();
  const config = data.subdomains.find((s) => s.subdomain === subdomain);

  if (!config) {
    return NextResponse.json({ error: 'Subdomain not found' }, { status: 404 });
  }

  return NextResponse.json(config);
}

// PUT - Update subdomain
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { subdomain } = await params;

  try {
    const body: Partial<SubdomainConfig> = await request.json();
    const data = await readData();
    const index = data.subdomains.findIndex((s) => s.subdomain === subdomain);

    if (index === -1) {
      return NextResponse.json({ error: 'Subdomain not found' }, { status: 404 });
    }

    data.subdomains[index] = {
      ...data.subdomains[index],
      ...body,
      subdomain, // Prevent changing subdomain name
      updatedAt: new Date().toISOString(),
    };

    await writeData(data);

    return NextResponse.json(data.subdomains[index]);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Delete subdomain
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { subdomain } = await params;
  const data = await readData();
  const index = data.subdomains.findIndex((s) => s.subdomain === subdomain);

  if (index === -1) {
    return NextResponse.json({ error: 'Subdomain not found' }, { status: 404 });
  }

  data.subdomains.splice(index, 1);
  await writeData(data);

  return NextResponse.json({ success: true });
}
