import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const rewards = await db.reward.findMany({
      where: { available: true },
      orderBy: { pointsCost: 'asc' }
    })
    return NextResponse.json({ rewards })
  } catch (error) {
    console.error('Rewards GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, pointsCost, imageUrl } = body

    if (!name || !pointsCost) {
      return NextResponse.json({ error: 'Name and pointsCost are required' }, { status: 400 })
    }

    const reward = await db.reward.create({
      data: { name, description: description || '', pointsCost, imageUrl: imageUrl || '' }
    })

    return NextResponse.json({ reward })
  } catch (error) {
    console.error('Rewards POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
