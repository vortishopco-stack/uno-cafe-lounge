import { supabase, phoneToEmail } from '@/lib/supabase'

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

    // If no profile exists, auto-create one (approved — backward compat)
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
        status: 'approved',
      }
      const { data: created, error: createError } = await supabase
        .from('customers')
        .insert(newProfile)
        .select()
        .single()

      if (createError) throw new Error('Failed to create profile: ' + createError.message)
      return { user: created, token: data.session?.access_token || '' }
    }

    // Signup-approval workflow: block pending / rejected users
    const status = profile.status || 'approved'
    if (status === 'pending') {
      await supabase.auth.signOut()
      const e = new Error('ACCOUNT_PENDING') as any
      e.code = 'ACCOUNT_PENDING'
      throw e
    }
    if (status === 'rejected') {
      await supabase.auth.signOut()
      const e = new Error('ACCOUNT_REJECTED') as any
      e.code = 'ACCOUNT_REJECTED'
      throw e
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
    // Customer signups are created as PENDING and must be approved by staff.
    // (Admin/employee roles are only created via SQL and stay 'approved'.)
    const isStaffRole = role === 'admin' || role === 'employee'
    const { error: profileError } = await supabase.from('customers').insert({
      id: userId,
      phone,
      email,
      name,
      role,
      points: isStaffRole ? 99999 : 100,
      status: isStaffRole ? 'approved' : 'pending',
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

    // Pending customers must NOT be auto-logged-in. Sign them out and
    // signal the UI to show the "awaiting approval" screen.
    if (!isStaffRole && profile?.status === 'pending') {
      await supabase.auth.signOut()
      const e = new Error('SIGNUP_PENDING') as any
      e.code = 'SIGNUP_PENDING'
      throw e
    }

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
    // Fetch menu items + categories in parallel so the customer view can:
    //   - filter items to only those in VISIBLE categories
    //   - render the filter bar using configured sort_order / display_name
    const [itemsResult, categoriesResult] = await Promise.all([
      supabase
        .from('menu_items')
        .select('*')
        .eq('available', true)
        .order('category', { ascending: true }),
      supabase
        .from('menu_categories')
        .select('*')
        .order('sort_order', { ascending: true }),
    ])

    if (itemsResult.error) throw new Error(itemsResult.error.message)
    // Categories table is optional for backward compatibility — fall back to empty list
    if (categoriesResult.error) {
      console.warn('menu_categories fetch failed:', categoriesResult.error.message)
    }

    const categories = (categoriesResult.data || []).map(c => ({
      ...c,
      displayName: c.display_name,
      sortOrder: c.sort_order,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }))

    // If we have category config, hide items whose category is configured as not visible.
    // Items whose category isn't in the table at all are still shown (backward compat).
    const hiddenNames = new Set(
      categories.filter(c => c.visible === false).map(c => c.name)
    )

    const menuItems = (itemsResult.data || [])
      .filter(item => !hiddenNames.has(item.category))
      .map(item => ({ ...item, imageUrl: item.image_url, createdAt: item.created_at, updatedAt: item.updated_at }))

    return { menuItems, categories }
  }

  async getAllMenuItems() {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('category', { ascending: true })

    if (error) throw new Error(error.message)
    return { menuItems: (data || []).map(item => ({ ...item, imageUrl: item.image_url, createdAt: item.created_at, updatedAt: item.updated_at })) }
  }

  // ========== MENU CATEGORIES ==========

  // Public: list all categories sorted by sort_order (used by admin + customer views)
  async getMenuCategories() {
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw new Error(error.message)
    return {
      categories: (data || []).map(c => ({
        ...c,
        displayName: c.display_name,
        sortOrder: c.sort_order,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    }
  }

  async createMenuCategory(data: {
    name: string
    displayName: string
    icon?: string
    color?: string
    visible?: boolean
    sortOrder?: number
  }) {
    const { data: result, error } = await supabase
      .from('menu_categories')
      .insert({
        name: data.name.trim(),
        display_name: data.displayName.trim() || data.name.trim(),
        icon: data.icon || 'UtensilsCrossed',
        color: data.color || 'from-amber-500/20 to-orange-500/20',
        visible: data.visible !== undefined ? data.visible : true,
        sort_order: data.sortOrder !== undefined ? data.sortOrder : 999,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return { category: result }
  }

  async updateMenuCategory(id: string, data: {
    name?: string
    displayName?: string
    icon?: string
    color?: string
    visible?: boolean
    sortOrder?: number
  }) {
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.displayName !== undefined) updateData.display_name = data.displayName.trim()
    if (data.icon !== undefined) updateData.icon = data.icon
    if (data.color !== undefined) updateData.color = data.color
    if (data.visible !== undefined) updateData.visible = data.visible
    if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder

    const { data: result, error } = await supabase
      .from('menu_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return { category: result }
  }

  async deleteMenuCategory(id: string) {
    const { error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
    return { success: true }
  }

  // Reorder categories by passing the full ordered list of ids.
  // Writes the new sort_order for each row.
  async reorderMenuCategories(orderedIds: string[]) {
    const updates = orderedIds.map((id, idx) =>
      supabase
        .from('menu_categories')
        .update({ sort_order: idx, updated_at: new Date().toISOString() })
        .eq('id', id)
    )
    const results = await Promise.all(updates)
    const failed = results.find(r => r.error)
    if (failed?.error) throw new Error(failed.error.message)
    return { success: true }
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

    // Get game cost from settings
    const { data: costSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', `game_cost_${gameType}`)
      .single()

    const defaultCosts: Record<string, number> = {
      burger_catch: 50,
      coffee_shooter: 50,
      grand_wheel: 100,
      predict_match: 60,
      shoot_target: 60,
      lucky_scratch: 40,
    }
    const entryCost = costSetting ? parseInt(costSetting.value) : defaultCosts[gameType] || 50

    // Get cooldown from settings
    const { data: cooldownSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', `game_cooldown_${gameType}`)
      .single()

    const defaultCooldowns: Record<string, number> = {
      burger_catch: 7,
      coffee_shooter: 7,
      grand_wheel: 30,
      predict_match: 7,
      shoot_target: 7,
      lucky_scratch: 3,
    }
    const cooldownDays = cooldownSetting ? parseInt(cooldownSetting.value) : defaultCooldowns[gameType] || 7

    // Get visibility (hide/show) from settings — default to enabled (visible)
    const { data: enabledSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', `game_enabled_${gameType}`)
      .single()
    const enabled = enabledSetting ? enabledSetting.value !== 'false' : true

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

    return { canPlay, entryCost, cooldownRemaining, lastPlayedAt: lastPlay?.played_at || null, enabled }
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

  // ========== SIGNUP APPROVALS ==========

  // List customers awaiting staff approval (newest first)
  async getPendingApprovals() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return { customers: data || [] }
  }

  // Approve a pending customer (staff/admin via RPC)
  async approveCustomer(customerId: string) {
    const { data, error } = await supabase.rpc('set_customer_status', {
      p_customer_id: customerId,
      p_status: 'approved',
    })
    if (error) throw new Error(error.message)
    if (data?.error) throw new Error(data.error)
    return data
  }

  // Reject a pending customer (staff/admin via RPC)
  async rejectCustomer(customerId: string) {
    const { data, error } = await supabase.rpc('set_customer_status', {
      p_customer_id: customerId,
      p_status: 'rejected',
    })
    if (error) throw new Error(error.message)
    if (data?.error) throw new Error(data.error)
    return data
  }

  // ========== SEED (not available with Supabase - use SQL) ==========

  async seedDatabase() {
    throw new Error('Seeding is done via Supabase SQL Editor. Run supabase/schema.sql and supabase/seed.sql')
  }
}

export const api = new ApiClient()
