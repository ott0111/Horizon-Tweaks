/**
 * Middleware to handle CORS for cross-domain requests between Vercel deployments.
 *
 * Both https://impulse-optimizations.vercel.app serve the same app. When navigation triggers RSC (React Server Components) fetches
 * across domains, the browser blocks it unless CORS headers allow the `rsc` header.
 *
 * This middleware adds appropriate CORS headers to all responses and handles
 * OPTIONS preflight requests.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Allow requests between our Vercel deployments
const ALLOWED_ORIGINS = [
  'https://impulse-optimizations.vercel.app',
];

// Next.js RSC and navigation headers that need to be in the CORS allow list
const ALLOW_HEADERS = [
  'Content-Type',
  'Authorization',
  'rsc',
  'Next-Router-Relay',
  'Next-Router-State-Tree',
  'Next-Url',
  'next-router-prefetch',
  'x-nextjs-data',
  'x-invoke-path',
  'x-invoke-query',
];

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || '';

  // Only add CORS headers for our known origins
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);

  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS' && isAllowedOrigin) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': ALLOW_HEADERS.join(', '),
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
      },
    });
  }

  const response = NextResponse.next();

  // Add CORS headers for actual requests from allowed origins
  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', ALLOW_HEADERS.join(', '));
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Vary', 'Origin');
  }

  return response;
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
