import { NextRequest, NextResponse } from 'next/server';

// TODO: Implementar scan
export async function POST(_request: NextRequest) {
  return NextResponse.json({ message: 'TODO: scan' }, { status: 501 });
}
