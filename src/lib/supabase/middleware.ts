import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // HARDCODED WHITELIST - ONLY THESE 3 EMAILS CAN ACCESS DASHBOARD
  const AUTHORIZED_EMAILS = [
    'saarth@sixtyfour.ai',
    'roham@sixtyfour.ai',
    'chrisprice@sixtyfour.ai'
  ];

  const isAuthorizedEmail = user?.email && AUTHORIZED_EMAILS.includes(user.email.toLowerCase());

  // Protected routes that require authorization
  const protectedPaths = ['/', '/workflows', '/credits-management', '/platform-access'];
  const isProtectedRoute = protectedPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  );

  // If no user and trying to access protected route, redirect to signin
  if (
    !user &&
    isProtectedRoute &&
    !request.nextUrl.pathname.startsWith("/auth/")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    return NextResponse.redirect(url);
  }

  // If user exists but NOT in whitelist, block access to protected routes
  if (user && isProtectedRoute && !isAuthorizedEmail) {
    console.log('🚨 UNAUTHORIZED EMAIL ATTEMPTING ACCESS:', user.email);
    
    // Sign them out
    await supabase.auth.signOut();
    
    // Redirect to signin with error
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    url.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

