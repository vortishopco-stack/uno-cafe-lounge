import { supabase, phoneToEmail } from '@/lib/supabase'

// ========== GAME CONFIG TYPES & DEFAULTS ==========

export interface WinTier {
  minScore: number  // minimum game score needed to earn this reward
  reward: number    // points awarded
}

export interface WheelSegment {
  label: string
  value: number
  color: string
}

// Default win tiers for skill-based games (burger_catch, coffee_shooter).
// Evaluated top-down: the first tier whose minScore the player reaches wins.
export const DEFAULT_WIN_TIERS: WinTier[] = [
  { minScore: 100, reward: 200 },
  { minScore: 80, reward: 150 },
  { minScore: 60, reward: 100 },
  { minScore: 40, reward: 70 },
  { minScore: 20, reward: 30 },
  { minScore: 10, reward: 10 },
]

// Default 12 segments for the Grand / Lounge Wheel.
export const DEFAULT_WHEEL_SEGMENTS: WheelSegment[] = [
  { label: '0', value: 0, color: '#374151' },
  { label: '20', value: 20, color: '#7c3aed' },
  { label: '50', value: 50, color: '#a855f7' },
  { label: '0', value: 0, color: '#1f2937' },
  { label: '100', value: 100, color: '#ec4899' },
  { label: '10', value: 10, color: '#8b5cf6' },
  { label: '0', value: 0, color: '#374151' },
  { label: '30', value: 30, color: '#6366f1' },
  { label: '200', value: 200, color: '#f59e0b' },
  { label: '0', value: 0, color: '#1f2937' },
  { label: '75', value: 75, color: '#c084fc' },
  { label: '5', value: 5, color: '#7c3aed' },
]

// Default entry costs per game (used when no app_settings row exists)
const DEFAULT_GAME_COSTS: Record<string, number> = {
  burger_catch: 50,
  coffee_shooter: 50,
  grand_wheel: 100,
}

// Default cooldown days per game
const DEFAULT_GAME_COOLDOWNS: Record<string, number> = {
  burger_catch: 7,
  coffee_shooter: 7,
  grand_wheel: 30,
}

// Safe JSON parse with fallback
function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return fallback
    return parsed as T
  } catch {
    return fallback
  }
}

// Normalize win tiers: sort descending by minScore, clamp rewards to >= 0
function normalizeTiers(tiers: WinTier[]): WinTier[] {
  return tiers
    .filter(t => t && typeof t.minScore === 'number' && typeof t.reward === 'number')
    .map(t => ({
      minScore: Math.max(0, Math.floor(t.minScore)),
      reward: Math.max(0, Math.floor(t.reward)),
    }))
    .sort((a, b) => b.minScore - a.minScore)
}

// Normalize wheel segments: ensure label/value/color exist
function normalizeSegments(segments: WheelSegment[]): WheelSegment[] {
  return segments
    .filter(s => s && typeof s.label !== 'undefined')
    .map(s => ({
      label: String(s.label ?? '0'),
      value: Math.max(0, Math.floor(Number(s.value) || 0)),
      color: typeof s.color === 'string' && s.color ? s.color : '#7c3aed',
    }))
}

class ApiClient {
  // ========== AUTH ==========

  async login(phone: string, password: string) {
    const email = phoneToEmail(phone)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)

    const { data: profile } = await supabase
      .from('customers')
      .select('*')
      .eq('id', data.user.id)
      .single()

    // If no profile exists, auto-create one
    if (!profile) {
      const role = this.getDefaultRole(phone)
      const newProfile = {
        id: data.user.id,
        phone,
        email: data.user.email || email,
        name: data.user.user_metadata?.name || phone,
        points: role === 'admin' ? 99999 : 100,
        total_visits: 0,
        role,
      }
      const { data: created, error: createError } = await supabase
        .from('customers')
        .insert(newProfile)
        .select()
        .single()

      if (createError) throw new Error('Failed to create profile: ' + createError.message)
      return { user: created, token: data.session?.access_token || '' }
    }

    return { user: profile, token: data.session?.access_token || '' }
  }

  private getDefaultRole(phone: string): 'admin' | 'employee' | 'customer' {
    if (phone === '000000') return 'admin'
    if (phone === '111111') return 'employee'
    return 'customer'
  }

  async signup(phone: string, email: string, name: string, password: string) {
    const authEmail = phoneToEmail(phone)
    const role = this.getDefaultRole(phone)

    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password,
    })
    if (error) throw new Error(error.message)

    const userId = data.user?.id
    if (!userId) throw new Error('Signup failed')

    // Create customer profile
    const { error: profileError } = await supabase.from('customers').insert({
      id: userId,
      phone,
      email,
      name,
      role,
      points: role === 'admin' ? 99999 : 100,
    })
    if (profileError) throw new Error(profileError.message)

    // Create default missions for customers
    if (role === 'customer') {
      await supabase.from('missions').insert([
        { customer_id: userId, type: 'visit_5', title: 'Visit 5 Times', target: 5, progress: 0, points: 200 },
        { customer_id: userId, type: 'visit_10', title: 'Visit 10 Times', target: 10, progress: 0, points: 500 },
        { customer_id: userId, type: 'spend_200', title: 'Spend $200 Total', target: 200, progress: 0, points: 300 },
      ])
    }

    const { data: profile } = await supabase
      .from('customers')
      .select('*')
      .eq('id', userId)
      .single()

    return { user: profile, token: data.session?.access_token || '' }
  }

  async getMe() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Not authenticated')

    const { data: profile } = await supabase
      .from('customers')
      .select('*')
      .eq('id', authUser.id)
      .single()

    return { user: profile }
  }

  // ========== VISITS ==========

  async createVisit(customerId: string, invoiceAmount: number) {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Not authenticated')

    const { data, error } = await supabase.rpc('add_visit', {
      p_customer_id: customerId,
      p_invoice_amount: invoiceAmount,
      p_created_by: authUser.id,
    })
    if (error) throw new Error(error.message)
    if (data?.error) throw new Error(data.error)
    return data
  }

  async getVisits(customerId?: string) {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Not authenticated')

    const targetId = customerId || authUser.id

    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('customer_id', targetId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw new Error(error.message)
    return { visits: data || [] }
  }

  // ========== MENU ==========

  async getMenu() {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('available', true)
      .order('category', { ascending: true })

    if (error) throw new Error(error.message)
    return { menuItems: (data || []).map(item => ({ ...item, imageUrl: item.image_url, createdAt: item.created_at, updatedAt: item.updated_at })) }
  }

  async getAllMenuItems() {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('category', { ascending: true })

    if (error) throw new Error(error.message)
    return { menuItems: (data || []).map(item => ({ ...item, imageUrl: item.image_url, createdAt: item.created_at, updatedAt: item.updated_at })) }
  }

  async uploadMenuImage(file: File): Promise<string> {
    const ext = file.name.split('.').pop() || 'png'
    const fileName = `menu-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw new Error('Image upload failed: ' + uploadError.message)

    const { data: urlData } = supabase.storage
      .from('menu-images')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  }

  async deleteMenuImage(imageUrl: string): Promise<void> {
    if (!imageUrl) return
    try {
      // Extract file path from URL
      const url = new URL(imageUrl)
      const pathParts = url.pathname.split('/object/public/menu-images/')
      if (pathParts.length > 1) {
        const filePath = pathParts[1]
        await supabase.storage.from('menu-images').remove([filePath])
      }
    } catch {
      // Ignore errors when deleting old images
    }
  }

  async createMenuItem(data: { name: string; description: string; price: number; category: string; imageUrl?: string }) {
    const { data: result, error } = await supabase.from('menu_items').insert({
      name: data.name,
      description: data.description,
      price: data.price,
      category: data.category,
      image_url: data.imageUrl || '',
    }).select().single()

    if (error) throw new Error(error.message)
    return { menuItem: result }
  }

  async updateMenuItem(id: string, data: any) {
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.price !== undefined) updateData.price = data.price
    if (data.category !== undefined) updateData.category = data.category
    if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl
    if (data.available !== undefined) updateData.available = data.available

    const { data: result, error } = await supabase
      .from('menu_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return { menuItem: result }
  }

  async deleteMenuItem(id: string) {
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { success: true }
  }

  // ========== REWARDS ==========

  async getRewards() {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('available', true)
      .order('points_cost', { ascending: true })

    if (error) throw new Error(error.message)
    return { rewards: (data || []).map(r => ({ ...r, imageUrl: r.image_url, pointsCost: r.points_cost, createdAt: r.created_at, updatedAt: r.updated_at })) }
  }

  async createReward(data: { name: string; description: string; pointsCost: number; imageUrl?: string }) {
    const { data: result, error } = await supabase.from('rewards').insert({
      name: data.name,
      description: data.description,
      points_cost: data.pointsCost,
      image_url: data.imageUrl || '',
    }).select().single()

    if (error) throw new Error(error.message)
    return { reward: result }
  }

  async updateReward(id: string, data: any) {
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.pointsCost !== undefined) updateData.points_cost = data.pointsCost
    if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl
    if (data.available !== undefined) updateData.available = data.available

    const { data: result, error } = await supabase
      .from('rewards')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return { reward: result }
  }

  async deleteReward(id: string) {
    const { error } = await supabase.from('rewards').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { success: true }
  }

  async redeemReward(rewardId: string, customerId?: string) {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Not authenticated')

    const targetId = customerId || authUser.id

    const { data, error } = await supabase.rpc('redeem_reward', {
      p_customer_id: targetId,
      p_reward_id: rewardId,
    })
    if (error) throw new Error(error.message)
    if (data?.error) throw new Error(data.error)
    return data
  }

  // ========== GAMES ==========

  async playGame(gameType: string, winnings: number) {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Not authenticated')

    const { data, error } = await supabase.rpc('play_game', {
      p_customer_id: authUser.id,
      p_game_type: gameType,
      p_winnings: winnings,
    })
    if (error) throw new Error(error.message)
    if (data?.error) throw new Error(data.error)
    return data
  }

  async getGameStatus(gameType: string) {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Not authenticated')

    // Fetch all relevant settings for this game in one round-trip
    const settingKeys = [
      `game_cost_${gameType}`,
      `game_cooldown_${gameType}`,
      `game_tiers_${gameType}`,
    ]
    if (gameType === 'grand_wheel') settingKeys.push('grand_wheel_segments')

    const { data: settingRows } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', settingKeys)

    const settingsMap: Record<string, string> = {}
    for (const row of settingRows || []) {
      settingsMap[row.key] = row.value
    }

    const entryCost = settingsMap[`game_cost_${gameType}`]
      ? parseInt(settingsMap[`game_cost_${gameType}`])
      : (DEFAULT_GAME_COSTS[gameType] ?? 50)

    const cooldownDays = settingsMap[`game_cooldown_${gameType}`]
      ? parseInt(settingsMap[`game_cooldown_${gameType}`])
      : (DEFAULT_GAME_COOLDOWNS[gameType] ?? 7)

    // Parse win tiers (skill games) or wheel segments (grand_wheel)
    let winTiers: WinTier[] = DEFAULT_WIN_TIERS
    let segments: WheelSegment[] = DEFAULT_WHEEL_SEGMENTS
    if (gameType === 'grand_wheel') {
      const raw = settingsMap['grand_wheel_segments']
      const parsed = safeParse<WheelSegment[]>(raw, DEFAULT_WHEEL_SEGMENTS)
      if (parsed.length > 0) segments = normalizeSegments(parsed)
    } else {
      const raw = settingsMap[`game_tiers_${gameType}`]
      const parsed = safeParse<WinTier[]>(raw, DEFAULT_WIN_TIERS)
      if (parsed.length > 0) winTiers = normalizeTiers(parsed)
    }

    // Check last play
    const { data: lastPlay } = await supabase
      .from('game_history')
      .select('played_at')
      .eq('customer_id', authUser.id)
      .eq('game_type', gameType)
      .order('played_at', { ascending: false })
      .limit(1)
      .single()

    let canPlay = true
    let cooldownRemaining = 0

    if (lastPlay) {
      const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000
      const timeSince = Date.now() - new Date(lastPlay.played_at).getTime()
      if (timeSince < cooldownMs) {
        canPlay = false
        cooldownRemaining = cooldownMs - timeSince
      }
    }

    return {
      canPlay,
      entryCost,
      cooldownRemaining,
      lastPlayedAt: lastPlay?.played_at || null,
      winTiers,
      segments,
    }
  }

  async getGameHistory() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('game_history')
      .select('*')
      .eq('customer_id', authUser.id)
      .order('played_at', { ascending: false })
      .limit(50)

    if (error) throw new Error(error.message)
    return { history: (data || []).map(g => ({ ...g, playedAt: g.played_at, entryCost: g.entry_cost })) }
  }

  // ========== SETTINGS ==========

  async getSettings() {
    const { data, error } = await supabase.from('app_settings').select('key, value')
    if (error) throw new Error(error.message)

    const settingsMap: Record<string, string> = {}
    for (const s of data || []) {
      settingsMap[s.key] = s.value
    }
    return { settings: settingsMap }
  }

  async updateSettings(settings: Record<string, string>) {
    for (const [key, value] of Object.entries(settings)) {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key, value }, { onConflict: 'key' })
      if (error) throw new Error(error.message)
    }
    return { success: true }
  }

  // ========== MISSIONS ==========

  async getMissions() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('customer_id', authUser.id)
      .order('completed', { ascending: true })

    if (error) throw new Error(error.message)
    return { missions: data || [] }
  }

  // ========== ADMIN MISSIONS ==========

  async getAllMissions() {
    const { data, error } = await supabase
      .from('missions')
      .select('*, customers(name, phone)')
      .order('completed', { ascending: true })
    if (error) throw new Error(error.message)
    return { missions: data || [] }
  }

  async createMissionForCustomer(customerId: string, data: { type: string; title: string; target: number; points: number }) {
    const { data: mission, error } = await supabase
      .from('missions')
      .insert({
        customer_id: customerId,
        type: data.type,
        title: data.title,
        target: data.target,
        progress: 0,
        points: data.points,
        completed: false,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return { mission }
  }

  async createMissionForAllCustomers(data: { type: string; title: string; target: number; points: number }) {
    // Get all customers
    const { data: customers, error: custError } = await supabase
      .from('customers')
      .select('id')
      .eq('role', 'customer')
    if (custError) throw new Error(custError.message)

    const missions = (customers || []).map(c => ({
      customer_id: c.id,
      type: data.type,
      title: data.title,
      target: data.target,
      progress: 0,
      points: data.points,
      completed: false,
    }))

    const { error } = await supabase.from('missions').insert(missions)
    if (error) throw new Error(error.message)
    return { count: missions.length }
  }

  async deleteMission(missionId: string) {
    const { error } = await supabase.from('missions').delete().eq('id', missionId)
    if (error) throw new Error(error.message)
    return { success: true }
  }

  async updateMission(missionId: string, data: { title?: string; target?: number; points?: number; progress?: number }) {
    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.target !== undefined) updateData.target = data.target
    if (data.points !== undefined) updateData.points = data.points
    if (data.progress !== undefined) updateData.progress = data.progress

    const { data: result, error } = await supabase
      .from('missions')
      .update(updateData)
      .eq('id', missionId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return { mission: result }
  }

  // ========== DAILY SIGN-IN ==========

  async getDailySignInStatus() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Not authenticated')

    // Get today's sign-in record
    const today = new Date().toISOString().split('T')[0]
    const { data: todayRecord } = await supabase
      .from('daily_sign_ins')
      .select('*')
      .eq('customer_id', authUser.id)
      .eq('sign_in_date', today)
      .single()

    // Get recent sign-ins for streak calculation
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const { data: recentSignIns } = await supabase
      .from('daily_sign_ins')
      .select('sign_in_date')
      .eq('customer_id', authUser.id)
      .gte('sign_in_date', sevenDaysAgo.toISOString().split('T')[0])
      .order('sign_in_date', { ascending: false })

    // Calculate streak
    let streak = 0
    if (recentSignIns && recentSignIns.length > 0) {
      const sorted = [...recentSignIns].sort((a, b) => new Date(b.sign_in_date).getTime() - new Date(a.sign_in_date).getTime())
      const checkDate = new Date()
      // If already signed in today, start from today; otherwise from yesterday
      if (todayRecord) {
        streak = 1
        checkDate.setDate(checkDate.getDate() - 1)
      }
      for (const record of sorted) {
        const recordDate = new Date(record.sign_in_date)
        const expectedDate = checkDate.toISOString().split('T')[0]
        const recordDateStr = record.sign_in_date
        if (recordDateStr === expectedDate && recordDateStr !== today) {
          streak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else if (recordDateStr !== today && recordDateStr !== expectedDate) {
          break
        }
      }
    }

    // Get points amount from settings
    const { data: pointsSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'daily_sign_in_points')
      .single()
    const pointsAwarded = pointsSetting ? parseInt(pointsSetting.value) : 5

    return {
      claimedToday: !!todayRecord,
      streak,
      pointsAwarded,
      lastSignInDate: todayRecord?.created_at || null,
    }
  }

  async claimDailySignIn() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Not authenticated')

    const { data, error } = await supabase.rpc('claim_daily_sign_in', {
      p_customer_id: authUser.id,
    })
    if (error) throw new Error(error.message)
    if (data?.error) throw new Error(data.error)
    return data
  }

  // ========== ADMIN ==========

  async getAnalytics() {
    const [usersResult, visitsResult, redemptionsResult, gamesResult, settingsResult] = await Promise.all([
      supabase.from('customers').select('points, role'),
      supabase.from('visits').select('id, created_at'),
      supabase.from('reward_redemptions').select('points_cost'),
      supabase.from('game_history').select('game_type, entry_cost, winnings'),
      supabase.from('app_settings').select('key, value'),
    ])

    const allUsers = usersResult.data || []
    const allVisits = visitsResult.data || []
    const allRedemptions = redemptionsResult.data || []
    const allGames = gamesResult.data || []

    const totalUsers = allUsers.filter(u => u.role === 'customer').length
    const totalEmployees = allUsers.filter(u => u.role === 'employee').length
    const pointsInCirculation = allUsers.filter(u => u.role === 'customer').reduce((sum, u) => sum + (u.points || 0), 0)
    const totalVisits = allVisits.length
    const totalRedemptions = allRedemptions.length
    const totalRedemptionPoints = allRedemptions.reduce((sum, r) => sum + r.points_cost, 0)
    const totalGamesPlayed = allGames.length
    const totalGameWinnings = allGames.reduce((sum, g) => sum + g.winnings, 0)
    const totalGameCosts = allGames.reduce((sum, g) => sum + g.entry_cost, 0)

    // Game distribution
    const gameDistribution: Record<string, number> = {}
    for (const g of allGames) {
      gameDistribution[g.game_type] = (gameDistribution[g.game_type] || 0) + 1
    }

    // Recent visits (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentVisits = allVisits.filter(v => new Date(v.created_at) >= sevenDaysAgo)

    return {
      totalUsers,
      totalEmployees,
      pointsInCirculation,
      totalVisits,
      totalRedemptions,
      totalRedemptionPoints,
      totalGamesPlayed,
      totalGameWinnings,
      totalGameCosts,
      recentVisits,
      gameDistribution,
    }
  }

  // ========== EMPLOYEE ==========

  async searchCustomer(phone: string) {
    // Find customer by phone
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .single()

    if (customerError || !customer) throw new Error('Customer not found')

    // Get their visits separately
    const { data: visits } = await supabase
      .from('visits')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get their missions
    const { data: missions } = await supabase
      .from('missions')
      .select('*')
      .eq('customer_id', customer.id)

    return {
      customer: {
        ...customer,
        visits: visits || [],
        missions: missions || [],
      }
    }
  }

  // ========== SEED (not available with Supabase - use SQL) ==========

  async seedDatabase() {
    throw new Error('Seeding is done via Supabase SQL Editor. Run supabase/schema.sql and supabase/seed.sql')
  }
}

export const api = new ApiClient()
