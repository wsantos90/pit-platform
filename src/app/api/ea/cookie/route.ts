import { NextRequest, NextResponse } from 'next/server';

// TODO: Implementar cookie
export async function POST(_request: NextRequest) {
  return NextResponse.json({ message: 'TODO: cookie' }, { status: 501 });
}
