import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decryptToken } from '@/lib/utils'

// Use direct connection to bypass auth issues temporarily
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const bot_id = body.bot_id || body.botId

    if (!bot_id) {
      return NextResponse.json({ error: 'Bot ID is required' }, { status: 400 })
    }

    // Get bot token directly from database (RLS disabled temporarily)
    const { data: botData, error: botError } = await supabase
      .from('bots')
      .select('telegram_token_encrypted')
      .eq('id', bot_id)
      .limit(1)

    if (botError || !botData || botData.length === 0) {
      return NextResponse.json({ 
        error: 'Bot not found',
        debug: { botError: botError?.message, bot_id }
      }, { status: 404 })
    }

    // Decrypt the bot token
    const botToken = decryptToken(botData[0].telegram_token_encrypted)

    // Get updates from Telegram API to find chats
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`, {
      method: 'GET',
    })

    if (!telegramResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch data from Telegram' }, { status: 500 })
    }

    const data = await telegramResponse.json()
    
    if (!data.ok) {
      return NextResponse.json({ error: 'Telegram API error', details: data.description }, { status: 500 })
    }

    // Extract unique chats from updates
    const chats = new Map()
    
    data.result.forEach((update: any) => {
      if (update.message?.chat) {
        const chat = update.message.chat
        if (chat.type === 'channel' || chat.type === 'supergroup') {
          chats.set(chat.id, {
            id: chat.id,
            title: chat.title,
            type: chat.type,
            username: chat.username || null,
            member_count: null
          })
        }
      }
    })

    // Try to get chat member count for each chat
    const chatsWithMemberCount = []
    const chatsArray = Array.from(chats.entries())
    for (const [chatId, chat] of chatsArray) {
      try {
        const memberCountResponse = await fetch(`https://api.telegram.org/bot${botToken}/getChatMemberCount?chat_id=${chatId}`)
        const memberCountData = await memberCountResponse.json()
        
        if (memberCountData.ok) {
          chat.member_count = memberCountData.result
        }
      } catch (error) {
        console.log(`Failed to get member count for chat ${chatId}:`, error)
      }
      
      chatsWithMemberCount.push(chat)
    }

    return NextResponse.json({ 
      success: true, 
      chats: chatsWithMemberCount,
      total_chats: chatsWithMemberCount.length
    })

  } catch (error) {
    console.error('Error fetching chat list:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 