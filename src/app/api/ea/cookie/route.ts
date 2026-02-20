import { NextRequest, NextResponse } from 'next/server';

// TODO: Implementar cookie
export async function POST(request: NextRequest) {
  return NextResponse.json({ message: 'TODO: cookie' }, { status: 501 });
}
