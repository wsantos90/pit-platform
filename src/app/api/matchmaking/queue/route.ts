import { NextRequest, NextResponse } from 'next/server';

// TODO: Implementar queue
export async function POST(request: NextRequest) {
  return NextResponse.json({ message: 'TODO: queue' }, { status: 501 });
}
