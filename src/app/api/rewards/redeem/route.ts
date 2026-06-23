import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { rewardId, customerId } = body

    // If employee is redeeming on behalf of customer
    const targetCustomerId = customerId || user.id

    if (customerId && user.role !== 'employee' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const reward = await db.reward.findUnique({ where: { id: rewardId } })
    if (!reward || !reward.available) {
      return NextResponse.json({ error: 'Reward not available' }, { status: 404 })
    }

    const customer = await db.customer.findUnique({ where: { id: targetCustomerId } })
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    if (customer.points < reward.pointsCost) {
      return NextResponse.json({ error: 'Insufficient points' }, { status: 400 })
    }

    // Deduct points and create redemption
    await db.customer.update({
      where: { id: targetCustomerId },
      data: { points: { decrement: reward.pointsCost } }
    })

    const redemption = await db.rewardRedemption.create({
      data: {
        customerId: targetCustomerId,
        rewardId,
        pointsCost: reward.pointsCost,
      }
    })

    const updatedCustomer = await db.customer.findUnique({ where: { id: targetCustomerId } })

    return NextResponse.json({
      redemption,
      newPointsBalance: updatedCustomer?.points || 0,
      rewardName: reward.name,
    })
  } catch (error) {
    console.error('Redeem error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
