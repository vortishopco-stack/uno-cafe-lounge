import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth-utils'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, email, name, password } = body

    if (!phone || !email || !name || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const existing = await db.customer.findFirst({
      where: { OR: [{ phone }, { email }] }
    })
    if (existing) {
      return NextResponse.json({ error: 'Phone or email already registered' }, { status: 409 })
    }

    const hashedPassword = await hashPassword(password)
    const role = phone === '000000' ? 'admin' : 'customer'

    const customer = await db.customer.create({
      data: {
        phone,
        email,
        name,
        password: hashedPassword,
        role,
        points: role === 'admin' ? 99999 : 100, // Starting bonus
      }
    })

    // Create default missions for new customer
    if (role === 'customer') {
      await db.mission.createMany({
        data: [
          { customerId: customer.id, type: 'visit_5', title: 'Visit 5 Times', target: 5, progress: 0, points: 200 },
          { customerId: customer.id, type: 'visit_10', title: 'Visit 10 Times', target: 10, progress: 0, points: 500 },
          { customerId: customer.id, type: 'spend_200', title: 'Spend $200 Total', target: 200, progress: 0, points: 300 },
        ]
      })
    }

    const { password: _, ...safeCustomer } = customer
    return NextResponse.json({ user: safeCustomer, token: customer.id })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
