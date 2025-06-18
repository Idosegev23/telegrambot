import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      botId, 
      ruleName, 
      schedule, 
      contentTypes, 
      channels, 
      features 
    } = body

    console.log('🤖 Setting up automation rule:', {
      botId,
      ruleName,
      schedule,
      contentTypes,
      channels: channels?.length || 0,
      features
    })

    // Simulate automation rule creation
    const automationRule = {
      id: `rule_${Date.now()}`,
      botId,
      name: ruleName || 'Smart Sports Automation',
      schedule,
      contentTypes: contentTypes || ['statistics', 'news'],
      channels: channels || [],
      features: {
        includeCharts: features?.includeCharts || true,
        includeImages: features?.includeImages || true,
        multiLanguage: features?.multiLanguage || true,
        realDataOnly: features?.realDataOnly || true
      },
      status: 'active',
      createdAt: new Date().toISOString(),
      nextRun: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Next hour
      statistics: {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        lastRun: null
      }
    }

    // In a real implementation, this would:
    // 1. Save to database
    // 2. Set up cron job or queue system
    // 3. Configure webhook handlers
    // 4. Initialize monitoring

    console.log('✅ Automation rule created:', automationRule)

    return NextResponse.json({
      success: true,
      message: 'Automation rule created successfully',
      data: {
        rule: automationRule,
        setup: {
          scheduleType: schedule,
          contentTypes: contentTypes?.length || 0,
          channelsConfigured: channels?.length || 0,
          featuresEnabled: Object.keys(features || {}).length,
          realDataEnabled: features?.realDataOnly || false
        }
      }
    })

  } catch (error) {
    console.error('❌ Error setting up automation:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to setup automation rule',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const botId = url.searchParams.get('botId')

    if (!botId) {
      return NextResponse.json({ error: 'Bot ID required' }, { status: 400 })
    }

    // Get automation rules for the bot
    const { data: automations, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('bot_id', botId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Automation fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch automations' }, { status: 500 })
    }

    return NextResponse.json({ automations })

  } catch (error: any) {
    console.error('Automation fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch automations' },
      { status: 500 }
    )
  }
}

function calculateNextRun(scheduleType: string, scheduleValue: string, frequency: string): string {
  const now = new Date()
  
  switch (scheduleType) {
    case 'half-hour':
      // Next 30-minute mark (9:30, 10:00, 10:30, etc.)
      const nextHalfHour = new Date(now)
      const currentMinutes = now.getMinutes()
      if (currentMinutes < 30) {
        nextHalfHour.setMinutes(30, 0, 0)
      } else {
        nextHalfHour.setHours(nextHalfHour.getHours() + 1, 0, 0, 0)
      }
      return nextHalfHour.toISOString()
      
    case 'hourly':
      // Next hour mark
      const nextHour = new Date(now)
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)
      return nextHour.toISOString()
      
    case 'daily':
      // Next day at specified time
      const nextDay = new Date(now)
      nextDay.setDate(nextDay.getDate() + 1)
      const [hoursStr, minutesStr] = (scheduleValue || '09:00').split(':')
      nextDay.setHours(parseInt(hoursStr), parseInt(minutesStr), 0, 0)
      return nextDay.toISOString()
      
    case 'weekly':
      // Next week at specified time
      const nextWeek = new Date(now)
      nextWeek.setDate(nextWeek.getDate() + 7)
      return nextWeek.toISOString()
      
    default:
      // Default to 1 hour from now
      const defaultNext = new Date(now)
      defaultNext.setHours(defaultNext.getHours() + 1)
      return defaultNext.toISOString()
  }
} 