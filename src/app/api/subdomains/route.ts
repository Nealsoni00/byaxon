import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SubdomainConfig } from '@/types';
import { getSubdomains, createSubdomain, saveSubdomains } from '@/lib/storage';

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('byaxon_auth');
  return !!authCookie?.value;
}

// GET - List all subdomains
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const subdomains = await getSubdomains();
    return NextResponse.json(subdomains, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error fetching subdomains:', error);
    return NextResponse.json({ error: 'Failed to fetch subdomains' }, { status: 500 });
  }
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

    await createSubdomain(newSubdomain);
    // Return all subdomains so frontend can update state immediately
    const allSubdomains = await getSubdomains();
    return NextResponse.json({ created: newSubdomain, all: allSubdomains }, { status: 201 });
  } catch (error) {
    console.error('Error creating subdomain:', error);
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
