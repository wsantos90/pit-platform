import { NextRequest, NextResponse } from 'next/server';

// TODO: Implementar review
export async function POST(_request: NextRequest) {
  return NextResponse.json({ message: 'TODO: review' }, { status: 501 });
}
