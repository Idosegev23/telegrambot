import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decryptToken } from '@/lib/utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { botId, bot_id, message, channelIds } = body

    // Accept both botId and bot_id for compatibility
    const actualBotId = botId || bot_id

    if (!actualBotId || !message || !channelIds || channelIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: botId/bot_id, message, or channelIds' },
        { status: 400 }
      )
    }

    // Get bot data with decrypted token
    const { data: botData, error: botError } = await supabase
      .from('bots')
      .select('telegram_token_encrypted, name')
      .eq('id', actualBotId)
      .single()

    if (botError || !botData) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      )
    }

    // Get channel data
    const { data: channelsData, error: channelsError } = await supabase
      .from('channels')
      .select('telegram_channel_id, name')
      .in('id', channelIds)

    if (channelsError || !channelsData) {
      return NextResponse.json(
        { error: 'Channels not found' },
        { status: 404 }
      )
    }

    // Decrypt token properly
    const telegramToken = decryptToken(botData.telegram_token_encrypted)

    const results = []

    // Send message to each channel
    for (const channel of channelsData) {
      try {
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${telegramToken}/sendMessage`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: channel.telegram_channel_id,
              text: `🧪 TEST MESSAGE\n\n${message}\n\n---\nSent from TriRoars Bot Manager`,
              parse_mode: 'Markdown'
            }),
          }
        )

        const telegramResult = await telegramResponse.json()

        if (telegramResult.ok) {
          results.push({
            channel: channel.name,
            status: 'success',
            messageId: telegramResult.result.message_id
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

    // Log the test message send
    await supabase
      .from('posts')
      .insert({
        bot_id: actualBotId,
        channel_id: channelIds[0], // Use first channel for logging
        content: message,
        type: 'test',
        status: 'sent',
        sent_at: new Date().toISOString()
      })

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
    console.error('Error sending test message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 