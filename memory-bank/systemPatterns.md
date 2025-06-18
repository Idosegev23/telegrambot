# תבניות המערכת - ארכיטקטורה טכנית

## ארכיטקטורה כללית

### מודל Microservices
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Web Frontend  │────▶│   API Gateway    │────▶│  Bot Manager    │
│   (Dashboard)   │     │   (Express/      │     │   Service       │
└─────────────────┘     │   FastAPI)       │     └─────────────────┘
                        └──────────────────┘              │
                                 │                        │
                        ┌──────────────────┐     ┌─────────────────┐
                        │   Translation    │     │  Content        │
                        │   Service        │     │  Generator      │
                        └──────────────────┘     └─────────────────┘
                                 │                        │
                        ┌──────────────────┐     ┌─────────────────┐
                        │   Supabase DB    │     │  Telegram API   │
                        │   (PostgreSQL)   │     │  Integration    │
                        └──────────────────┘     └─────────────────┘
```

## מבנה מסד הנתונים (Supabase)

### טבלאות מרכזיות:

#### 1. `regions` - ניהול אזורים גיאוגרפיים
```sql
CREATE TABLE regions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL, -- "Ethiopia", "Tanzania" 
  code VARCHAR(5) NOT NULL UNIQUE, -- "ET", "TZ"
  default_language VARCHAR(5) NOT NULL, -- "am", "sw"
  currency_code VARCHAR(3), -- "ETB", "TZS"
  flag_emoji VARCHAR(10), -- "🇪🇹", "🇹🇿"
  timezone VARCHAR(50), -- "Africa/Addis_Ababa"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. `languages` - ניהול שפות
```sql
CREATE TABLE languages (
  code VARCHAR(5) PRIMARY KEY, -- "am", "sw", "en"
  name VARCHAR(100) NOT NULL, -- "Amharic", "Swahili"
  native_name VARCHAR(100), -- "አማርኛ", "Kiswahili"
  direction VARCHAR(3) DEFAULT 'ltr', -- "rtl" או "ltr"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. `translations` - מערכת תרגומים
```sql
CREATE TABLE translations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(255) NOT NULL, -- "next_match", "goal_scorer"
  context VARCHAR(100), -- "sports", "ui", "bot_messages"
  
  -- תרגומים לכל שפה
  am TEXT, -- אמהרית
  sw TEXT, -- סווהילית
  lg TEXT, -- לוגנדה
  rw TEXT, -- קניארואנדה
  en TEXT, -- אנגלית
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(key, context)
);
```

#### 4. `managers` - ניהול מנהלים
```sql
CREATE TABLE managers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  preferred_language VARCHAR(5) REFERENCES languages(code),
  
  -- הגדרות מנהל
  timezone VARCHAR(50) DEFAULT 'UTC',
  email_notifications BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. `bots` - ניהול בוטים
```sql
CREATE TABLE bots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID REFERENCES managers(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  telegram_token_encrypted TEXT NOT NULL, -- מוצפן!
  telegram_bot_username VARCHAR(100),
  region_id UUID REFERENCES regions(id),
  language_code VARCHAR(5) REFERENCES languages(code),
  
  -- הגדרות בוט
  timezone VARCHAR(50),
  tone VARCHAR(20) DEFAULT 'friendly', -- "funny", "formal", "friendly"
  max_posts_per_day INTEGER DEFAULT 10,
  auto_post_enabled BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6. `channels` - ערוצי טלגרם
```sql
CREATE TABLE channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id UUID REFERENCES bots(id),
  telegram_channel_id VARCHAR(50) NOT NULL, -- "@channel_name" או ID
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- הגדרות פרסום
  auto_post BOOLEAN DEFAULT true,
  post_frequency_hours INTEGER DEFAULT 4,
  preferred_post_times TIME[], -- ["09:00", "15:00", "21:00"]
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 7. `teams` - קבוצות ספורט
```sql
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  region_id UUID REFERENCES regions(id),
  league VARCHAR(100),
  logo_url VARCHAR(255),
  is_local BOOLEAN DEFAULT false, -- true = קבוצה מקומית
  
  -- תרגומי שמות קבוצות
  name_translations JSONB, -- {"am": "ሴንት ጎርጎርዮስ", "sw": "Simba SC"}
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 8. `posts` - היסטוריית פוסטים
```sql
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES channels(id),
  
  -- תוכן הפוסט
  content_template VARCHAR(50), -- "match_prediction", "team_news"
  original_content TEXT,
  translated_content TEXT,
  language_code VARCHAR(5),
  
  -- נתוני טלגרם
  telegram_message_id BIGINT,
  sent_at TIMESTAMPTZ,
  
  -- נתוני אנליטיקס
  views INTEGER DEFAULT 0,
  reactions INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## תבניות עיצוב (Design Patterns)

### 1. Template Method Pattern - יצירת פוסטים
```javascript
class PostGenerator {
  generatePost(template, data, language) {
    const baseContent = this.createBaseContent(template, data);
    const translatedContent = this.translateContent(baseContent, language);
    const styledContent = this.applyRegionalStyling(translatedContent, language);
    return this.addEmojisAndFormatting(styledContent);
  }
}
```

### 2. Strategy Pattern - תרגום
```javascript
class TranslationStrategy {
  translate(text, targetLanguage) {
    // Implementation by concrete strategy
  }
}

class GoogleTranslateStrategy extends TranslationStrategy { /* ... */ }
class ChatGPTTranslateStrategy extends TranslationStrategy { /* ... */ }
class HumanTranslateStrategy extends TranslationStrategy { /* ... */ }
```

### 3. Observer Pattern - התראות
```javascript
class BotEventEmitter {
  constructor() {
    this.listeners = {};
  }
  
  on(event, callback) { /* ... */ }
  emit(event, data) { /* ... */ }
}

// Usage:
botEmitter.on('post_sent', (data) => {
  analyticsService.trackPost(data);
  notificationService.notify(data);
});
```

## אבטחה ופרטיות

### 1. JWT Authentication
- כל API מאובטח עם JWT
- Refresh tokens למשימות ארוכות טווח
- Rate limiting לכל endpoint

### 2. הצפנת טוקני בוטים
```javascript
const crypto = require('crypto');

class TokenManager {
  encryptToken(token) {
    const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
    return cipher.update(token, 'utf8', 'hex') + cipher.final('hex');
  }
  
  decryptToken(encryptedToken) {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
    return decipher.update(encryptedToken, 'hex', 'utf8') + decipher.final('utf8');
  }
}
```

### 3. Webhook Security
- אימות webhook signatures מטלגרם
- HTTPS חובה
- IP whitelisting

## מערכת Cache

### 1. Redis למידע זמני
```javascript
// תרגומים נפוצים
redis.setex(`translation:${key}:${lang}`, 3600, translatedText);

// נתוני קבוצות
redis.setex(`team:${teamId}`, 1800, JSON.stringify(teamData));

// סטטיסטיקות
redis.setex(`stats:${channelId}:daily`, 86400, JSON.stringify(stats));
```

### 2. Memory Cache לתבניות
```javascript
const NodeCache = require('node-cache');
const templateCache = new NodeCache({ stdTTL: 3600 });

function getTemplate(templateName) {
  let template = templateCache.get(templateName);
  if (!template) {
    template = loadTemplateFromDB(templateName);
    templateCache.set(templateName, template);
  }
  return template;
}
```

## ניהול שגיאות

### 1. Global Error Handler
```javascript
class GlobalErrorHandler {
  handle(error, context) {
    this.logError(error, context);
    this.notifyAdmins(error);
    this.fallbackResponse(context);
  }
  
  fallbackResponse(context) {
    if (context.type === 'translation_failed') {
      return context.originalText; // חזרה לטקסט מקורי
    }
  }
}
```

### 2. Circuit Breaker למשחקי API חיצוניים
```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  async call(fn) {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
``` 