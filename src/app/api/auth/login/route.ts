import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/auth-utils'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, password } = body

    if (!phone || !password) {
      return NextResponse.json({ error: 'Phone and password are required' }, { status: 400 })
    }

    const customer = await db.customer.findUnique({ where: { phone } })
    if (!customer) {
      return NextResponse.json({ error: 'Invalid phone or password' }, { status: 401 })
    }

    const valid = await verifyPassword(password, customer.password)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid phone or password' }, { status: 401 })
    }

    const { password: _, ...safeCustomer } = customer
    return NextResponse.json({ user: safeCustomer, token: customer.id })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
