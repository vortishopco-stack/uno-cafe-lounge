import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

export async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const customerId = authHeader.replace('Bearer ', '')
  if (!customerId) return null

  const customer = await db.customer.findUnique({ where: { id: customerId } })
  return customer
}

export function requireAuth(user: ReturnType<typeof getAuthUser> extends Promise<infer T> ? T : never) {
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export function requireRole(user: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>, role: string) {
  if (user.role !== role && user.role !== 'admin') {
    throw new Error('Forbidden')
  }
  return user
}
