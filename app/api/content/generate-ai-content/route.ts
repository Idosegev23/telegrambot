import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// תמיכה בשפות אפריקניות
const SUPPORTED_LANGUAGES = {
  'am': 'Amharic (አማርኛ)',
  'sw': 'Swahili (Kiswahili)', 
  'lg': 'Luganda',
  'rw': 'Kinyarwanda',
  'en': 'English',
  'he': 'Hebrew'
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // בדיקת הרשאות
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      action,
      content,
      targetLanguage = 'en',
      contentType = 'news',
      includeImage = false,
      includeGraph = false,
      sportsData,
      prompt,
      botId
    } = await req.json()

    let result: any = {}

    switch (action) {
      case 'translate':
        result = await translateContent(content, targetLanguage)
        break
        
      case 'generate':
        result = await generateContent(contentType, prompt, targetLanguage, sportsData)
        break
        
      case 'enhance':
        result = await enhanceContent(content, targetLanguage, includeImage, includeGraph)
        break
        
      case 'create-template':
        result = await createSmartTemplate(contentType, targetLanguage, sportsData)
        break
        
      case 'generate-image':
        result = await generateImage(content, contentType)
        break
        
      case 'analyze-performance':
        result = await analyzeContentPerformance(botId, contentType)
        break
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })

  } catch (error: any) {
    console.error('AI Content Generation Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process AI request' },
      { status: 500 }
    )
  }
}

async function translateContent(content: string, targetLanguage: string): Promise<any> {
  const languageName = SUPPORTED_LANGUAGES[targetLanguage as keyof typeof SUPPORTED_LANGUAGES] || 'English'
  
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are a professional translator specializing in African languages and sports content. 
        Translate the following content to ${languageName}. 
        Maintain the sports terminology, team names, and emotional tone.
        For African languages, use proper cultural context and expressions.
        Keep any variables in {brackets} unchanged.`
      },
      {
        role: "user",
        content: content
      }
    ],
    temperature: 0.3,
    max_tokens: 1000
  })

  return {
    originalContent: content,
    translatedContent: response.choices[0].message.content,
    targetLanguage: languageName,
    wordCount: response.choices[0].message.content?.split(' ').length || 0
  }
}

async function generateContent(
  contentType: string, 
  prompt: string, 
  targetLanguage: string,
  sportsData?: any
): Promise<any> {
  const languageName = SUPPORTED_LANGUAGES[targetLanguage as keyof typeof SUPPORTED_LANGUAGES] || 'English'
  
  const systemPrompts = {
    news: `You are a sports news writer for African audiences. Create engaging, factual sports news content in ${languageName}.`,
    prediction: `You are a sports analyst creating match predictions for African football fans. Write in ${languageName} with local cultural references.`,
    match_result: `You are reporting match results for African sports fans. Be exciting and descriptive in ${languageName}.`,
    live_score: `You are providing live score updates. Keep it concise and exciting in ${languageName}.`,
    match_preview: `You are writing match previews for African football fans. Build excitement in ${languageName}.`
  }

  const sportsContext = sportsData ? `
    Sports Data Context:
    ${JSON.stringify(sportsData, null, 2)}
    Use this data to make the content accurate and relevant.
  ` : ''

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: systemPrompts[contentType as keyof typeof systemPrompts] || systemPrompts.news
      },
      {
        role: "user",
        content: `${prompt}\n\n${sportsContext}\n\nPlease include variables in {brackets} for dynamic content like {team1}, {team2}, {score}, {date}, etc.`
      }
    ],
    temperature: 0.7,
    max_tokens: 800
  })

  return {
    content: response.choices[0].message.content,
    contentType,
    language: languageName,
    variables: extractVariables(response.choices[0].message.content || ''),
    wordCount: response.choices[0].message.content?.split(' ').length || 0
  }
}

async function enhanceContent(
  content: string,
  targetLanguage: string,
  includeImage: boolean,
  includeGraph: boolean
): Promise<any> {
  const languageName = SUPPORTED_LANGUAGES[targetLanguage as keyof typeof SUPPORTED_LANGUAGES] || 'English'
  
  // שיפור התוכן
  const enhanceResponse = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are a content enhancement specialist for sports content in ${languageName}.
        Improve the given content by:
        1. Making it more engaging and exciting
        2. Adding relevant emojis
        3. Improving readability
        4. Adding call-to-action elements
        5. Maintaining sports authenticity`
      },
      {
        role: "user",
        content: content
      }
    ],
    temperature: 0.6,
    max_tokens: 1000
  })

  let result: any = {
    enhancedContent: enhanceResponse.choices[0].message.content,
    originalContent: content,
    improvements: []
  }

  // יצירת תמונה אם נדרש
  if (includeImage) {
    result.image = await generateImage(content, 'sports')
  }

  // יצירת גרף אם נדרש
  if (includeGraph) {
    result.graph = await generateGraphSuggestion(content)
  }

  return result
}

async function createSmartTemplate(
  contentType: string,
  targetLanguage: string,
  sportsData?: any
): Promise<any> {
  const languageName = SUPPORTED_LANGUAGES[targetLanguage as keyof typeof SUPPORTED_LANGUAGES] || 'English'
  
  const templatePrompts = {
    news: `Create a news template in ${languageName} for sports breaking news with variables for team names, player names, and details.`,
    prediction: `Create a match prediction template in ${languageName} with variables for teams, odds, analysis, and prediction confidence.`,
    match_result: `Create a match result template in ${languageName} with variables for teams, final score, key moments, and player performances.`,
    live_score: `Create a live score update template in ${languageName} with variables for current score, time, and key events.`,
    match_preview: `Create a match preview template in ${languageName} with variables for teams, venue, key players, and storylines.`
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are creating reusable content templates for sports content management.
        Include clear variable placeholders in {brackets}.
        Make templates engaging and culturally appropriate for African audiences.
        Include emoji suggestions and formatting hints.`
      },
      {
        role: "user",
        content: templatePrompts[contentType as keyof typeof templatePrompts] || templatePrompts.news
      }
    ],
    temperature: 0.5,
    max_tokens: 600
  })

  return {
    template: response.choices[0].message.content,
    contentType,
    language: languageName,
    variables: extractVariables(response.choices[0].message.content || ''),
    usageHints: generateUsageHints(contentType)
  }
}

async function generateImage(content: string, contentType: string): Promise<any> {
  try {
    // ניתוח התוכן ליצירת prompt לתמונה
    const imagePromptResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Create a concise, visual prompt for DALL-E to generate a sports-related image based on the given content. Focus on action, emotions, and visual elements. Keep it under 100 words."
        },
        {
          role: "user",
          content: `Content: ${content}\nContent Type: ${contentType}`
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    })

    const imagePrompt = imagePromptResponse.choices[0].message.content || ''

    // יצירת תמונה עם DALL-E
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: `${imagePrompt} Professional sports photography style, high quality, dramatic lighting`,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    })

    return {
      imageUrl: imageResponse.data?.[0]?.url || '',
      prompt: imagePrompt,
      generatedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Image generation error:', error)
    return {
      error: 'Failed to generate image',
      fallback: 'Use stock sports image'
    }
  }
}

async function generateGraphSuggestion(content: string): Promise<any> {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `Analyze sports content and suggest relevant data visualizations.
        Suggest chart types (bar, line, pie, radar) and data points to visualize.
        Return JSON format with chart suggestions.`
      },
      {
        role: "user",
        content: content
      }
    ],
    temperature: 0.3,
    max_tokens: 300
  })

  try {
    const suggestion = JSON.parse(response.choices[0].message.content || '{}')
    return {
      suggestions: suggestion,
      implementation: 'Use Chart.js or similar library',
      dataNeeded: extractDataRequirements(content)
    }
  } catch {
    return {
      suggestions: [{
        type: 'bar',
        title: 'Performance Comparison',
        description: 'Compare team or player statistics'
      }],
      implementation: 'Use Chart.js or similar library'
    }
  }
}

async function analyzeContentPerformance(botId: string, contentType: string): Promise<any> {
  // זה יהיה חיבור לאנליטיקס בעתיד
  return {
    bestPerformingContent: contentType,
    avgEngagement: 75,
    recommendations: [
      'Use more emojis in sports content',
      'Post during peak hours (18:00-21:00)',
      'Include more interactive elements'
    ],
    nextSuggestions: [
      'Create match prediction series',
      'Add player spotlight features',
      'Implement live score alerts'
    ]
  }
}

function extractVariables(content: string): string[] {
  const regex = /\{([^}]+)\}/g
  const matches = []
  let match
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1])
  }
  return Array.from(new Set(matches))
}

function generateUsageHints(contentType: string): string[] {
  const hints = {
    news: [
      'Use breaking news for urgent updates',
      'Include source information',
      'Add relevant team hashtags'
    ],
    prediction: [
      'Include confidence percentage',
      'Add betting odds if available',
      'Use data-backed analysis'
    ],
    match_result: [
      'Highlight key moments',
      'Include player performances',
      'Add post-match reactions'
    ],
    live_score: [
      'Update every 10-15 minutes',
      'Include time stamps',
      'Highlight goal scorers immediately'
    ],
    match_preview: [
      'Build anticipation',
      'Include head-to-head stats',
      'Mention key storylines'
    ]
  }
  
  return hints[contentType as keyof typeof hints] || hints.news
}

function extractDataRequirements(content: string): string[] {
  const keywords = content.toLowerCase()
  const requirements = []
  
  if (keywords.includes('score') || keywords.includes('goal')) {
    requirements.push('Live match scores')
  }
  if (keywords.includes('stat') || keywords.includes('performance')) {
    requirements.push('Player/team statistics')
  }
  if (keywords.includes('prediction') || keywords.includes('odds')) {
    requirements.push('Betting odds and predictions')
  }
  if (keywords.includes('league') || keywords.includes('table')) {
    requirements.push('League standings')
  }
  
  return requirements
} 