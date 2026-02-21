import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockCreateAdminClient, mockUpsertDiscoveredClub } = vi.hoisted(() => ({
  mockCreateAdminClient: vi.fn(),
  mockUpsertDiscoveredClub: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mockCreateAdminClient,
}));

vi.mock('@/lib/ea/discovery', () => ({
  upsertDiscoveredClub: mockUpsertDiscoveredClub,
}));

import { POST } from '@/app/api/discovery/scan/route';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/discovery/scan', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/discovery/scan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid payload', async () => {
    const response = await POST(makeRequest({ clubs: [] }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid payload');
  });

  it('processes valid payload and returns summary counters', async () => {
    const adminClient = { tag: 'admin-client' };
    mockCreateAdminClient.mockReturnValue(adminClient);
    mockUpsertDiscoveredClub.mockResolvedValue({});

    const response = await POST(
      makeRequest({
        clubs: [
          { clubId: '1', name: 'CÃƒÆ’Ã‚Â¡ssia' },
          { clubId: '2', name: 'AthÃƒÆ’Ã‚Â©tica' },
        ],
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      processed: 2,
      inserted_or_updated: 2,
      failed: 0,
      failures: [],
    });
    expect(mockUpsertDiscoveredClub).toHaveBeenCalledTimes(2);
    expect(mockUpsertDiscoveredClub).toHaveBeenNthCalledWith(
      1,
      { clubId: '1', name: 'CÃƒÆ’Ã‚Â¡ssia' },
      adminClient
    );
  });
});
