# קונטקסט פעיל - מצב נוכחי ומטלות

## מצב הפרויקט הנוכחי
**תאריך**: דצמבר 2024  
**שלב**: תכנון ועיצוב ראשוני  
**סטטוס**: פרויקט חדש - מתחיל מאפס

## מטרות המפגש הנוכחי
1. **יצירת Memory Bank מלא** ✅
2. **תכנון ארכיטקטורה מפורט** ✅ 
3. **הגדרת דרישות טכניות** ✅
4. **מעבר למצב Plan Mode** - הבא

## החלטות מרכזיות שהתקבלו

### סטאק טכנולוגי
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript 
- **Database**: Supabase (PostgreSQL)
- **Cache**: Redis (Upstash)
- **Translation**: OpenAI GPT-4 + Google Translate
- **Deployment**: Vercel (Frontend) + Railway (Backend)

### מקורות נתונים ספורט (APIs חינמיים)
- **Primary**: football-data.org (חינמי לליגות גדולות)
- **Secondary**: API-Football (100 calls/day חינמי)
- **Tertiary**: APIFootball.com (180 calls/hour חינמי)
- **Backup**: SoccersAPI (15-day trial)

### מערכת ניהול מנהלים
- כל מנהל מקבל dashboard נפרד
- בכניסה ראשונה: בחירת שפה וחיבור bot token
- מערכת הרשאות מובנית
- תמיכה במספר בוטים למנהל אחד

### מבנה תרגומים
- 3 שפות עיקריות: אמהרית, אנגלית, סוואהילית
- מערכת fallback לאנגלית
- תמיכה בכיוון RTL/LTR
- Redis caching לתרגומים

### עיצוב וממשק
- מינימליסטי וקריא
- תמיכה בדארק מוד
- עיצוב responsive
- דשבורדים אינטואיטיביים

### אוטומציה מלאה
- פרסום אוטומטי של תוצאות וגמרים חמים
- push notifications לאירועים חשובים
- מערכת scheduling מתקדמת
- Circuit Breaker לשירותים חיצוניים

## שפות ליישום (בשלבים)
- **Phase 1**: אנגלית + אמהרית 🇪🇹
- **Phase 2**: סוואהילית 🇹🇿
- **Future**: לוגנדה 🇺🇬 וקניארואנדה 🇷🇼

## דוגמאות לתוכן מותאם

### אתיופיה (אמהרית)
```
🔥 ዛሬ እንደ ተቃዋሚዎቻችን የሚሰጥ ትንበያ!
⚽ የአዲስ ጨዋታ: አርበኛት vs ሴንት ጎርጎርዮስ  
📊 የቅርብ ስታቲስቲክስ: 6 አሸናፊ ጨዋታዎች  
```

### טנזניה (סווהילית)  
```
🔥 Mechi kali usiku wa leo!
⚽ Simba vs Yanga – Battle ya Dar!  
📈 BTTS katika mechi 5 za mwisho  
```

## מה צריך להיעשות הבא (Plan Mode)

### Phase 1: Foundation Setup
1. **יצירת מבנה הפרויקט הבסיסי**
   - הגדרת monorepo עם Turborepo
   - יצירת apps/web ו-apps/api
   - הגדרת packages משותפים

2. **הקמת Database Schema**
   - יצירת פרויקט Supabase
   - הרצת migrations לכל הטבלאות
   - הגדרת RLS policies
   - הכנסת נתונים ראשוניים (אזורים, שפות)

3. **Backend API בסיסי**
   - Express.js server עם TypeScript
   - Routes בסיסיים לבוטים וערוצים
   - מערכת authentication
   - חיבור לSupabase

### Phase 2: Core Features
1. **מערכת תרגומים**
   - Integration עם OpenAI API
   - מערכת fallback לGoogle Translate
   - Cache תרגומים ב-Redis
   - Admin interface לעריכת תרגומים

2. **Bot Management**
   - יצירה וניהול בוטי טלגרם
   - הגדרת ערוצים לכל בוט
   - מערכת scheduling לפוסטים
   - webhook handlers לטלגרם

3. **Content Generation**
   - תבניות פוסטים
   - יצירת תוכן דינמי
   - התאמה אזורית (קבוצות, ליגות)
   - מערכת emojis ו-formatting

### Phase 3: Frontend Dashboard
1. **Authentication & Layout**
   - Supabase Auth integration
   - רב-שפתיות עם next-intl
   - Dashboard layout בסיסי
   - Navigation ו-sidebar

2. **Bot Management UI**
   - רשימת בוטים קיימים
   - טופס יצירת בוט חדש
   - הגדרות בוט (אזור, שפה, תזמון)
   - ניהול ערוצים

3. **Content Management**
   - עורך תבניות פוסטים
   - ממשק תרגומים
   - בחירת קבוצות וליגות
   - preview של פוסטים

### Phase 4: Advanced Features
1. **Analytics & Monitoring**
   - סטטיסטיקות פוסטים
   - ביצועי ערוצים
   - ניתוח engagement
   - שגיאות ו-logs

2. **Automation & Scheduling**
   - Bull Queue לעיבוד ברקע
   - Cron jobs לפוסטים אוטומטיים
   - מערכת retry לשגיאות
   - Webhook processing

## שאלות פתוחות לקראת התחלת הפיתוח

1. **איזה ספורט API להשתמש?**
   - Football-API (RapidAPI)
   - API-Sports
   - SportMonks
   - *צריך לבדוק מחירים וכיסוי אפריקה*

2. **מה רמת האוטומציה הרצויה?**
   - פוסטים אוטומטיים לחלוטין?
   - אישור ידני לפני פרסום?
   - עריכה של תוכן שנוצר?

3. **איך לטפל בשגיאות תרגום?**
   - חזרה לאנגלית?
   - התראה למנהל?
   - שימוש בתרגום אלטרנטיבי?

4. **מה המודל העסקי?**
   - מנוי חודשי לכל בוט?
   - תשלום לפי הודעות?
   - תכנית Freemium?

## הערות טכניות חשובות
- כל הטקסטים יישמרו ב-UTF-8 לתמיכה בשפות אפריקאיות
- צריך לטפל בכיוון כתיבה (RTL/LTR) 
- חשיבות גבוהה לביצועים - Redis caching חובה
- אבטחה מקסימלית לטוקני בוטים (הצפנה)
- Rate limiting לכל ה-APIs החיצוניים

## מוכנות למעבר ל-Plan Mode
כל המידע הבסיסי נאסף ותועד. אפשר לעבור לפיתוח תכנית מפורטת ותחילת היישום. 