import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || (user.role !== 'employee' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden - Employee or Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { customerId, invoiceAmount } = body

    if (!customerId || !invoiceAmount || invoiceAmount <= 0) {
      return NextResponse.json({ error: 'Customer ID and valid invoice amount required' }, { status: 400 })
    }

    // Get points per currency setting
    const setting = await db.appSetting.findUnique({ where: { key: 'points_per_currency' } })
    const pointsPerCurrency = setting ? parseFloat(setting.value) : 1

    const pointsEarned = Math.floor(invoiceAmount * pointsPerCurrency)

    const visit = await db.visit.create({
      data: {
        customerId,
        invoiceAmount,
        pointsEarned,
        createdBy: user.id,
      }
    })

    // Update customer points and visits
    const customer = await db.customer.update({
      where: { id: customerId },
      data: {
        points: { increment: pointsEarned },
        totalVisits: { increment: 1 },
      }
    })

    // Update missions
    const missions = await db.mission.findMany({
      where: { customerId, completed: false }
    })

    for (const mission of missions) {
      let newProgress = mission.progress
      if (mission.type === 'visit_5' || mission.type === 'visit_10') {
        newProgress = customer.totalVisits
      } else if (mission.type === 'spend_200') {
        const totalSpend = await db.visit.aggregate({
          where: { customerId },
          _sum: { invoiceAmount: true }
        })
        newProgress = Math.floor(totalSpend._sum.invoiceAmount || 0)
      }

      const completed = newProgress >= mission.target
      await db.mission.update({
        where: { id: mission.id },
        data: {
          progress: newProgress,
          completed,
        }
      })

      if (completed && mission.points > 0) {
        await db.customer.update({
          where: { id: customerId },
          data: { points: { increment: mission.points } }
        })
        await db.mission.update({
          where: { id: mission.id },
          data: { points: 0 } // Mark as rewarded
        })
      }
    }

    return NextResponse.json({ visit, pointsEarned, newPointsBalance: customer.points })
  } catch (error) {
    console.error('Visit create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId') || user.id

    // Users can only see their own visits unless admin/employee
    if (customerId !== user.id && user.role !== 'admin' && user.role !== 'employee') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const visits = await db.visit.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ visits })
  } catch (error) {
    console.error('Visits GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
