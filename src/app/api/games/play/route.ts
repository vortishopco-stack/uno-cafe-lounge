import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'
import { NextRequest, NextResponse } from 'next/server'

const GAME_CONFIGS: Record<string, { defaultCost: number; cooldownDays: number }> = {
  burger_catch: { defaultCost: 50, cooldownDays: 7 },
  coffee_shooter: { defaultCost: 50, cooldownDays: 7 },
  grand_wheel: { defaultCost: 100, cooldownDays: 30 },
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { gameType, winnings } = body

    if (!gameType || !GAME_CONFIGS[gameType]) {
      return NextResponse.json({ error: 'Invalid game type' }, { status: 400 })
    }

    const config = GAME_CONFIGS[gameType]

    // Get game cost from settings or use default
    const costSetting = await db.appSetting.findUnique({ where: { key: `game_cost_${gameType}` } })
    const entryCost = costSetting ? parseInt(costSetting.value) : config.defaultCost

    // Check cooldown
    const cooldownSetting = await db.appSetting.findUnique({ where: { key: `game_cooldown_${gameType}` } })
    const cooldownDays = cooldownSetting ? parseInt(cooldownSetting.value) : config.cooldownDays

    const lastPlay = await db.gameHistory.findFirst({
      where: { customerId: user.id, gameType },
      orderBy: { playedAt: 'desc' }
    })

    if (lastPlay) {
      const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000
      const timeSinceLastPlay = Date.now() - new Date(lastPlay.playedAt).getTime()
      if (timeSinceLastPlay < cooldownMs) {
        const remainingMs = cooldownMs - timeSinceLastPlay
        const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000))
        return NextResponse.json({
          error: `Cooldown active. Try again in ${remainingHours} hours`,
          cooldownRemaining: remainingMs,
        }, { status: 429 })
      }
    }

    // Check if user has enough points
    if (user.points < entryCost) {
      return NextResponse.json({ error: 'Insufficient points' }, { status: 400 })
    }

    // Deduct entry cost
    await db.customer.update({
      where: { id: user.id },
      data: { points: { decrement: entryCost } }
    })

    // Record game
    const gameHistory = await db.gameHistory.create({
      data: {
        customerId: user.id,
        gameType,
        entryCost,
        winnings: winnings || 0,
      }
    })

    // Add winnings if any
    if (winnings > 0) {
      await db.customer.update({
        where: { id: user.id },
        data: { points: { increment: winnings } }
      })
    }

    const updatedUser = await db.customer.findUnique({ where: { id: user.id } })

    return NextResponse.json({
      gameHistory,
      entryCost,
      winnings,
      newPointsBalance: updatedUser?.points || 0,
    })
  } catch (error) {
    console.error('Game play error:', error)
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
    const gameType = searchParams.get('gameType')

    // Check cooldown status
    if (gameType && GAME_CONFIGS[gameType]) {
      const config = GAME_CONFIGS[gameType]
      const costSetting = await db.appSetting.findUnique({ where: { key: `game_cost_${gameType}` } })
      const entryCost = costSetting ? parseInt(costSetting.value) : config.defaultCost

      const cooldownSetting = await db.appSetting.findUnique({ where: { key: `game_cooldown_${gameType}` } })
      const cooldownDays = cooldownSetting ? parseInt(cooldownSetting.value) : config.cooldownDays

      const lastPlay = await db.gameHistory.findFirst({
        where: { customerId: user.id, gameType },
        orderBy: { playedAt: 'desc' }
      })

      let canPlay = true
      let cooldownRemaining = 0

      if (lastPlay) {
        const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000
        const timeSinceLastPlay = Date.now() - new Date(lastPlay.playedAt).getTime()
        if (timeSinceLastPlay < cooldownMs) {
          canPlay = false
          cooldownRemaining = cooldownMs - timeSinceLastPlay
        }
      }

      return NextResponse.json({
        canPlay,
        entryCost,
        cooldownRemaining,
        lastPlayedAt: lastPlay?.playedAt || null,
      })
    }

    // Get all game history
    const history = await db.gameHistory.findMany({
      where: { customerId: user.id },
      orderBy: { playedAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ history })
  } catch (error) {
    console.error('Game status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
