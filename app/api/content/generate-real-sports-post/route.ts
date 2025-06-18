import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { decryptToken } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { 
      action,
      botId,
      league,
      dataType = 'results', // results, fixtures, standings
      channelIds = [],
      language = 'en'
    } = body

    console.log('Real sports post request:', { action, botId, league, dataType })

    switch (action) {
      case 'fetch-real-data':
        return await fetchRealSportsData(dataType, league)
        
      case 'generate-post-with-charts':
        return await generatePostWithRealData(body, supabase)
        
      case 'send-to-channels':
        return await sendPostToChannels(body, supabase)
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Real sports post error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    )
  }
}

async function fetchRealSportsData(dataType: string, league?: string) {
  try {
    console.log('Fetching real sports data:', { dataType, league })
    
    // Call our sports API to get real data
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const sportsResponse = await fetch(`${baseUrl}/api/sports/fetch-data?type=${dataType}&league=${league || 'premier-league'}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!sportsResponse.ok) {
      console.error('Sports API failed:', await sportsResponse.text())
      // Fallback to demo data if API fails
      return NextResponse.json({
        success: true,
        data: getDemoSportsData(dataType),
        source: 'demo_fallback'
      })
    }

    const sportsData = await sportsResponse.json()
    console.log('Real sports data received:', sportsData)

    return NextResponse.json({
      success: true,
      data: sportsData.data,
      source: sportsData.source || 'api'
    })

  } catch (error) {
    console.error('Error fetching real sports data:', error)
    // Return demo data as fallback
    return NextResponse.json({
      success: true,
      data: getDemoSportsData(dataType),
      source: 'demo_fallback'
    })
  }
}

async function generatePostWithRealData(requestData: any, supabase: any) {
  const { botId, sportsData, language = 'en' } = requestData

  try {
    console.log('Generating post with real data:', { botId, dataType: sportsData?.type })

    // Generate content based on real sports data
    const content = await generateSportsContent(sportsData, language)
    
    // Generate charts from real data
    const charts = await generateRealSportsCharts(sportsData)
    
    // Generate AI-enhanced content
    const enhancedContent = await enhanceContentWithAI(content, sportsData, language)

    return NextResponse.json({
      success: true,
      data: {
        content: enhancedContent,
        charts,
        sportsData,
        language,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error generating post with real data:', error)
    return NextResponse.json({ error: 'Failed to generate post' }, { status: 500 })
  }
}

async function sendPostToChannels(requestData: any, supabase: any) {
  const { botId, content, charts, channelIds } = requestData

  try {
    console.log('Sending post to channels:', { botId, channelCount: channelIds?.length })

    // Get bot data
    const { data: botData, error: botError } = await supabase
      .from('bots')
      .select('telegram_token_encrypted, name')
      .eq('id', botId)
      .single()

    if (botError || !botData) {
      throw new Error('Bot not found')
    }

    // Get channel data
    const { data: channelsData, error: channelsError } = await supabase
      .from('channels')
      .select('telegram_channel_id, name')
      .in('id', channelIds)

    if (channelsError || !channelsData) {
      throw new Error('Channels not found')
    }

    const telegramToken = decryptToken(botData.telegram_token_encrypted)
    const results = []

    // Send to each channel
    for (const channel of channelsData) {
      try {
        // Prepare message with charts
        let messageText = `⚽ **TriRoars Sports Update**\n\n${content}`
        
        if (charts && charts.length > 0) {
          messageText += '\n\n📊 **Charts & Analysis:**'
          charts.forEach((chartUrl: string, index: number) => {
            messageText += `\n🔗 [Chart ${index + 1}](${chartUrl})`
          })
        }

        messageText += '\n\n---\n🤖 *Powered by TriRoars AI*'

        // Send message
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${telegramToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: channel.telegram_channel_id,
              text: messageText,
              parse_mode: 'Markdown',
              disable_web_page_preview: false
            })
          }
        )

        const telegramResult = await telegramResponse.json()

        if (telegramResult.ok) {
          results.push({
            channel: channel.name,
            status: 'success',
            messageId: telegramResult.result.message_id
          })

          // Log successful post
          await supabase.from('posts').insert({
            bot_id: botId,
            channel_id: channel.telegram_channel_id,
            content: messageText,
            type: 'sports_real',
            status: 'sent',
            sent_at: new Date().toISOString()
          })

        } else {
          results.push({
            channel: channel.name,
            status: 'error',
            error: telegramResult.description || 'Unknown error'
          })
        }

      } catch (error) {
        results.push({
          channel: channel.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Network error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length
      }
    })

  } catch (error) {
    console.error('Error sending to channels:', error)
    return NextResponse.json({ error: 'Failed to send to channels' }, { status: 500 })
  }
}

async function generateSportsContent(sportsData: any, language: string): Promise<string> {
  try {
    const { type, content } = sportsData

    switch (type) {
      case 'results':
        return generateResultsContent(content.recent_results, language)
      case 'fixtures':
        return generateFixturesContent(content.upcoming_matches, language)
      case 'standings':
        return generateStandingsContent(content.table, language)
      default:
        return 'Latest sports update from TriRoars!'
    }
  } catch (error) {
    console.error('Error generating sports content:', error)
    return 'Sports update powered by TriRoars AI'
  }
}

function generateResultsContent(results: any[], language: string): string {
  if (!results || results.length === 0) {
    return 'No recent results available'
  }

  let content = '🏆 **Latest Match Results**\n\n'
  
  results.slice(0, 5).forEach((match, index) => {
    content += `${index + 1}. **${match.home_team}** ${match.home_score} - ${match.away_score} **${match.away_team}**\n`
    content += `   📅 ${new Date(match.date).toLocaleDateString()}\n`
    content += `   🏟️ ${match.competition}\n\n`
  })

  return content
}

function generateFixturesContent(fixtures: any[], language: string): string {
  if (!fixtures || fixtures.length === 0) {
    return 'No upcoming fixtures available'
  }

  let content = '📅 **Upcoming Fixtures**\n\n'
  
  fixtures.slice(0, 5).forEach((match, index) => {
    content += `${index + 1}. **${match.home_team}** vs **${match.away_team}**\n`
    content += `   ⏰ ${new Date(match.date).toLocaleString()}\n`
    content += `   🏟️ ${match.competition}\n\n`
  })

  return content
}

function generateStandingsContent(table: any[], language: string): string {
  if (!table || table.length === 0) {
    return 'No standings data available'
  }

  let content = '📊 **League Standings (Top 10)**\n\n'
  
  table.slice(0, 10).forEach((team) => {
    content += `${team.position}. **${team.team}** - ${team.points} pts\n`
    content += `   📈 ${team.wins}W ${team.draws}D ${team.losses}L\n\n`
  })

  return content
}

async function generateRealSportsCharts(sportsData: any): Promise<string[]> {
  try {
    const { type, content } = sportsData
    
    let chartData: any = {}
    let chartType = 'bar'
    let title = 'Sports Data'

    switch (type) {
      case 'results':
        const results = content.recent_results?.slice(0, 5) || []
        chartData = {
          labels: results.map((r: any) => `${r.home_team} vs ${r.away_team}`),
          datasets: [{
            label: 'Goals Scored',
            data: results.map((r: any) => r.home_score + r.away_score),
            backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']
          }]
        }
        title = 'Recent Match Goals'
        break

      case 'standings':
        const table = content.table?.slice(0, 8) || []
        chartData = {
          labels: table.map((t: any) => t.team),
          datasets: [{
            label: 'Points',
            data: table.map((t: any) => t.points),
            backgroundColor: '#3b82f6'
          }]
        }
        title = 'League Standings - Points'
        break

      default:
        // Default demo chart
        chartData = {
          labels: ['Team A', 'Team B'],
          datasets: [{
            label: 'Performance',
            data: [75, 85],
            backgroundColor: ['#3b82f6', '#ef4444']
          }]
        }
    }

    // Generate chart
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'
    const chartResponse = await fetch(`${baseUrl}/api/content/generate-chart`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-internal-call': 'true'
      },
      body: JSON.stringify({
        chartType,
        chartData,
        title,
        width: 600,
        height: 400,
        watermark: 'TriRoars Sports'
      })
    })

    if (!chartResponse.ok) {
      console.error('Chart generation failed')
      return []
    }

    const chartResult = await chartResponse.json()
    
    const charts = []
    if (chartResult.data?.chartUrl) {
      charts.push(chartResult.data.chartUrl)
    }
    
    if (chartResult.data?.variations) {
      chartResult.data.variations.forEach((v: any) => {
        if (v.url) charts.push(v.url)
      })
    }

    return charts

  } catch (error) {
    console.error('Error generating real sports charts:', error)
    return []
  }
}

async function enhanceContentWithAI(content: string, sportsData: any, language: string): Promise<string> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'
    const aiResponse = await fetch(`${baseUrl}/api/content/ai-translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `Enhance this sports content with insights and analysis: ${content}`,
        targetLanguage: language,
        context: 'sports_analysis'
      })
    })

    if (!aiResponse.ok) {
      return content // Return original if AI fails
    }

    const aiResult = await aiResponse.json()
    return aiResult.data?.translatedText || content

  } catch (error) {
    console.error('Error enhancing content with AI:', error)
    return content
  }
}

function getDemoSportsData(dataType: string) {
  switch (dataType) {
    case 'results':
      return {
        type: 'results',
        content: {
          recent_results: [
            {
              home_team: 'Liverpool',
              away_team: 'Manchester United',
              home_score: 3,
              away_score: 1,
              date: new Date().toISOString(),
              competition: 'Premier League'
            },
            {
              home_team: 'Arsenal',
              away_team: 'Chelsea',
              home_score: 2,
              away_score: 2,
              date: new Date().toISOString(),
              competition: 'Premier League'
            }
          ]
        }
      }
    case 'standings':
      return {
        type: 'standings',
        content: {
          table: [
            { position: 1, team: 'Liverpool', points: 45, wins: 14, draws: 3, losses: 1 },
            { position: 2, team: 'Arsenal', points: 42, wins: 13, draws: 3, losses: 2 },
            { position: 3, team: 'Manchester City', points: 40, wins: 12, draws: 4, losses: 2 }
          ]
        }
      }
    default:
      return {
        type: dataType,
        content: { message: 'Demo sports data' }
      }
  }
} 