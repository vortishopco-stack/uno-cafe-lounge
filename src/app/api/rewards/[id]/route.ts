import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, pointsCost, imageUrl, available } = body

    const reward = await db.reward.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(pointsCost !== undefined && { pointsCost }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(available !== undefined && { available }),
      }
    })

    return NextResponse.json({ reward })
  } catch (error) {
    console.error('Reward PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const { id } = await params
    await db.reward.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reward DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
