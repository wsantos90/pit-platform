import { NextRequest, NextResponse } from 'next/server';

// TODO: Implementar collect
export async function POST(request: NextRequest) {
  return NextResponse.json({ message: 'TODO: collect' }, { status: 501 });
}
