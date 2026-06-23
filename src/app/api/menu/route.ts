import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const menuItems = await db.menuItem.findMany({
      where: { available: true },
      orderBy: { category: 'asc' }
    })
    return NextResponse.json({ menuItems })
  } catch (error) {
    console.error('Menu GET error:', error)
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
    const { name, description, price, category, imageUrl } = body

    if (!name || !price) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 })
    }

    const menuItem = await db.menuItem.create({
      data: { name, description: description || '', price, category: category || 'Main', imageUrl: imageUrl || '' }
    })

    return NextResponse.json({ menuItem })
  } catch (error) {
    console.error('Menu POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
