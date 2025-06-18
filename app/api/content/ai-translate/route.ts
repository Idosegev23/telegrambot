import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const LANGUAGES = {
  'am': 'Amharic (አማርኛ)',
  'sw': 'Swahili (Kiswahili)', 
  'lg': 'Luganda',
  'rw': 'Kinyarwanda',
  'en': 'English',
  'he': 'Hebrew (עברית)'
}

export async function POST(req: NextRequest) {
  try {
    const { text, targetLanguage, context = 'sports' } = await req.json()

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: 'Text and target language are required' },
        { status: 400 }
      )
    }

    const languageName = LANGUAGES[targetLanguage as keyof typeof LANGUAGES] || 'English'
    
    const contextPrompts = {
      sports: 'You are translating sports content. Maintain team names, player names, and sports terminology.',
      news: 'You are translating news content. Keep factual accuracy and proper nouns.',
      casual: 'You are translating casual conversation. Maintain the tone and style.',
      formal: 'You are translating formal content. Maintain professional tone.'
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a professional translator specializing in African languages and sports content. 
          ${contextPrompts[context as keyof typeof contextPrompts] || contextPrompts.sports}
          
          Translate to ${languageName} while:
          1. Maintaining cultural context and expressions
          2. Keeping any variables in {brackets} unchanged
          3. Preserving emojis and formatting
          4. Using appropriate cultural references for the target region
          
          Return only the translated text, no explanations.`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    })

    const translatedText = response.choices[0].message.content || text

    return NextResponse.json({
      success: true,
      data: {
        originalText: text,
        translatedText,
        targetLanguage: languageName,
        wordCount: translatedText.split(' ').length,
        context
      }
    })

  } catch (error: any) {
    console.error('Translation Error:', error)
    return NextResponse.json(
      { error: error.message || 'Translation failed' },
      { status: 500 }
    )
  }
} 