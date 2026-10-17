import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json({ error: 'No account found with this email' }, { status: 404 });
    }

    if (password && user.password) {
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name || cleanEmail.split('@')[0],
        email: user.email,
        image: user.image,
      },
    });
  } catch (err: any) {
    console.error('Login API error:', err);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
