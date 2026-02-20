import { NextRequest, NextResponse } from 'next/server';

// TODO: Implementar finalize
export async function POST(_request: NextRequest) {
  return NextResponse.json({ message: 'TODO: finalize' }, { status: 501 });
}
