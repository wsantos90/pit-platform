import { NextRequest, NextResponse } from 'next/server';

// TODO: Implementar create
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Not implemented', route: 'tournament/create' },
    { status: 501 }
  );
}
