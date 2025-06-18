import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://telegrambot-three-liart.vercel.app' 
      : 'http://localhost:3000'
    
    // Fetch real data from our sports API
    const [resultsResponse, fixturesResponse] = await Promise.allSettled([
      fetch(`${baseUrl}/api/sports/fetch-data?type=results`),
      fetch(`${baseUrl}/api/sports/fetch-data?type=fixtures`)
    ])

    let recentMatches: any[] = []
    let upcomingMatches: any[] = []
    let availableLeagues: string[] = []

    // Process results
    if (resultsResponse.status === 'fulfilled' && resultsResponse.value.ok) {
      const resultsData = await resultsResponse.value.json()
      if (resultsData.success && resultsData.data?.content?.recent_results) {
        recentMatches = resultsData.data.content.recent_results.slice(0, 5)
      }
    }

    // Process fixtures  
    if (fixturesResponse.status === 'fulfilled' && fixturesResponse.value.ok) {
      const fixturesData = await fixturesResponse.value.json()
      if (fixturesData.success && fixturesData.data?.content?.upcoming_matches) {
        upcomingMatches = fixturesData.data.content.upcoming_matches.slice(0, 5)
      }
    }

    // Extract unique leagues
    const allMatches = [...recentMatches, ...upcomingMatches]
    const leagueSet = new Set(allMatches.map(m => m.competition).filter(l => l && l !== 'Unknown League'))
    availableLeagues = Array.from(leagueSet)

    return NextResponse.json({
      success: true,
      scanTime: new Date().toISOString(),
      data: {
        totalMatches: allMatches.length,
        recentResults: recentMatches.length,
        upcomingMatches: upcomingMatches.length,
        availableLeagues,
        sampleRecentMatch: recentMatches[0] || null,
        sampleUpcomingMatch: upcomingMatches[0] || null,
        realDataExample: {
          recentMatch: recentMatches[0] ? {
            teams: `${recentMatches[0].home_team} vs ${recentMatches[0].away_team}`,
            score: `${recentMatches[0].home_score}-${recentMatches[0].away_score}`,
            competition: recentMatches[0].competition,
            date: recentMatches[0].date
          } : null,
          upcomingMatch: upcomingMatches[0] ? {
            teams: `${upcomingMatches[0].home_team} vs ${upcomingMatches[0].away_team}`,
            competition: upcomingMatches[0].competition,
            date: upcomingMatches[0].date,
            time: upcomingMatches[0].time
          } : null
        }
      }
    })

  } catch (error: any) {
    console.error('Test Real Data Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch real data' },
      { status: 500 }
    )
  }
} 