import { NextRequest, NextResponse } from 'next/server';

// TODO: Implementar enroll
export async function POST(_request: NextRequest) {
  return NextResponse.json({ message: 'TODO: enroll' }, { status: 501 });
}
