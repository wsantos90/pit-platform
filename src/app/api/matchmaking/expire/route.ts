import { NextRequest, NextResponse } from 'next/server';

// TODO: Implementar expire
export async function POST(request: NextRequest) {
  return NextResponse.json({ message: 'TODO: expire' }, { status: 501 });
}
