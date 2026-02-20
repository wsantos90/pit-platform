import { NextRequest, NextResponse } from 'next/server';

// TODO: Implementar run
export async function POST(_request: NextRequest) {
  return NextResponse.json({ message: 'TODO: run' }, { status: 501 });
}
