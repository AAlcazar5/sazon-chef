import { NextResponse } from 'next/server';
import { z } from 'zod';

const waitlistSchema = z.object({
  email: z.string().email(),
  topCuisine: z.string().min(1).max(40).nullable(),
  macroGoal: z
    .enum(['lighter', 'strong_lean', 'flavor_balanced', 'discovery'])
    .nullable(),
  dietary: z.array(z.string().min(1).max(20)).max(7),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SignupResult {
  id: string;
  position?: number;
}

export async function POST(
  request: Request,
): Promise<NextResponse<ApiResponse<SignupResult>>> {
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body.' },
      { status: 400 },
    );
  }

  const parsed = waitlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'That email looks off — mind double-checking?' },
      { status: 400 },
    );
  }

  const referer = request.headers.get('referer') ?? undefined;
  const source = referer ? new URL(referer).hostname : undefined;

  try {
    const upstream = await fetch(`${backendUrl}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...parsed.data, ...(source ? { source } : {}) }),
    });

    const json = (await upstream.json()) as ApiResponse<SignupResult>;
    return NextResponse.json(json, { status: upstream.status });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Couldn't reach the kitchen. Mind trying again in a moment?",
      },
      { status: 502 },
    );
  }
}
