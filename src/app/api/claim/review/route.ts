import { NextRequest, NextResponse } from 'next/server';

// TODO: Implementar review
export async function POST(request: NextRequest) {
  return NextResponse.json({ message: 'TODO: review' }, { status: 501 });
}
