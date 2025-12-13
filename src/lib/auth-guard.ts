// EMERGENCY AUTH GUARD - HARDCODED WHITELIST
// ONLY these 3 emails can access ANYTHING

export const AUTHORIZED_TEAM_EMAILS = [
  'saarth@sixtyfour.ai',
  'roham@sixtyfour.ai',
  'chrisprice@sixtyfour.ai',
  'hashim@sixtyfour.ai',
  'erik@sixtyfour.ai'
] as const

export function isAuthorizedEmail(email: string | undefined | null): boolean {
  if (!email) return false
  return AUTHORIZED_TEAM_EMAILS.includes(email.toLowerCase() as any)
}

export function requireAuth(email: string | undefined | null): void {
  if (!isAuthorizedEmail(email)) {
    throw new Error('UNAUTHORIZED ACCESS DENIED')
  }
}

 
