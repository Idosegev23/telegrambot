# מדריך הגדרה - מערכת ניהול בוטי טלגרם

## ✅ מה הושלם

### פרויקט Supabase
- **שם הפרויקט:** `telegram-bot-manager`
- **Project ID:** `ythsmnqclosoxiccchhh`
- **URL:** https://ythsmnqclosoxiccchhh.supabase.co
- **אזור:** eu-central-1

### מבנה Database
```
8 טבלאות הוקמו:
├── languages (שפות נתמכות)
├── regions (אזורים גיאוגרפיים)
├── managers (מנהלי המערכת)
├── bots (בוטי טלגרם)
├── channels (ערוצי טלגרם)
├── teams (קבוצות ספורט)
├── translations (תרגומי UI)
├── posts (פוסטים שנשלחו)
└── sports_apis (מקורות נתוני ספורט)
```

### Authentication & הרשאות
- **מנהל על-על:** triroars@gmail.com (שליטה מלאה על המערכת)
- **מנהלים רגילים:** יכולים לראות ולנהל רק את הבוטים שלהם
- **RLS מוגדר:** הגנה מלאה על נתונים
- **Trigger אוטומטי:** יצירת פרופיל מנהל בהרשמה

## 🔧 הגדרות נדרשות

### 1. השלמת הגדרות Authentication ב-Supabase

**עבור לדשבורד Supabase:**
1. היכנס ל-https://supabase.com/dashboard
2. בחר בפרויקט `telegram-bot-manager`
3. לך ל-Authentication > Settings
4. הגדר את הProviders:

#### Google OAuth
```
Client ID: [הכנס Google OAuth Client ID]
Client Secret: [הכנס Google OAuth Client Secret]
Redirect URL: https://ythsmnqclosoxiccchhh.supabase.co/auth/v1/callback
```

#### Email Authentication  
```
✅ Enable email confirmations
✅ Enable password recovery
✅ Allow unconfirmed logins (לבדיקות)
```

### 2. עדכון משתני הסביבה

העתק את הקובץ `env.example` ל-`.env.local`:

```bash
cp env.example .env.local
```

**עדכן את הערכים החסרים:**
```bash
# Supabase (כבר מוגדר!)
SUPABASE_URL=https://ythsmnqclosoxiccchhh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0aHNtbnFjbG9zb3hpY2NjaGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNjYzMTksImV4cCI6MjA2NTc0MjMxOX0.O9hAHQa3qZ3WMixz2VyQVBB8sxLDT-MMRjlTVg_jaCk

# צריך להוסיף:
SUPABASE_SERVICE_ROLE_KEY=[Service Role Key מהדשבורד]
OPENAI_API_KEY=[API Key מ-OpenAI]
GOOGLE_TRANSLATE_API_KEY=[API Key מ-Google Cloud]
```

### 3. בדיקת המערכת

#### Test Database Connection
```sql
-- רוץ ב-SQL Editor של Supabase
SELECT 
  (SELECT COUNT(*) FROM public.languages) as languages,
  (SELECT COUNT(*) FROM public.regions) as regions,
  (SELECT COUNT(*) FROM public.teams) as teams,
  (SELECT COUNT(*) FROM public.translations) as translations;
```

**תוצאה צפויה:**
```
languages: 3 (en, am, sw)
regions: 5 (Ethiopia, Tanzania, Uganda, Rwanda, Kenya)  
teams: 9 (Manchester United, Liverpool, Real Madrid, etc.)
translations: 32 (Welcome, Login, Dashboard, etc.)
```

## 🚀 שלבים הבאים

### 1. הכנת סביבת הפיתוח
```bash
# יצירת הפרויקט
npx create-turbo@latest telegrambot --package-manager npm
cd telegrambot

# הוספת אפליקציות
npx create-next-app@latest apps/web --typescript --tailwind --app
mkdir apps/api
```

### 2. התחברות ראשונה למערכת
כאשר תירשם לראשונה עם **triroars@gmail.com**, המערכת תזהה אותך אוטומטית כמנהל-על ותיתן לך:
- ✅ גישה לכל הבוטים במערכת
- ✅ יכולת לנהל קבוצות ספורט
- ✅ שליטה על תרגומים
- ✅ ניהול מקורות נתוני ספורט
- ✅ הרשאות מלאות לכל הטבלאות

### 3. יצירת משתמשים נוספים
כל משתמש חדש שיירשם יקבל:
- ✅ פרופיל מנהל רגיל
- ✅ יכולת ליצור בוטים
- ✅ גישה רק לבוטים שלו
- ✅ ממשק בשפה הנבחרת

## 📊 מבנה הרשאות

### מנהל על-על (triroars@gmail.com)
```sql
role = 'super_admin'
יכול לגשת לכל הטבלאות
יכול לראות את כל הבוטים
יכול לנהל קבוצות ותרגומים
```

### מנהל רגיל
```sql
role = 'manager'  
יכול לראות רק את הבוטים שלו
יכול ליצור/עדכן/למחוק את הבוטים שלו
גישה לקריאה לטבלאות reference (languages, regions, teams)
```

## 🔒 אבטחה

### הצפנת טוקני בוטים
```javascript
// טוקני הבוטים מוצפנים עם המפתח האישי של המנהל
telegram_token_encrypted = encrypt(token, manager_id)

// רק המנהל שיצר את הבוט יכול לפענח את הטוקן
decrypted_token = decrypt(encrypted_token, manager_id)
```

### Row Level Security (RLS)
- כל טבלה מוגנת עם RLS policies
- גישה מוגבלת לפי user_id ו-manager_id
- מנהל-על עוקף את כל ההגבלות

## 🌍 תמיכה רב-תרבותית

### שפות נתמכות
- **English (en)** - ברירת מחדל
- **Amharic (am)** - אמהרית (אתיופיה) 
- **Swahili (sw)** - סוואהילית (טנזניה)

### תרגומי UI מוכנים
32 תרגומים בסיסיים למילים כמו:
- Welcome → እንኳን ደህና መጡ (am) → Karibu (sw)
- Login → ግባ (am) → Ingia (sw)
- Dashboard → ዳሽቦርድ (am) → Dashibodi (sw)

## ✨ Features מוכנים

- ✅ **Authentication** עם Google + Email
- ✅ **מבנה Database** מלא
- ✅ **הרשאות RLS** מוגדרות
- ✅ **תרגומים בסיסיים** 
- ✅ **קבוצות ספורט** לדוגמה
- ✅ **מנהל על-על** מוגדר
- ✅ **מקורות נתוני ספורט** מוכנים

המערכת מוכנה להתחלת פיתוח הfrontend! 🎉 