import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchMatchesPreview } from '@/lib/ea/api'
import { tryFetchAkamaiCookies } from '@/lib/ea/cookieClient'

export async function GET(request: NextRequest) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const eaClubId = request.nextUrl.searchParams.get('eaClubId')
    if (!eaClubId || !/^\d+$/.test(eaClubId)) {
        return NextResponse.json({ error: 'eaClubId inválido' }, { status: 400 })
    }

    try {
        const cookies = await tryFetchAkamaiCookies()
        const matches = await fetchMatchesPreview(eaClubId, cookies ?? undefined)

        const result = matches.map((m) => {
            const isHome = m.homeClubId === eaClubId
            const opponent = isHome ? m.awayClubName : m.homeClubName
            const goalsFor = isHome ? m.homeScore : m.awayScore
            const goalsAgainst = isHome ? m.awayScore : m.homeScore
            const result: 'W' | 'D' | 'L' =
                goalsFor > goalsAgainst ? 'W' : goalsFor === goalsAgainst ? 'D' : 'L'

            return {
                matchId: m.matchId,
                date: m.timestampBrasilia,
                opponent,
                goalsFor,
                goalsAgainst,
                result,
            }
        })

        return NextResponse.json({ matches: result })
    } catch (error) {
        console.error('[claim/preview] Falha ao buscar partidas EA:', error)
        return NextResponse.json(
            { error: 'Não foi possível carregar as partidas. Tente novamente.' },
            { status: 502 }
        )
    }
}
