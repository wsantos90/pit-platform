import { NextRequest, NextResponse } from 'next/server';

// TODO: Implementar expire
export async function POST(_request: NextRequest) {
  return NextResponse.json({ message: 'TODO: expire' }, { status: 501 });
}
