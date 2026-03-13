import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Simple server-side password check
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Default password hash for 'byaxon123'
const DEFAULT_HASH = 'b07e41cfe30c4d95d7a92ec97889ab5ef92988685b7e3a7aad7f30fb15398690';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    const passwordHash = hashPassword(password);

    // Read env var at runtime, fallback to default
    const expectedHash = process.env.BYAXON_PASSWORD_HASH || DEFAULT_HASH;

    if (passwordHash !== expectedHash) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Set auth cookie
    const cookieStore = await cookies();
    const token = crypto.randomBytes(32).toString('hex');

    cookieStore.set('byaxon_auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('byaxon_auth');
  return NextResponse.json({ success: true });
}
