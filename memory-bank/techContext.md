# קונטקסט טכני - טכנולוגיות ותלויות

## סטאק טכנולוגי מומלץ

### Frontend - Dashboard ניהול
```json
{
  "framework": "Next.js 14",
  "styling": "Tailwind CSS + shadcn/ui",
  "language": "TypeScript",
  "state_management": "Zustand",
  "forms": "React Hook Form + Zod",
  "internationalization": "next-intl",
  "charts": "Chart.js או Recharts",
  "deployment": "Vercel"
}
```

**בחירת Next.js בגלל**:
- SSR מובנה (חשוב לביצועים)
- App Router חדש לניהול routes מתקדם
- Built-in internationalization
- Optimized images לדגלים ולוגואים
- API Routes למשימות פשוטות

### Backend - API Services
```json
{
  "framework": "Express.js + TypeScript",
  "database": "Supabase (PostgreSQL)",
  "authentication": "Supabase Auth",
  "file_storage": "Supabase Storage", 
  "caching": "Redis (Upstash)",
  "queue": "Bull Queue + Redis",
  "translation": "OpenAI GPT-4 + Google Translate",
  "telegram": "node-telegram-bot-api",
  "deployment": "Railway או Render"
}
```

**למה Express ולא FastAPI**:
- אקוסיסטם Node.js עשיר לטלגרם
- שיתוף קוד עם הfrontend (TypeScript)
- ביצועים טובים יותר לרצף משימות I/O

### מקורות נתונים ספורט (בחינם!) 🆓

#### Primary API: football-data.org
```javascript
{
  "url": "https://api.football-data.org/v4/",
  "free_tier": "תמיד חינמי לליגות הגדולות",
  "coverage": [
    "Premier League", "La Liga", "Bundesliga", 
    "Serie A", "Ligue 1", "Champions League", 
    "World Cup", "Euro Championship"
  ],
  "rate_limit": "10 calls/minute",
  "requires_key": true,
  "no_credit_card": true
}
```

#### Secondary API: API-Football (RapidAPI)
```javascript
{
  "url": "https://api-football-v1.p.rapidapi.com/v3/",
  "free_tier": "100 requests/day חינמי לתמיד",
  "coverage": "1100+ ליגות כולל אפריקאיות",
  "features": ["livescore", "fixtures", "standings", "statistics"],
  "requires_rapidapi": true
}
```

#### Tertiary API: APIFootball.com
```javascript
{
  "url": "https://apifootball.com/api/",
  "free_tier": "180 calls/hour חינמי",
  "coverage": ["England Championship", "France Ligue 2"],
  "features": ["livescore", "events", "odds"],
  "widgets": "תמיכה בwidgets חינמיים"
}
```

#### Backup API: SoccersAPI
```javascript
{
  "url": "https://soccersapi.com/api/",
  "free_tier": "15-day trial חינמי",
  "coverage": "800+ ליגות עולמיות",
  "features": ["real-time data", "comprehensive stats"]
}
```

### Database Schema (Supabase) - מעודכן

```sql
-- מקור נתונים ספורט
CREATE TABLE sports_apis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL, -- "football-data-org", "api-football"
  api_url VARCHAR(255) NOT NULL,
  api_key_encrypted TEXT,
  rate_limit_per_hour INTEGER DEFAULT 600,
  daily_calls_used INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1, -- 1 = highest priority
  last_called_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- מנהלי המערכת
CREATE TABLE managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  preferred_language VARCHAR(5) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  email_notifications BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- בוטים (משוייכים למנהלים)
CREATE TABLE bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID REFERENCES managers(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  telegram_token_encrypted TEXT NOT NULL,
  telegram_bot_username VARCHAR(100),
  region_id UUID REFERENCES regions(id),
  language_code VARCHAR(5) DEFAULT 'en',
  
  -- הגדרות אוטומציה
  auto_post_enabled BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  max_posts_per_day INTEGER DEFAULT 10,
  preferred_post_times TIME[] DEFAULT ARRAY['09:00', '15:00', '21:00'],
  
  -- סטטוס
  is_active BOOLEAN DEFAULT true,
  last_post_at TIMESTAMPTZ,
  total_posts_sent INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- תור משימות מתקדם
CREATE TABLE job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- "fetch_live_scores", "send_post", "translate"
  payload JSONB NOT NULL,
  priority INTEGER DEFAULT 0, -- 0=normal, 1=high, 2=urgent
  status VARCHAR(20) DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## מבנה הפרויקט

```
telegrambot/
├── apps/
│   ├── web/                 # Next.js Dashboard
│   │   ├── app/
│   │   │   ├── [locale]/    # רב-שפתיות (en/am/sw)
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── bots/
│   │   │   │   │   ├── channels/
│   │   │   │   │   ├── analytics/
│   │   │   │   │   └── settings/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── login/
│   │   │   │   │   └── register/
│   │   │   │   └── onboarding/ # התחלה ראשונה
│   │   │   └── api/         # API Routes
│   │   ├── components/
│   │   │   ├── ui/          # shadcn components
│   │   │   ├── dashboard/   # Dashboard specific
│   │   │   ├── auth/        # Authentication
│   │   │   └── onboarding/  # Setup wizard
│   │   ├── lib/
│   │   │   ├── supabase.ts
│   │   │   ├── auth.ts
│   │   │   ├── translations.ts
│   │   │   └── sports-apis.ts
│   │   └── package.json
│   │
│   └── api/                 # Express.js Backend
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.ts          # מנהלים authentication
│       │   │   ├── bots.ts          # ניהול בוטים
│       │   │   ├── channels.ts      # ניהול ערוצים
│       │   │   ├── sports-data.ts   # נתוני ספורט
│       │   │   ├── translations.ts  # תרגומים
│       │   │   └── analytics.ts     # סטטיסטיקות
│       │   ├── services/
│       │   │   ├── authService.ts
│       │   │   ├── telegramService.ts
│       │   │   ├── sportsApiService.ts # מנהל כל ה-APIs
│       │   │   ├── translationService.ts
│       │   │   ├── contentService.ts
│       │   │   └── schedulerService.ts
│       │   ├── middleware/
│       │   │   ├── auth.ts          # JWT verification
│       │   │   ├── botAuth.ts       # בדיקת הרשאות לבוט
│       │   │   ├── rateLimit.ts
│       │   │   └── validation.ts
│       │   ├── utils/
│       │   │   ├── database.ts
│       │   │   ├── cache.ts
│       │   │   ├── encryption.ts    # הצפנת טוקנים
│       │   │   ├── apiRotator.ts    # ניהול רוטציה של APIs
│       │   │   └── logger.ts
│       │   └── app.ts
│       └── package.json
│
├── packages/               # שיתוף קוד
│   ├── shared-types/      # TypeScript definitions
│   │   ├── manager.ts     # טיפוסי מנהלים
│   │   ├── bot.ts         # טיפוסי בוטים
│   │   ├── sports.ts      # טיפוסי ספורט
│   │   └── translations.ts
│   ├── ui-components/     # רכיבי UI משותפים
│   └── utils/            # Utilities משותפים
│
├── supabase/
│   ├── migrations/        # Database migrations
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_managers_and_auth.sql
│   │   ├── 003_sports_apis.sql
│   │   └── 004_job_queue.sql
│   ├── functions/         # Edge functions
│   └── config.toml
│
├── env.example           # משתני סביבה ✅
├── docker-compose.yml    # Development environment
├── package.json          # Root package.json
└── turbo.json           # Turborepo config
```

## מערכת APIs ספורט - מתחלפת

### API Rotation Strategy
```javascript
class SportsApiManager {
  constructor() {
    this.apis = [
      { 
        name: 'football-data-org', 
        priority: 1, 
        dailyLimit: 10*60, // 10 calls/min * 60 min = 600/hour
        currentCalls: 0 
      },
      { 
        name: 'api-football', 
        priority: 2, 
        dailyLimit: 100, 
        currentCalls: 0 
      },
      { 
        name: 'apifootball', 
        priority: 3, 
        dailyLimit: 180*24, // 180/hour * 24 hours 
        currentCalls: 0 
      }
    ];
  }
  
  async getAvailableApi() {
    // מחזיר את ה-API עם העדיפות הגבוהה ביותר שיש לו calls פנויים
    return this.apis
      .filter(api => api.currentCalls < api.dailyLimit)
      .sort((a, b) => a.priority - b.priority)[0];
  }
}
```

### fallback Strategy למקרה של כשל
```javascript
async function fetchMatchData(matchId) {
  const apis = ['football-data-org', 'api-football', 'apifootball'];
  
  for (const apiName of apis) {
    try {
      const result = await callSportsApi(apiName, matchId);
      if (result) return result;
    } catch (error) {
      console.log(`API ${apiName} failed, trying next...`);
      continue;
    }
  }
  
  throw new Error('All sports APIs failed');
}
```

## תלויות מרכזיות

### Backend Dependencies
```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "helmet": "^7.1.0",
  "rate-limiter-flexible": "^3.0.8",
  
  "supabase": "^1.191.3",
  "@supabase/supabase-js": "^2.39.0",
  
  "node-telegram-bot-api": "^0.64.0",
  "openai": "^4.20.1",
  "google-translate-api-x": "^10.7.1",
  
  "bull": "^4.12.2",
  "ioredis": "^5.3.2",
  
  "winston": "^3.11.0",
  "joi": "^17.11.0",
  "jsonwebtoken": "^9.0.2",
  "bcrypt": "^5.1.1",
  
  "node-cron": "^3.0.3",
  "axios": "^1.6.2",
  "crypto": "built-in",
  "dotenv": "^16.3.1"
}
```

### Frontend Dependencies  
```json
{
  "next": "14.0.4",
  "react": "^18",
  "react-dom": "^18",
  
  "@radix-ui/react-*": "latest",
  "tailwindcss": "^3.3.6",
  "lucide-react": "^0.294.0",
  
  "next-intl": "^3.4.0",
  "react-hook-form": "^7.48.2",
  "zod": "^3.22.4",
  
  "zustand": "^4.4.7",
  "recharts": "^2.8.0",
  "date-fns": "^2.30.0",
  
  "@supabase/ssr": "^0.1.0",
  "@supabase/supabase-js": "^2.39.0"
}
```

## מערכת האוטומציה והreal-time

### Bull Queue Jobs
```javascript
// משימות רקע
const jobTypes = {
  FETCH_LIVE_SCORES: 'fetch_live_scores',    // כל 30 שניות
  FETCH_FIXTURES: 'fetch_fixtures',          // כל שעה
  SEND_SCHEDULED_POST: 'send_scheduled_post', // לפי זמן
  TRANSLATE_CONTENT: 'translate_content',     // לפי דרישה
  PUSH_HOT_NEWS: 'push_hot_news'             // מיידי
};

// הגדרת jobs
postQueue.process(jobTypes.FETCH_LIVE_SCORES, async (job) => {
  const liveMatches = await sportsApiService.getLiveMatches();
  await processLiveUpdates(liveMatches);
});

postQueue.process(jobTypes.PUSH_HOT_NEWS, async (job) => {
  const { eventType, matchData, language } = job.data;
  await sendHotUpdate(eventType, matchData, language);
});
```

### Real-time Push System
```javascript
// דוגמה לזיהוי אירוע "חם"
function detectHotEvents(matchData) {
  const hotEvents = [];
  
  if (matchData.status === 'GOAL') {
    hotEvents.push({
      type: 'GOAL',
      urgency: 'HIGH',
      content: `⚽ גול! ${matchData.scorer} - ${matchData.homeTeam} ${matchData.score} ${matchData.awayTeam}`
    });
  }
  
  if (matchData.status === 'RED_CARD') {
    hotEvents.push({
      type: 'RED_CARD', 
      urgency: 'MEDIUM',
      content: `🟥 כרטיס אדום ל-${matchData.player}`
    });
  }
  
  return hotEvents;
}
```

## אבטחה מתקדמת

### הצפנת טוקני בוטים
```javascript
const crypto = require('crypto');

class AdvancedTokenManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.secretKey = process.env.ENCRYPTION_KEY;
  }
  
  encryptBotToken(token, managerId) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.secretKey);
    
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedToken: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      managerId // לוודא שרק המנהל הנכון יכול לפענח
    };
  }
  
  decryptBotToken(encryptedData, managerId) {
    if (encryptedData.managerId !== managerId) {
      throw new Error('Unauthorized access to bot token');
    }
    
    const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encryptedToken, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

## הערות על ביצועים וחיסכון

### שימוש חכם ב-APIs החינמיים
1. **Caching אגרסיבי**: תוצאות נשמרות ל-5 דקות מינימום
2. **Batch requests**: מקבצים בקשות כדי לחסוך calls
3. **Selective fetching**: רק ליגות שמעניינות את המשתמשים
4. **Smart rotation**: מתחיל מה-API הכי חזק וחופשי

### מטריקות לניטור
- API calls remaining per service
- Cache hit rate (target: >80%)
- Translation cache effectiveness
- Bot response time
- User engagement per post

זהו מבנה מקצועי וחסכוני שמנצל משאבים חינמיים בצורה חכמה! 🚀 