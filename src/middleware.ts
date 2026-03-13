import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Extract subdomain - handle both local dev and production
  // Production: subdomain.byaxon.com
  // Local: subdomain.localhost:3000
  let subdomain: string | null = null;

  // List of main domain patterns to ignore
  const mainDomains = ['byaxon.com', 'www.byaxon.com', 'localhost:3000', 'localhost', '127.0.0.1'];
  const vercelPreview = hostname.includes('.vercel.app');

  if (!mainDomains.some(d => hostname === d) && !vercelPreview) {
    // Check if it's a subdomain
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      // For production: sub.byaxon.com -> subdomain = sub
      // For local: sub.localhost:3000 -> subdomain = sub
      if (hostname.includes('byaxon.com')) {
        subdomain = parts[0];
      } else if (hostname.includes('localhost')) {
        subdomain = parts[0];
      }
    }
  }

  // If we have a subdomain, rewrite to the subdomain handler page
  if (subdomain && subdomain !== 'www') {
    const url = request.nextUrl.clone();
    url.pathname = `/s/${subdomain}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // For main domain, check if user is authenticated for admin routes
  if (pathname.startsWith('/admin')) {
    const authCookie = request.cookies.get('byaxon_auth');
    if (!authCookie?.value) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and api routes that handle their own auth
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
};
