import { NextRequest, NextResponse } from 'next/server';

// TODO: Implementar insert-manual
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Not implemented', route: 'discovery/insert-manual' },
    { status: 501 }
  );
}
