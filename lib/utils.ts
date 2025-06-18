import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import crypto from 'crypto'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, locale: string = 'en') {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (locale === 'am') {
    // Ethiopian date formatting
    return new Intl.DateTimeFormat('am-ET', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj)
  }
  
  if (locale === 'sw') {
    // Swahili date formatting
    return new Intl.DateTimeFormat('sw-TZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj)
  }
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj)
}

export function formatTime(time: string, locale: string = 'en') {
  const [hours, minutes] = time.split(':')
  const date = new Date()
  date.setHours(parseInt(hours), parseInt(minutes))
  
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function getDirection(language: string): 'ltr' | 'rtl' {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur']
  return rtlLanguages.includes(language) ? 'rtl' : 'ltr'
}

export function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function validateTelegramToken(token: string): boolean {
  // Telegram bot token format: NNNNNNNNNN:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
  const tokenRegex = /^\d{8,10}:[a-zA-Z0-9_-]{35}$/
  return tokenRegex.test(token)
}

export function validateTelegramChannel(channel: string): boolean {
  // Telegram channel format: @channelname or -100XXXXXXXXX
  const channelRegex = /^(@[a-zA-Z][a-zA-Z0-9_]{4,31}|-100\d{10,13})$/
  return channelRegex.test(channel)
}

// Simple encryption/decryption for bot tokens
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production'
const algorithm = 'aes-256-cbc'

export function encryptToken(token: string): string {
  try {
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest()
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipher(algorithm, key)
    let encrypted = cipher.update(token, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Error encrypting token:', error)
    return token // Return original token if encryption fails
  }
}

export function decryptToken(encryptedToken: string): string {
  try {
    // First try base64 decoding (legacy format)
    if (!encryptedToken.includes(':')) {
      try {
        const decoded = Buffer.from(encryptedToken, 'base64').toString('utf8')
        // If it looks like a valid telegram token (contains numbers and letters with :)
        if (decoded.includes(':') && decoded.match(/^\d+:[A-Za-z0-9_-]+$/)) {
          return decoded
        }
      } catch (e) {
        // Not base64, continue with other methods
      }
    }
    
    // Try advanced decryption if it contains ':'
    if (encryptedToken.includes(':')) {
      const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest()
      const textParts = encryptedToken.split(':')
      const iv = Buffer.from(textParts.shift()!, 'hex')
      const encryptedText = textParts.join(':')
      const decipher = crypto.createDecipher(algorithm, key)
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    }
    
    // Return original if all else fails
    return encryptedToken
  } catch (error) {
    console.error('Error decrypting token:', error)
    // Try simple base64 decode as fallback
    try {
      return Buffer.from(encryptedToken, 'base64').toString('utf8')
    } catch (e) {
      return encryptedToken // Return original token if all decryption fails
    }
  }
} 