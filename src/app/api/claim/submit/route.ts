import { NextRequest, NextResponse } from 'next/server';

// TODO: Implementar submit
export async function POST(_request: NextRequest) {
  return NextResponse.json({ message: 'TODO: submit' }, { status: 501 });
}
