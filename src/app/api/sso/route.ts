import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing_token', request.url));
  }

  try {
    const decoded = jwt.verify(token, process.env.SSO_SECRET!) as { email: string };
    const email = decoded.email;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (error || !data?.properties?.action_link) {
      return NextResponse.redirect(new URL('/login?error=sso_failed', request.url));
    }

    return NextResponse.redirect(data.properties.action_link);
  } catch (err) {
    return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
  }
}