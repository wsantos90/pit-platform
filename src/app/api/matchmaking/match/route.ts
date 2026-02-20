import { NextRequest, NextResponse } from 'next/server';

// TODO: Implementar match
export async function POST(_request: NextRequest) {
  return NextResponse.json({ message: 'TODO: match' }, { status: 501 });
}
