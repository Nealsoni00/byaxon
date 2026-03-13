import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SubdomainConfig } from '@/types';
import { getSubdomain, updateSubdomain, deleteSubdomain } from '@/lib/storage';

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('byaxon_auth');
  return !!authCookie?.value;
}

// GET - Get specific subdomain (public)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;

  try {
    const config = await getSubdomain(subdomain);

    if (!config) {
      return NextResponse.json({ error: 'Subdomain not found' }, { status: 404 });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching subdomain:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
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
    const updated = await updateSubdomain(subdomain, body);

    if (!updated) {
      return NextResponse.json({ error: 'Subdomain not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating subdomain:', error);
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

  try {
    const deleted = await deleteSubdomain(subdomain);

    if (!deleted) {
      return NextResponse.json({ error: 'Subdomain not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting subdomain:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
