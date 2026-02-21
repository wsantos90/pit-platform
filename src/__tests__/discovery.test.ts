import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}));

import {
  prepareDiscoveredClubData,
  searchDiscoveredClubs,
  upsertDiscoveredClub,
} from '@/lib/ea/discovery';

describe('Discovery Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should normalize club name when preparing data', () => {
    const rawInput = {
      clubId: '12345',
      name: 'CÃƒÂ¡ssia',
    };

    const result = prepareDiscoveredClubData(rawInput);

    expect(result.ea_name_raw).toBe('CÃƒÂ¡ssia');
    expect(result.display_name).toBe('Cássia');
    expect(result.ea_club_id).toBe('12345');
  });

  it('should handle normal names correctly', () => {
    const rawInput = {
      clubId: '67890',
      name: 'Normal Club',
    };

    const result = prepareDiscoveredClubData(rawInput);

    expect(result.ea_name_raw).toBe('Normal Club');
    expect(result.display_name).toBe('Normal Club');
  });

  it('should handle whitespace in names', () => {
    const rawInput = {
      clubId: '11111',
      name: '  Spaced  Club  ',
    };

    const result = prepareDiscoveredClubData(rawInput);

    expect(result.display_name).toBe('Spaced Club');
  });

  it('should upsert without using non-existent updated_at column', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const single = vi.fn().mockResolvedValue({
      data: { id: 'club-1', ea_club_id: '12345', scan_count: 0 },
      error: null,
    });
    const selectAfterUpsert = vi.fn().mockReturnValue({ single });
    const upsert = vi.fn().mockReturnValue({ select: selectAfterUpsert });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const selectForExists = vi.fn().mockReturnValue({ eq });
    const from = vi
      .fn()
      .mockReturnValueOnce({ select: selectForExists })
      .mockReturnValueOnce({ upsert });

    mockCreateClient.mockResolvedValue({ from });

    await upsertDiscoveredClub({ clubId: '12345', name: 'CÃƒÆ’Ã‚Â¡ssia' });

    const upsertPayload = upsert.mock.calls[0][0] as Record<string, unknown>;
    expect(upsertPayload).not.toHaveProperty('updated_at');
  });

  it('should increment scan_count via rpc on rescan', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'club-1' }, error: null });
    const single = vi.fn().mockResolvedValue({
      data: { id: 'club-1', ea_club_id: '12345', scan_count: 4 },
      error: null,
    });
    const selectAfterUpsert = vi.fn().mockReturnValue({ single });
    const upsert = vi.fn().mockReturnValue({ select: selectAfterUpsert });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const selectForExists = vi.fn().mockReturnValue({ eq });
    const from = vi
      .fn()
      .mockReturnValueOnce({ select: selectForExists })
      .mockReturnValueOnce({ upsert });
    const rpc = vi.fn().mockResolvedValue({ error: null });

    mockCreateClient.mockResolvedValue({ from, rpc });

    await upsertDiscoveredClub({ clubId: '12345', name: 'CÃƒÆ’Ã‚Â¡ssia' });

    expect(rpc).toHaveBeenCalledWith('increment_discovered_club_scan_count', {
      p_ea_club_id: '12345',
    });
  });

  it('should return empty list on empty search query', async () => {
    const from = vi.fn();
    mockCreateClient.mockResolvedValue({ from });

    const data = await searchDiscoveredClubs('   ');

    expect(data).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });
});
