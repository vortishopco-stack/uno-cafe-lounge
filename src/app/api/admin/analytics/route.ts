import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const totalUsers = await db.customer.count({ where: { role: 'customer' } })
    const totalEmployees = await db.customer.count({ where: { role: 'employee' } })

    const pointsResult = await db.customer.aggregate({
      _sum: { points: true },
      where: { role: 'customer' }
    })
    const pointsInCirculation = pointsResult._sum.points || 0

    const totalVisits = await db.visit.count()

    const totalRedemptions = await db.rewardRedemption.count()
    const redemptionPoints = await db.rewardRedemption.aggregate({ _sum: { pointsCost: true } })

    const totalGamesPlayed = await db.gameHistory.count()
    const gameWinnings = await db.gameHistory.aggregate({ _sum: { winnings: true } })
    const gameCosts = await db.gameHistory.aggregate({ _sum: { entryCost: true } })

    // Visits per day (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentVisits = await db.visit.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: 'asc' }
    })

    // Game distribution
    const gameHistory = await db.gameHistory.findMany()
    const gameDistribution: Record<string, number> = {}
    for (const g of gameHistory) {
      gameDistribution[g.gameType] = (gameDistribution[g.gameType] || 0) + 1
    }

    return NextResponse.json({
      totalUsers,
      totalEmployees,
      pointsInCirculation,
      totalVisits,
      totalRedemptions,
      totalRedemptionPoints: redemptionPoints._sum.pointsCost || 0,
      totalGamesPlayed,
      totalGameWinnings: gameWinnings._sum.winnings || 0,
      totalGameCosts: gameCosts._sum.entryCost || 0,
      recentVisits,
      gameDistribution,
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
