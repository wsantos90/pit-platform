import { describe, it, expect, vi } from "vitest";
import { ensurePlayerProfile } from "@/lib/supabase/player-profile";
import type { SupabaseClient } from "@supabase/supabase-js";

// Cria um mock do cliente Supabase com a cadeia de query builder
function createMockSupabase(playerExists: boolean) {
  const mockMaybeSingle = vi.fn().mockResolvedValue({
    data: playerExists ? { id: "existing-player-id" } : null,
  });
  const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });

  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
  });

  return {
    supabase: { from: mockFrom } as unknown as SupabaseClient,
    mocks: { mockFrom, mockSelect, mockEq, mockMaybeSingle, mockInsert },
  };
}

describe("ensurePlayerProfile", () => {
  describe("quando o gamertag é vazio ou só espaços", () => {
    it("retorna sem chamar o Supabase quando gamertag é string vazia", async () => {
      const { supabase, mocks } = createMockSupabase(false);
      await ensurePlayerProfile({ supabase, userId: "uid-1", gamertag: "" });
      expect(mocks.mockFrom).not.toHaveBeenCalled();
    });

    it('retorna sem chamar o Supabase quando gamertag é só espaços "   "', async () => {
      const { supabase, mocks } = createMockSupabase(false);
      await ensurePlayerProfile({ supabase, userId: "uid-1", gamertag: "   " });
      expect(mocks.mockFrom).not.toHaveBeenCalled();
    });
  });

  describe("quando o jogador já existe", () => {
    it("retorna sem inserir quando maybeSingle retorna jogador existente", async () => {
      const { supabase, mocks } = createMockSupabase(true);
      await ensurePlayerProfile({
        supabase,
        userId: "uid-1",
        gamertag: "ProPlayer",
      });
      expect(mocks.mockInsert).not.toHaveBeenCalled();
    });

    it("só chama select, nunca insert, quando jogador já existe", async () => {
      const { supabase, mocks } = createMockSupabase(true);
      await ensurePlayerProfile({
        supabase,
        userId: "uid-1",
        gamertag: "ProPlayer",
      });
      expect(mocks.mockSelect).toHaveBeenCalledWith("id");
      expect(mocks.mockInsert).not.toHaveBeenCalled();
    });
  });

  describe("quando o jogador não existe", () => {
    it("insere jogador com gamertag, userId e primary_position MC", async () => {
      const { supabase, mocks } = createMockSupabase(false);
      await ensurePlayerProfile({
        supabase,
        userId: "uid-99",
        gamertag: "NovaEstrela",
      });
      expect(mocks.mockInsert).toHaveBeenCalledWith({
        user_id: "uid-99",
        ea_gamertag: "NovaEstrela",
        primary_position: "MC",
      });
    });

    it('faz trim do gamertag antes de inserir ("  Gamer  " → "Gamer")', async () => {
      const { supabase, mocks } = createMockSupabase(false);
      await ensurePlayerProfile({
        supabase,
        userId: "uid-99",
        gamertag: "  Gamer  ",
      });
      expect(mocks.mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ ea_gamertag: "Gamer" })
      );
    });

    it("insere exatamente { user_id, ea_gamertag, primary_position: 'MC' }", async () => {
      const { supabase, mocks } = createMockSupabase(false);
      await ensurePlayerProfile({
        supabase,
        userId: "uid-42",
        gamertag: "Striker10",
      });
      expect(mocks.mockInsert).toHaveBeenCalledTimes(1);
      expect(mocks.mockInsert).toHaveBeenCalledWith({
        user_id: "uid-42",
        ea_gamertag: "Striker10",
        primary_position: "MC",
      });
    });
  });

  describe("idempotência", () => {
    it("não lança erro na segunda chamada para o mesmo userId (segunda chamada retorna cedo)", async () => {
      // Primeira chamada: jogador não existe → insere
      const { supabase, mocks } = createMockSupabase(false);
      await ensurePlayerProfile({
        supabase,
        userId: "uid-1",
        gamertag: "Idempotente",
      });
      expect(mocks.mockInsert).toHaveBeenCalledTimes(1);

      // Segunda chamada: agora o jogador existe → deve retornar sem inserir
      const { supabase: supabase2, mocks: mocks2 } = createMockSupabase(true);
      await expect(
        ensurePlayerProfile({
          supabase: supabase2,
          userId: "uid-1",
          gamertag: "Idempotente",
        })
      ).resolves.toBeUndefined();
      expect(mocks2.mockInsert).not.toHaveBeenCalled();
    });
  });
});
