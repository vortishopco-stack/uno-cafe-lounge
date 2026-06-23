import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || (user.role !== 'employee' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')

    if (!phone) {
      return NextResponse.json({ error: 'Phone parameter required' }, { status: 400 })
    }

    const customer = await db.customer.findUnique({
      where: { phone },
      include: {
        visits: { orderBy: { createdAt: 'desc' }, take: 10 },
        missions: true,
      }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const { password: _, ...safeCustomer } = customer
    return NextResponse.json({ customer: safeCustomer })
  } catch (error) {
    console.error('Customer search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
