import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// African league mapping for API calls
const AFRICAN_LEAGUE_MAPPING = {
  // East Africa - Primary markets
  'eth_premier': {
    name: 'Ethiopian Premier League',
    country: 'Ethiopia',
    api_ids: {
      'apifootball': '302',
      'api-football': '604',
      'soccersapi': 'ethiopia-premier-league'
    }
  },
  'tz_premier': {
    name: 'Tanzanian Premier League', 
    country: 'Tanzania',
    api_ids: {
      'apifootball': '351',
      'api-football': '686',
      'soccersapi': 'tanzania-premier-league'
    }
  },
  'ug_premier': {
    name: 'Uganda Premier League',
    country: 'Uganda', 
    api_ids: {
      'apifootball': '389',
      'api-football': '712',
      'soccersapi': 'uganda-premier-league'
    }
  },
  'rw_premier': {
    name: 'Rwanda Premier League',
    country: 'Rwanda',
    api_ids: {
      'apifootball': '337',
      'api-football': '674',
      'soccersapi': 'rwanda-premier-league'
    }
  },
  'ke_premier': {
    name: 'Kenyan Premier League',
    country: 'Kenya',
    api_ids: {
      'apifootball': '315',
      'api-football': '644',
      'soccersapi': 'kenya-premier-league'
    }
  },
  // Continental competitions
  'caf_champions': {
    name: 'CAF Champions League',
    country: 'Africa',
    api_ids: {
      'apifootball': '12',
      'api-football': '12',
      'soccersapi': 'caf-champions-league'
    }
  },
  'caf_confederation': {
    name: 'CAF Confederation Cup',
    country: 'Africa',
    api_ids: {
      'apifootball': '15',
      'api-football': '15',
      'soccersapi': 'caf-confederation-cup'
    }
  },
  // North Africa
  'eg_premier': {
    name: 'Egyptian Premier League',
    country: 'Egypt',
    api_ids: {
      'apifootball': '233',
      'api-football': '233',
      'soccersapi': 'egypt-premier-league'
    }
  },
  'ma_botola': {
    name: 'Botola Pro',
    country: 'Morocco',
    api_ids: {
      'apifootball': '322',
      'api-football': '322',
      'soccersapi': 'morocco-botola'
    }
  },
  // West & Southern Africa
  'gh_premier': {
    name: 'Ghana Premier League',
    country: 'Ghana',
    api_ids: {
      'apifootball': '270',
      'api-football': '570',
      'soccersapi': 'ghana-premier-league'
    }
  },
  'ng_npfl': {
    name: 'Nigeria Professional Football League',
    country: 'Nigeria',
    api_ids: {
      'apifootball': '333',
      'api-football': '667',
      'soccersapi': 'nigeria-npfl'
    }
  },
  'za_psl': {
    name: 'DStv Premiership',
    country: 'South Africa',
    api_ids: {
      'apifootball': '364',
      'api-football': '698',
      'soccersapi': 'south-africa-psl'
    }
  },
  // Major European leagues
  'premier_league': {
    name: 'Premier League',
    country: 'England',
    api_ids: {
      'apifootball': '152',
      'api-football': '39',
      'football-data-org': 'PL',
      'soccersapi': 'premier-league'
    }
  },
  'la_liga': {
    name: 'La Liga',
    country: 'Spain',
    api_ids: {
      'apifootball': '302',
      'api-football': '140',
      'football-data-org': 'PD',
      'soccersapi': 'la-liga'
    }
  },
  'ligue1': {
    name: 'Ligue 1',
    country: 'France',
    api_ids: {
      'apifootball': '168',
      'api-football': '61',
      'football-data-org': 'FL1',
      'soccersapi': 'ligue-1'
    }
  },
  'bundesliga': {
    name: 'Bundesliga',
    country: 'Germany',
    api_ids: {
      'apifootball': '175',
      'api-football': '78',
      'football-data-org': 'BL1',
      'soccersapi': 'bundesliga'
    }
  },
  'serie_a': {
    name: 'Serie A',
    country: 'Italy',
    api_ids: {
      'apifootball': '207',
      'api-football': '135',
      'football-data-org': 'SA',
      'soccersapi': 'serie-a'
    }
  },
  'champions_league': {
    name: 'UEFA Champions League',
    country: 'Europe',
    api_ids: {
      'apifootball': '3',
      'api-football': '2',
      'football-data-org': 'CL',
      'soccersapi': 'champions-league'
    }
  },
  'europa_league': {
    name: 'UEFA Europa League',
    country: 'Europe',
    api_ids: {
      'apifootball': '4',
      'api-football': '3',
      'football-data-org': 'EL',
      'soccersapi': 'europa-league'
    }
  },
  'world_cup': {
    name: 'FIFA World Cup',
    country: 'World',
    api_ids: {
      'apifootball': '1',
      'api-football': '1',
      'football-data-org': 'WC',
      'soccersapi': 'world-cup'
    }
  }
}

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, league_id, team_id } = body

    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://telegrambot-three-liart.vercel.app' 
      : 'http://localhost:3000'

    // Handle different actions
    switch (action) {
      case 'get_teams':
        return await getTeamsForLeague(league_id, baseUrl)
      
      case 'scan_league_data':
        return await scanLeagueData(league_id, team_id, baseUrl)
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported: get_teams, scan_league_data' },
          { status: 400 }
        )
    }

  } catch (error: any) {
    console.error('POST Test Real Data Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    )
  }
}

async function getTeamsForLeague(leagueId: string, baseUrl: string) {
  try {
    const leagueInfo = AFRICAN_LEAGUE_MAPPING[leagueId as keyof typeof AFRICAN_LEAGUE_MAPPING]
    
    if (!leagueInfo) {
      return NextResponse.json({
        success: false,
        error: 'League not found in African leagues mapping'
      })
    }

    // For now, return demo teams based on the league
    const demoTeams = generateDemoTeams(leagueInfo.name, leagueInfo.country)

    return NextResponse.json({
      success: true,
      teams: demoTeams,
      league: leagueInfo
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get teams'
    })
  }
}

async function scanLeagueData(leagueId: string, teamId: string | undefined, baseUrl: string) {
  try {
    const leagueInfo = AFRICAN_LEAGUE_MAPPING[leagueId as keyof typeof AFRICAN_LEAGUE_MAPPING]
    
    if (!leagueInfo) {
      return NextResponse.json({
        success: false,
        error: 'League not found in African leagues mapping'
      })
    }

    // Fetch real sports data
    const [resultsResponse, fixturesResponse] = await Promise.allSettled([
      fetch(`${baseUrl}/api/sports/fetch-data?type=results&league=${leagueId}`),
      fetch(`${baseUrl}/api/sports/fetch-data?type=fixtures&league=${leagueId}`)
    ])

    let recentMatches: any[] = []
    let upcomingMatches: any[] = []

    // Process results
    if (resultsResponse.status === 'fulfilled' && resultsResponse.value.ok) {
      const resultsData = await resultsResponse.value.json()
      if (resultsData.success && resultsData.data?.content?.recent_results) {
        recentMatches = resultsData.data.content.recent_results
      }
    }

    // Process fixtures  
    if (fixturesResponse.status === 'fulfilled' && fixturesResponse.value.ok) {
      const fixturesData = await fixturesResponse.value.json()
      if (fixturesData.success && fixturesData.data?.content?.upcoming_matches) {
        upcomingMatches = fixturesData.data.content.upcoming_matches
      }
    }

    // If no real data, generate African-focused demo data
    if (recentMatches.length === 0 && upcomingMatches.length === 0) {
      const demoData = generateAfricanDemoData(leagueInfo)
      recentMatches = demoData.recentMatches
      upcomingMatches = demoData.upcomingMatches
    }

    // Filter by team if specified
    if (teamId) {
      recentMatches = recentMatches.filter(m => 
        m.home_team_id === teamId || m.away_team_id === teamId ||
        m.home_team?.toLowerCase().includes(teamId.toLowerCase()) ||
        m.away_team?.toLowerCase().includes(teamId.toLowerCase())
      )
      upcomingMatches = upcomingMatches.filter(m => 
        m.home_team_id === teamId || m.away_team_id === teamId ||
        m.home_team?.toLowerCase().includes(teamId.toLowerCase()) ||
        m.away_team?.toLowerCase().includes(teamId.toLowerCase())
      )
    }

    // Create standings/top teams from matches
    const topTeams = createTopTeamsFromMatches(recentMatches, leagueInfo)

    const responseData = {
      league_name: leagueInfo.name,
      country: leagueInfo.country,
      season: '2024-25',
      total_matches: recentMatches.length + upcomingMatches.length,
      live_matches: 0, // Would need live data API
      upcoming_matches: upcomingMatches.length,
      featured_matches: [
        ...recentMatches.slice(0, 3),
        ...upcomingMatches.slice(0, 2)
      ],
      top_teams: topTeams
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      league: leagueInfo
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to scan league data'
    })
  }
}

function generateDemoTeams(leagueName: string, country: string) {
  const teamsByCountry: Record<string, string[]> = {
    'Ethiopia': [
      'Saint George', 'Ethiopian Coffee', 'Fasil Kenema', 'Sidama Coffee',
      'Hawassa City', 'Defence Force', 'Wolaitta Dicha', 'Arba Minch City'
    ],
    'Tanzania': [
      'Young Africans (Yanga)', 'Simba SC', 'Azam FC', 'Mtibwa Sugar',
      'KMC FC', 'Coastal Union', 'Mbeya City', 'Polisi Tanzania'
    ],
    'Uganda': [
      'KCCA FC', 'Vipers SC', 'Express FC', 'URA FC',
      'Wakiso Giants', 'BUL FC', 'Mbarara City', 'Police FC'
    ],
    'Rwanda': [
      'APR FC', 'Rayon Sports', 'AS Kigali', 'Police FC',
      'Mukura Victory Sports', 'SC Kiyovu', 'Etincelles FC', 'Musanze FC'
    ],
    'Kenya': [
      'Gor Mahia', 'AFC Leopards', 'Tusker FC', 'Kakamega Homeboyz',
      'KCB FC', 'Bandari FC', 'Ulinzi Stars', 'Sofapaka FC'
    ],
    'Egypt': [
      'Al Ahly', 'Zamalek', 'Pyramids FC', 'Ismaily',
      'Al Masry', 'Ghazl El Mahalla', 'Enppi', 'Future FC'
    ],
    'Ghana': [
      'Asante Kotoko', 'Hearts of Oak', 'Medeama SC', 'Aduana Stars',
      'Bechem United', 'Dreams FC', 'Legon Cities', 'Great Olympics'
    ],
    'Nigeria': [
      'Rivers United', 'Plateau United', 'Enyimba', 'Kano Pillars',
      'Remo Stars', 'Shooting Stars', 'Lobi Stars', 'Kwara United'
    ],
    'South Africa': [
      'Mamelodi Sundowns', 'Orlando Pirates', 'Kaizer Chiefs', 'SuperSport United',
      'Cape Town City', 'AmaZulu', 'Golden Arrows', 'Sekhukhune United'
    ],
    'England': [
      'Manchester City', 'Arsenal', 'Liverpool', 'Aston Villa',
      'Tottenham', 'Chelsea', 'Newcastle United', 'Manchester United',
      'West Ham United', 'Crystal Palace', 'Brighton', 'Bournemouth',
      'Fulham', 'Wolves', 'Everton', 'Brentford', 'Nottingham Forest',
      'Luton Town', 'Burnley', 'Sheffield United'
    ],
    'Spain': [
      'Real Madrid', 'Barcelona', 'Girona', 'Atletico Madrid',
      'Athletic Bilbao', 'Real Sociedad', 'Valencia', 'Betis',
      'Las Palmas', 'Getafe', 'Alaves', 'Sevilla',
      'Osasuna', 'Villarreal', 'Rayo Vallecano', 'Celta Vigo',
      'Mallorca', 'Cadiz', 'Granada', 'Almeria'
    ],
    'France': [
      'PSG', 'Monaco', 'Brest', 'Lille',
      'Nice', 'Lens', 'Lyon', 'Marseille',
      'Montpellier', 'Rennes', 'Strasbourg', 'Reims',
      'Toulouse', 'Le Havre', 'Nantes', 'Lorient',
      'Metz', 'Clermont', 'Clermont Foot', 'FC Metz'
    ],
    'Germany': [
      'Bayer Leverkusen', 'Bayern Munich', 'VfB Stuttgart', 'RB Leipzig',
      'Borussia Dortmund', 'Eintracht Frankfurt', 'TSG Hoffenheim', 'FC Heidenheim',
      'Werder Bremen', 'SC Freiburg', 'FC Augsburg', 'VfL Wolfsburg',
      'Borussia Monchengladbach', 'Union Berlin', 'VfL Bochum', 'FC Koln',
      'FSV Mainz 05', 'SV Darmstadt 98'
    ],
    'Italy': [
      'Inter Milan', 'AC Milan', 'Juventus', 'Atalanta',
      'Bologna', 'Roma', 'Lazio', 'Napoli',
      'Fiorentina', 'Torino', 'Genoa', 'Monza',
      'Verona', 'Lecce', 'Udinese', 'Cagliari',
      'Frosinone', 'Empoli', 'Sassuolo', 'Salernitana'
    ],
    'Europe': [
      'Real Madrid', 'Manchester City', 'Bayern Munich', 'PSG',
      'Arsenal', 'Barcelona', 'Atletico Madrid', 'Borussia Dortmund',
      'Inter Milan', 'RB Leipzig', 'Porto', 'Napoli',
      'Lazio', 'PSV Eindhoven', 'Copenhagen', 'Real Sociedad'
    ],
    'World': [
      'Brazil', 'Argentina', 'France', 'England',
      'Spain', 'Italy', 'Portugal', 'Netherlands',
      'Germany', 'Croatia', 'Morocco', 'Japan',
      'South Korea', 'Mexico', 'United States', 'Senegal'
    ]
  }

  const teams = teamsByCountry[country] || [
    'Team A', 'Team B', 'Team C', 'Team D'
  ]

  return teams.map((name, index) => ({
    id: `team_${index + 1}`,
    name,
    country,
    logo_url: null
  }))
}

function generateAfricanDemoData(leagueInfo: any) {
  const teams = generateDemoTeams(leagueInfo.name, leagueInfo.country)
  
  const recentMatches = []
  const upcomingMatches = []

  // Generate recent matches
  for (let i = 0; i < 5; i++) {
    const homeTeam = teams[Math.floor(Math.random() * teams.length)]
    const awayTeam = teams[Math.floor(Math.random() * teams.length)]
    
    if (homeTeam.id !== awayTeam.id) {
      recentMatches.push({
        id: `match_${i + 1}`,
        home_team: homeTeam.name,
        away_team: awayTeam.name,
        home_score: Math.floor(Math.random() * 4),
        away_score: Math.floor(Math.random() * 4),
        competition: leagueInfo.name,
        date: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'finished'
      })
    }
  }

  // Generate upcoming matches
  for (let i = 0; i < 5; i++) {
    const homeTeam = teams[Math.floor(Math.random() * teams.length)]
    const awayTeam = teams[Math.floor(Math.random() * teams.length)]
    
    if (homeTeam.id !== awayTeam.id) {
      upcomingMatches.push({
        id: `upcoming_${i + 1}`,
        home_team: homeTeam.name,
        away_team: awayTeam.name,
        competition: leagueInfo.name,
        date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: `${14 + i}:00`,
        status: 'scheduled'
      })
    }
  }

  return { recentMatches, upcomingMatches }
}

function createTopTeamsFromMatches(matches: any[], leagueInfo: any) {
  const teamStats: Record<string, { name: string; points: number; played: number; wins: number; draws: number; losses: number }> = {}

  matches.forEach(match => {
    if (match.status === 'finished' && match.home_score !== undefined && match.away_score !== undefined) {
      // Initialize teams if not exists
      if (!teamStats[match.home_team]) {
        teamStats[match.home_team] = { name: match.home_team, points: 0, played: 0, wins: 0, draws: 0, losses: 0 }
      }
      if (!teamStats[match.away_team]) {
        teamStats[match.away_team] = { name: match.away_team, points: 0, played: 0, wins: 0, draws: 0, losses: 0 }
      }

      const homeScore = parseInt(match.home_score)
      const awayScore = parseInt(match.away_score)

      teamStats[match.home_team].played++
      teamStats[match.away_team].played++

      if (homeScore > awayScore) {
        teamStats[match.home_team].points += 3
        teamStats[match.home_team].wins++
        teamStats[match.away_team].losses++
      } else if (homeScore < awayScore) {
        teamStats[match.away_team].points += 3
        teamStats[match.away_team].wins++
        teamStats[match.home_team].losses++
      } else {
        teamStats[match.home_team].points += 1
        teamStats[match.away_team].points += 1
        teamStats[match.home_team].draws++
        teamStats[match.away_team].draws++
      }
    }
  })

  return Object.values(teamStats)
    .sort((a, b) => b.points - a.points)
    .slice(0, 8)
    .map((team, index) => ({
      ...team,
      position: index + 1
    }))
} 