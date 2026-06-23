'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { useAppStore, type AdminView } from '@/store/app-store'
import { api, DEFAULT_WIN_TIERS, DEFAULT_WHEEL_SEGMENTS, type WinTier, type WheelSegment } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useT } from '@/lib/i18n'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  BarChart3, Settings, UtensilsCrossed, Gift, Users, Coins,
  TrendingUp, Gamepad2, LogOut, Plus, Trash2, Edit3, Save, X,
  ShoppingBag, Award, Target, UsersRound, Zap, ImagePlus, Upload, Eye, EyeOff,
  RotateCcw, CircleDot as CircleDotIcon
} from 'lucide-react'
import { toast } from 'sonner'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

const CHART_COLORS = ['#8b5cf6', '#a855f7', '#c084fc', '#ec4899', '#f59e0b', '#6366f1']

const GAME_INFO: Record<string, { label: string; icon: string; color: string }> = {
  burger_catch: { label: 'Burger Catch', icon: '🍔', color: 'from-amber-500/20 to-orange-500/20' },
  coffee_shooter: { label: 'Coffee Shooter', icon: '☕', color: 'from-brown-500/20 to-amber-500/20' },
  grand_wheel: { label: 'Grand Wheel', icon: '🎰', color: 'from-purple-500/20 to-pink-500/20' },
}

export function AdminDashboard() {
  const { t } = useT()
  const { logout } = useAuthStore()
  const { adminView, setAdminView } = useAppStore()
  const [analytics, setAnalytics] = useState<any>(null)
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [rewards, setRewards] = useState<any[]>([])
  const [allMissions, setAllMissions] = useState<any[]>([])
  const [allCustomers, setAllCustomers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Edit states
  const [editingMenuItem, setEditingMenuItem] = useState<string | null>(null)
  const [editingReward, setEditingReward] = useState<string | null>(null)
  const [newMenuItem, setNewMenuItem] = useState({ name: '', description: '', price: '', category: 'Main', imageUrl: '' })
  const [newMenuImageFile, setNewMenuImageFile] = useState<File | null>(null)
  const [editingMenuItemId, setEditingMenuItemId] = useState<string | null>(null)
  const menuImageInputRef = useRef<HTMLInputElement>(null)
  const editMenuImageInputRef = useRef<HTMLInputElement>(null)
  const [newReward, setNewReward] = useState({ name: '', description: '', pointsCost: '' })
  const [newMission, setNewMission] = useState({ type: 'custom', title: '', target: '', points: '', forAll: true, customerId: '' })
  const [editingMission, setEditingMission] = useState<string | null>(null)
  const [editMissionData, setEditMissionData] = useState({ title: '', target: '', points: '' })

  // Game winnings config: per-game win tiers (skill games) + wheel segments (grand_wheel)
  const [winTiers, setWinTiers] = useState<Record<string, WinTier[]>>({
    burger_catch: [...DEFAULT_WIN_TIERS],
    coffee_shooter: [...DEFAULT_WIN_TIERS],
  })
  const [wheelSegments, setWheelSegments] = useState<WheelSegment[]>([...DEFAULT_WHEEL_SEGMENTS])

  const adminNavItems: { key: AdminView; label: string; icon: any }[] = [
    { key: 'analytics', label: t('analytics'), icon: BarChart3 },
    { key: 'settings', label: t('settings'), icon: Settings },
    { key: 'menu', label: t('menuManagement'), icon: UtensilsCrossed },
    { key: 'rewards', label: t('rewardManagement'), icon: Gift },
    { key: 'missions', label: t('missionManagement'), icon: Target },
  ]

  const fetchData = useCallback(async () => {
    try {
      const [analyticsData, settingsData, menuData, rewardsData] = await Promise.all([
        api.getAnalytics(),
        api.getSettings(),
        api.getAllMenuItems(),
        api.getRewards(),
      ])
      setAnalytics(analyticsData)
      setSettings(settingsData.settings)
      setMenuItems(menuData.menuItems)
      setRewards(rewardsData.rewards)

      // Parse game winnings config from settings (with safe fallbacks)
      const parseTiers = (raw: string | undefined, fallback: WinTier[]): WinTier[] => {
        if (!raw) return [...fallback]
        try {
          const parsed = JSON.parse(raw)
          return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...fallback]
        } catch {
          return [...fallback]
        }
      }
      const parseSegments = (raw: string | undefined): WheelSegment[] => {
        if (!raw) return [...DEFAULT_WHEEL_SEGMENTS]
        try {
          const parsed = JSON.parse(raw)
          return Array.isArray(parsed) && parsed.length >= 2 ? parsed : [...DEFAULT_WHEEL_SEGMENTS]
        } catch {
          return [...DEFAULT_WHEEL_SEGMENTS]
        }
      }
      setWinTiers({
        burger_catch: parseTiers(settingsData.settings['game_tiers_burger_catch'], DEFAULT_WIN_TIERS),
        coffee_shooter: parseTiers(settingsData.settings['game_tiers_coffee_shooter'], DEFAULT_WIN_TIERS),
      })
      setWheelSegments(parseSegments(settingsData.settings['grand_wheel_segments']))
    } catch (error) {
      console.error('Failed to fetch admin data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchMissions = useCallback(async () => {
    try {
      const [missionsData, customersData] = await Promise.all([
        api.getAllMissions(),
        supabase.from('customers').select('id, name, phone, role').eq('role', 'customer'),
      ])
      setAllMissions(missionsData.missions)
      setAllCustomers(customersData.data || [])
    } catch (error) {
      console.error('Failed to fetch missions:', error)
    }
  }, [])

  useEffect(() => {
    fetchData()
    fetchMissions()
  }, [fetchData, fetchMissions])

  // Need supabase for direct customer query

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      // Serialize game winnings config into the settings map before saving
      const settingsToSave: Record<string, string> = {
        ...settings,
        game_tiers_burger_catch: JSON.stringify(winTiers.burger_catch || []),
        game_tiers_coffee_shooter: JSON.stringify(winTiers.coffee_shooter || []),
        grand_wheel_segments: JSON.stringify(wheelSegments || []),
      }
      await api.updateSettings(settingsToSave)
      toast.success(t('settingsSaved'))
    } catch (error: any) {
      toast.error(error.message || t('failedToSaveSettings'))
    } finally {
      setIsSaving(false)
    }
  }

  // ========== GAME WINNINGS CONFIG HELPERS ==========
  type SkillGame = 'burger_catch' | 'coffee_shooter'

  const updateTier = (game: SkillGame, index: number, field: 'minScore' | 'reward', value: number) => {
    setWinTiers(prev => {
      const list = [...(prev[game] || [])]
      list[index] = { ...list[index], [field]: Math.max(0, Math.floor(value || 0)) }
      return { ...prev, [game]: list }
    })
  }

  const addTier = (game: SkillGame) => {
    setWinTiers(prev => ({
      ...prev,
      [game]: [...(prev[game] || []), { minScore: 0, reward: 0 }],
    }))
  }

  const removeTier = (game: SkillGame, index: number) => {
    setWinTiers(prev => ({
      ...prev,
      [game]: (prev[game] || []).filter((_, i) => i !== index),
    }))
  }

  const resetTiers = (game: SkillGame) => {
    setWinTiers(prev => ({ ...prev, [game]: [...DEFAULT_WIN_TIERS] }))
    toast.success(t('resetToDefault'))
  }

  const updateSegment = (index: number, field: 'label' | 'value' | 'color', value: string) => {
    setWheelSegments(prev => {
      const next = [...prev]
      if (field === 'value') {
        next[index] = { ...next[index], value: Math.max(0, Math.floor(Number(value) || 0)) }
      } else {
        next[index] = { ...next[index], [field]: value }
      }
      return next
    })
  }

  const addSegment = () => {
    setWheelSegments(prev => [...prev, { label: '0', value: 0, color: '#7c3aed' }])
  }

  const removeSegment = (index: number) => {
    setWheelSegments(prev => prev.length <= 2 ? prev : prev.filter((_, i) => i !== index))
  }

  const resetSegments = () => {
    setWheelSegments([...DEFAULT_WHEEL_SEGMENTS])
    toast.success(t('resetToDefault'))
  }

  const handleCreateMenuItem = async () => {
    if (!newMenuItem.name || !newMenuItem.price) {
      toast.error(t('nameAndPriceRequired'))
      return
    }
    try {
      let imageUrl = newMenuItem.imageUrl
      if (newMenuImageFile) {
        imageUrl = await api.uploadMenuImage(newMenuImageFile)
      }
      await api.createMenuItem({
        name: newMenuItem.name,
        description: newMenuItem.description,
        price: parseFloat(newMenuItem.price),
        category: newMenuItem.category,
        imageUrl,
      })
      setNewMenuItem({ name: '', description: '', price: '', category: 'Main', imageUrl: '' })
      setNewMenuImageFile(null)
      toast.success(t('menuItemCreated'))
      fetchData()
    } catch (error: any) {
      toast.error(error.message || t('failedToCreateMenuItem'))
    }
  }

  const handleDeleteMenuItem = async (id: string) => {
    try {
      const item = menuItems.find(i => i.id === id)
      if (item?.imageUrl) {
        await api.deleteMenuImage(item.imageUrl)
      }
      await api.deleteMenuItem(id)
      toast.success(t('menuItemDeleted'))
      fetchData()
    } catch (error: any) {
      toast.error(error.message || t('failedToDelete'))
    }
  }

  const handleUpdateMenuItemImage = async (id: string, file: File) => {
    try {
      const item = menuItems.find(i => i.id === id)
      if (item?.imageUrl) {
        await api.deleteMenuImage(item.imageUrl)
      }
      const imageUrl = await api.uploadMenuImage(file)
      await api.updateMenuItem(id, { imageUrl })
      setEditingMenuItemId(null)
      toast.success(t('imageUpdated'))
      fetchData()
    } catch (error: any) {
      toast.error(error.message || t('failedToUploadImage'))
    }
  }

  const handleToggleMenuItemAvailability = async (id: string, currentAvailable: boolean) => {
    try {
      await api.updateMenuItem(id, { available: !currentAvailable })
      toast.success(!currentAvailable ? t('itemNowAvailable') : t('itemNowHidden'))
      fetchData()
    } catch (error: any) {
      toast.error(error.message || t('failedToUpdate'))
    }
  }

  const handleCreateReward = async () => {
    if (!newReward.name || !newReward.pointsCost) {
      toast.error(t('nameAndPointsCostRequired'))
      return
    }
    try {
      await api.createReward({
        name: newReward.name,
        description: newReward.description,
        pointsCost: parseInt(newReward.pointsCost),
      })
      setNewReward({ name: '', description: '', pointsCost: '' })
      toast.success(t('rewardCreated'))
      fetchData()
    } catch (error: any) {
      toast.error(error.message || t('failedToCreateReward'))
    }
  }

  const handleDeleteReward = async (id: string) => {
    try {
      await api.deleteReward(id)
      toast.success(t('rewardDeleted'))
      fetchData()
    } catch (error: any) {
      toast.error(error.message || t('failedToDelete'))
    }
  }

  const handleCreateMission = async () => {
    if (!newMission.title || !newMission.target || !newMission.points) {
      toast.error(t('titleTargetPointsRequired'))
      return
    }
    try {
      const missionData = {
        type: newMission.type,
        title: newMission.title,
        target: parseInt(newMission.target),
        points: parseInt(newMission.points),
      }

      if (newMission.forAll) {
        const result = await api.createMissionForAllCustomers(missionData)
        toast.success(t('missionCreatedFor', { count: result.count }))
      } else {
        if (!newMission.customerId) {
          toast.error(t('selectACustomer'))
          return
        }
        await api.createMissionForCustomer(newMission.customerId, missionData)
        toast.success(t('missionCreated'))
      }
      setNewMission({ type: 'custom', title: '', target: '', points: '', forAll: true, customerId: '' })
      fetchMissions()
    } catch (error: any) {
      toast.error(error.message || t('failedToCreateMission'))
    }
  }

  const handleDeleteMission = async (id: string) => {
    try {
      await api.deleteMission(id)
      toast.success(t('missionDeleted'))
      fetchMissions()
    } catch (error: any) {
      toast.error(error.message || t('failedToDeleteMission'))
    }
  }

  const handleEditMission = async (id: string) => {
    try {
      await api.updateMission(id, {
        title: editMissionData.title || undefined,
        target: editMissionData.target ? parseInt(editMissionData.target) : undefined,
        points: editMissionData.points ? parseInt(editMissionData.points) : undefined,
      })
      toast.success(t('missionUpdated'))
      setEditingMission(null)
      fetchMissions()
    } catch (error: any) {
      toast.error(error.message || t('failedToUpdateMission'))
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-main flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    )
  }

  const renderAnalytics = () => {
    if (!analytics) return null

    const visitData: any[] = []
    const dayMap: Record<string, number> = {}
    for (const v of analytics.recentVisits || []) {
      const day = new Date(v.createdAt || v.created_at).toLocaleDateString('en-US', { weekday: 'short' })
      dayMap[day] = (dayMap[day] || 0) + 1
    }
    for (const [day, count] of Object.entries(dayMap)) {
      visitData.push({ name: day, visits: count })
    }
    if (visitData.length === 0) {
      visitData.push({ name: 'Mon', visits: 0 }, { name: 'Tue', visits: 0 }, { name: 'Wed', visits: 3 })
    }

    const gameData = Object.entries(analytics.gameDistribution || {}).map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value: value as number,
    }))
    if (gameData.length === 0) {
      gameData.push({ name: 'burger catch', value: 5 }, { name: 'coffee shooter', value: 3 }, { name: 'grand wheel', value: 2 })
    }

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          {t('analytics')}
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t('totalUsers'), value: analytics.totalUsers, icon: Users, color: 'from-purple-500/20 to-indigo-500/20', textColor: 'text-purple-400' },
            { label: t('pointsInCirculation'), value: analytics.pointsInCirculation?.toLocaleString(), icon: Coins, color: 'from-yellow-500/20 to-amber-500/20', textColor: 'text-yellow-400' },
            { label: t('totalVisits'), value: analytics.totalVisits, icon: ShoppingBag, color: 'from-emerald-500/20 to-teal-500/20', textColor: 'text-emerald-400' },
            { label: t('gamesPlayed'), value: analytics.totalGamesPlayed, icon: Gamepad2, color: 'from-pink-500/20 to-rose-500/20', textColor: 'text-pink-400' },
          ].map(stat => (
            <Card key={stat.label} className="glass-card border-0">
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-2`}>
                  <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('visitsLast7Days')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={visitData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(15,12,41,0.95)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px' }}
                    labelStyle={{ color: '#a855f7' }}
                  />
                  <Bar dataKey="visits" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('gameDistribution')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={gameData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {gameData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'rgba(15,12,41,0.95)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="glass-card border-0">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{t('totalRedemptions')}</p>
              <p className="text-2xl font-bold text-pink-400">{analytics.totalRedemptions}</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-0">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{t('pointsRedeemed')}</p>
              <p className="text-2xl font-bold text-orange-400">{analytics.totalRedemptionPoints?.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-0">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{t('netGameRevenue')}</p>
              <p className="text-2xl font-bold text-emerald-400">{(analytics.totalGameCosts - analytics.totalGameWinnings)?.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const renderSettings = () => {
    // Skill games get a win-tier editor; wheel gets a segment editor.
    const skillGames: SkillGame[] = ['burger_catch', 'coffee_shooter']

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Settings className="w-5 h-5 text-purple-400" />
          {t('settings')}
        </h2>

        {/* Points & Currency */}
        <Card className="glass-card border-0">
          <CardContent className="p-6 space-y-6">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-400" />
              {t('pointsSystem')}
            </h3>
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t('pointsPerDollar')}</Label>
              <Input
                type="number"
                value={settings.points_per_currency || '1'}
                onChange={e => setSettings(prev => ({ ...prev, points_per_currency: e.target.value }))}
                className="glass-input h-11"
              />
            </div>
          </CardContent>
        </Card>

        {/* Game Settings (entry cost + cooldown) */}
        <Card className="glass-card border-0">
          <CardContent className="p-6 space-y-6">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-purple-400" />
              {t('gameSettings')}
            </h3>

            {['burger_catch', 'coffee_shooter', 'grand_wheel'].map(game => {
              const info = GAME_INFO[game]
              return (
                <div key={game} className="glass-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{info?.icon || '🎮'}</span>
                    <h4 className="font-semibold text-sm">{info?.label || game}</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('entryCostPts')}</Label>
                      <Input
                        type="number"
                        value={settings[`game_cost_${game}`] || ''}
                        onChange={e => setSettings(prev => ({ ...prev, [`game_cost_${game}`]: e.target.value }))}
                        className="glass-input h-10"
                        placeholder="50"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('cooldownDays')}</Label>
                      <Input
                        type="number"
                        value={settings[`game_cooldown_${game}`] || ''}
                        onChange={e => setSettings(prev => ({ ...prev, [`game_cooldown_${game}`]: e.target.value }))}
                        className="glass-input h-10"
                        placeholder="7"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground/80">
                    {t('winningsConfigHint')}
                  </p>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Game Winnings Configuration — skill games (win tiers) */}
        <Card className="glass-card border-0">
          <CardContent className="p-6 space-y-6">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              {t('gameWinningsConfig')}
            </h3>
            <p className="text-xs text-muted-foreground/80">{t('winningsConfigDesc')}</p>

            {skillGames.map(game => {
              const info = GAME_INFO[game]
              const tiers = [...(winTiers[game] || [])].sort((a, b) => b.minScore - a.minScore)
              return (
                <div key={game} className="glass-card p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{info?.icon || '🎮'}</span>
                      <h4 className="font-semibold text-sm">{info?.label || game}</h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resetTiers(game)}
                      className="h-8 text-xs text-muted-foreground hover:text-white"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      {t('resetToDefault')}
                    </Button>
                  </div>

                  {/* Tier table */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-[11px] font-semibold text-muted-foreground px-1">
                      <span>{t('minScore')}</span>
                      <span>{t('rewardPts')}</span>
                      <span className="w-8" />
                    </div>
                    <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                      {tiers.map((tier, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                          <Input
                            type="number"
                            min={0}
                            value={tier.minScore}
                            onChange={e => updateTier(game, idx, 'minScore', Number(e.target.value))}
                            className="glass-input h-9"
                            placeholder="100"
                          />
                          <Input
                            type="number"
                            min={0}
                            value={tier.reward}
                            onChange={e => updateTier(game, idx, 'reward', Number(e.target.value))}
                            className="glass-input h-9"
                            placeholder="200"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTier(game, idx)}
                            className="h-9 w-9 text-muted-foreground hover:text-red-400 shrink-0"
                            disabled={tiers.length <= 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addTier(game)}
                    className="w-full h-9 border-dashed text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {t('addTier')}
                  </Button>

                  <p className="text-[11px] text-muted-foreground/80">{t('tierEvalDesc')}</p>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Grand Wheel Segments Editor — labels, values, colors */}
        <Card className="glass-card border-0">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <CircleDotIcon className="w-4 h-4 text-pink-400" />
                {t('wheelSegmentsTitle')}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetSegments}
                className="h-8 text-xs text-muted-foreground hover:text-white"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                {t('resetToDefault')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground/80">{t('wheelSegmentsDesc')}</p>

            <div className="space-y-2">
              <div className="grid grid-cols-[auto_1fr_1fr_2fr_auto] gap-2 text-[11px] font-semibold text-muted-foreground px-1">
                <span className="w-8">#</span>
                <span>{t('segmentLabel')}</span>
                <span>{t('segmentValue')}</span>
                <span>{t('segmentColor')}</span>
                <span className="w-8" />
              </div>
              <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {wheelSegments.map((seg, idx) => (
                  <div key={idx} className="grid grid-cols-[auto_1fr_1fr_2fr_auto] gap-2 items-center">
                    <span className="text-xs text-muted-foreground w-8 text-center">{idx + 1}</span>
                    <Input
                      type="text"
                      value={seg.label}
                      onChange={e => updateSegment(idx, 'label', e.target.value)}
                      className="glass-input h-9"
                      placeholder="0"
                      maxLength={12}
                    />
                    <Input
                      type="number"
                      min={0}
                      value={seg.value}
                      onChange={e => updateSegment(idx, 'value', e.target.value)}
                      className="glass-input h-9"
                      placeholder="50"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={seg.color}
                        onChange={e => updateSegment(idx, 'color', e.target.value)}
                        className="h-9 w-10 rounded-md border border-white/10 bg-transparent cursor-pointer shrink-0"
                        aria-label={t('segmentColor')}
                      />
                      <Input
                        type="text"
                        value={seg.color}
                        onChange={e => updateSegment(idx, 'color', e.target.value)}
                        className="glass-input h-9 text-xs"
                        placeholder="#7c3aed"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSegment(idx)}
                      className="h-9 w-9 text-muted-foreground hover:text-red-400 shrink-0"
                      disabled={wheelSegments.length <= 2}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={addSegment}
              className="w-full h-9 border-dashed text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              {t('addSegment')}
            </Button>

            {/* Live preview swatches */}
            <div className="glass-card p-3 space-y-2">
              <p className="text-[11px] text-muted-foreground">{t('livePreview')}</p>
              <div className="flex flex-wrap gap-1.5">
                {wheelSegments.map((seg, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs"
                    style={{ backgroundColor: seg.color + '33', border: `1px solid ${seg.color}` }}
                  >
                    <span
                      className="w-3 h-3 rounded-sm inline-block"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="font-medium">{seg.label}</span>
                    <span className="text-muted-foreground">({seg.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSaveSettings} disabled={isSaving} className="glass-button w-full h-12">
          {isSaving ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t('saving')}
            </div>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {t('saveAllSettings')}
            </>
          )}
        </Button>
      </div>
    )
  }

  const renderMenuManagement = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <UtensilsCrossed className="w-5 h-5 text-purple-400" />
        {t('menuManagement')}
      </h2>

      {/* Add Menu Item Form */}
      <Card className="glass-card border-0">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4 text-green-400" />
            {t('addMenuItem')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder={t('name')}
              value={newMenuItem.name}
              onChange={e => setNewMenuItem(prev => ({ ...prev, name: e.target.value }))}
              className="glass-input h-10"
            />
            <Input
              placeholder={t('price')}
              type="number"
              value={newMenuItem.price}
              onChange={e => setNewMenuItem(prev => ({ ...prev, price: e.target.value }))}
              className="glass-input h-10"
            />
          </div>
          <Input
            placeholder={t('description')}
            value={newMenuItem.description}
            onChange={e => setNewMenuItem(prev => ({ ...prev, description: e.target.value }))}
            className="glass-input h-10"
          />
          <div className="flex gap-3">
            <select
              value={newMenuItem.category}
              onChange={e => setNewMenuItem(prev => ({ ...prev, category: e.target.value }))}
              className="glass-input h-10 px-3 flex-1"
            >
              {['Main', 'Burgers', 'Coffee', 'Salads', 'Sides', 'Desserts'].map(c => (
                <option key={c} value={c} className="bg-gray-900">{c}</option>
              ))}
            </select>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t('itemImage')}</Label>
            <input
              ref={menuImageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) {
                  setNewMenuImageFile(file)
                  const reader = new FileReader()
                  reader.onloadend = () => {
                    setNewMenuItem(prev => ({ ...prev, imageUrl: reader.result as string }))
                  }
                  reader.readAsDataURL(file)
                }
              }}
            />
            <div
              className="border-2 border-dashed border-white/10 rounded-xl p-3 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-purple-500/30 transition-colors"
              onClick={() => menuImageInputRef.current?.click()}
            >
              {newMenuItem.imageUrl ? (
                <div className="relative w-full">
                  <img
                    src={newMenuItem.imageUrl}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-1 hover:bg-black/80"
                    onClick={e => {
                      e.stopPropagation()
                      setNewMenuItem(prev => ({ ...prev, imageUrl: '' }))
                      setNewMenuImageFile(null)
                      if (menuImageInputRef.current) menuImageInputRef.current.value = ''
                    }}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <>
                  <ImagePlus className="w-8 h-8 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{t('clickToUploadImage')}</p>
                  <p className="text-[10px] text-muted-foreground/60">PNG, JPG, WebP (max 5MB)</p>
                </>
              )}
            </div>
          </div>

          <Button onClick={handleCreateMenuItem} className="glass-button-success h-10 w-full">
            <Plus className="w-4 h-4 mr-2" />
            {t('addMenuItem')}
          </Button>
        </CardContent>
      </Card>

      {/* Menu Items List */}
      <ScrollArea className="max-h-[600px]">
        <div className="space-y-3">
          {menuItems.map(item => (
            <Card key={item.id} className={`glass-card border-0 ${!item.available ? 'opacity-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Item Image */}
                  <div className="relative shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center">
                        <ImagePlus className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                    )}
                    {!item.available && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <EyeOff className="w-5 h-5 text-white/60" />
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm truncate">{item.name}</h4>
                      <Badge variant="outline" className="text-[10px] shrink-0 border-purple-500/30 text-purple-400">
                        {item.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                    <p className="text-sm font-bold text-green-400 mt-1">${item.price.toFixed(2)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${item.available ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                      onClick={() => handleToggleMenuItemAvailability(item.id, item.available)}
                      title={item.available ? t('hideFromMenu') : t('showInMenu')}
                    >
                      {item.available ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                      onClick={() => {
                        setEditingMenuItemId(item.id)
                        setTimeout(() => editMenuImageInputRef.current?.click(), 0)
                      }}
                      title={t('changeImage')}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => handleDeleteMenuItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Hidden file input for editing existing menu item images */}
      <input
        ref={editMenuImageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file && editingMenuItemId) {
            handleUpdateMenuItemImage(editingMenuItemId, file)
          }
          // Reset the input so the same file can be selected again
          if (editMenuImageInputRef.current) editMenuImageInputRef.current.value = ''
        }}
      />

      {menuItems.length === 0 && (
        <div className="glass-card p-8 text-center">
          <UtensilsCrossed className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t('noMenuItemsYet')}</p>
        </div>
      )}
    </div>
  )

  const renderRewardManagement = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Gift className="w-5 h-5 text-pink-400" />
        {t('rewardManagement')}
      </h2>

      <Card className="glass-card border-0">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4 text-green-400" />
            {t('addReward')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder={t('name')}
              value={newReward.name}
              onChange={e => setNewReward(prev => ({ ...prev, name: e.target.value }))}
              className="glass-input h-10"
            />
            <Input
              placeholder={t('pointsCost')}
              type="number"
              value={newReward.pointsCost}
              onChange={e => setNewReward(prev => ({ ...prev, pointsCost: e.target.value }))}
              className="glass-input h-10"
            />
          </div>
          <Input
            placeholder={t('description')}
            value={newReward.description}
            onChange={e => setNewReward(prev => ({ ...prev, description: e.target.value }))}
            className="glass-input h-10"
          />
          <Button onClick={handleCreateReward} className="glass-button-success h-10 w-full">
            <Plus className="w-4 h-4 mr-2" />
            {t('addReward')}
          </Button>
        </CardContent>
      </Card>

      <ScrollArea className="max-h-[500px]">
        <div className="space-y-3">
          {rewards.map(reward => (
            <Card key={reward.id} className="glass-card border-0">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{reward.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{reward.description}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Coins className="w-3 h-3 text-yellow-400" />
                    <span className="text-sm font-bold text-yellow-400">{reward.pointsCost} pts</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => handleDeleteReward(reward.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )

  const renderMissionManagement = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Target className="w-5 h-5 text-orange-400" />
        {t('missionManagement')}
      </h2>

      {/* Create Mission */}
      <Card className="glass-card border-0">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4 text-green-400" />
            {t('createMission')}
          </h3>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={newMission.forAll ? 'default' : 'outline'}
              className={`flex-1 h-9 text-xs ${newMission.forAll ? 'glass-button' : 'glass-input'}`}
              onClick={() => setNewMission(prev => ({ ...prev, forAll: true }))}
            >
              <UsersRound className="w-3.5 h-3.5 mr-1" />
              {t('allCustomers')}
            </Button>
            <Button
              size="sm"
              variant={!newMission.forAll ? 'default' : 'outline'}
              className={`flex-1 h-9 text-xs ${!newMission.forAll ? 'glass-button' : 'glass-input'}`}
              onClick={() => setNewMission(prev => ({ ...prev, forAll: false }))}
            >
              <Users className="w-3.5 h-3.5 mr-1" />
              {t('oneCustomer')}
            </Button>
          </div>

          {!newMission.forAll && (
            <select
              value={newMission.customerId}
              onChange={e => setNewMission(prev => ({ ...prev, customerId: e.target.value }))}
              className="glass-input h-10 px-3 w-full"
            >
              <option value="" className="bg-gray-900">{t('selectCustomer')}</option>
              {allCustomers.map(c => (
                <option key={c.id} value={c.id} className="bg-gray-900">{c.name} ({c.phone})</option>
              ))}
            </select>
          )}

          <Input
            placeholder={t('missionTitle')}
            value={newMission.title}
            onChange={e => setNewMission(prev => ({ ...prev, title: e.target.value }))}
            className="glass-input h-10"
          />

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('type')}</Label>
              <select
                value={newMission.type}
                onChange={e => setNewMission(prev => ({ ...prev, type: e.target.value }))}
                className="glass-input h-10 px-3 w-full"
              >
                <option value="custom" className="bg-gray-900">{t('custom')}</option>
                <option value="visit_5" className="bg-gray-900">Visit 5</option>
                <option value="visit_10" className="bg-gray-900">Visit 10</option>
                <option value="spend_200" className="bg-gray-900">Spend $200</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('target')}</Label>
              <Input
                type="number"
                placeholder="5"
                value={newMission.target}
                onChange={e => setNewMission(prev => ({ ...prev, target: e.target.value }))}
                className="glass-input h-10"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('pointsReward')}</Label>
              <Input
                type="number"
                placeholder="200"
                value={newMission.points}
                onChange={e => setNewMission(prev => ({ ...prev, points: e.target.value }))}
                className="glass-input h-10"
              />
            </div>
          </div>

          <Button onClick={handleCreateMission} className="glass-button-success h-10 w-full">
            <Plus className="w-4 h-4 mr-2" />
            {newMission.forAll ? t('createForAllCustomers') : t('createMission')}
          </Button>
        </CardContent>
      </Card>

      {/* Missions List */}
      <ScrollArea className="max-h-[500px]">
        <div className="space-y-3">
          {allMissions.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('noMissionsYet')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('createOneAbove')}</p>
            </div>
          ) : (
            allMissions.map(mission => (
              <Card key={mission.id} className="glass-card border-0">
                <CardContent className="p-4">
                  {editingMission === mission.id ? (
                    <div className="space-y-3">
                      <Input
                        value={editMissionData.title}
                        onChange={e => setEditMissionData(prev => ({ ...prev, title: e.target.value }))}
                        className="glass-input h-9"
                        placeholder={t('missionTitle')}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          value={editMissionData.target}
                          onChange={e => setEditMissionData(prev => ({ ...prev, target: e.target.value }))}
                          className="glass-input h-9"
                          placeholder={t('target')}
                        />
                        <Input
                          type="number"
                          value={editMissionData.points}
                          onChange={e => setEditMissionData(prev => ({ ...prev, points: e.target.value }))}
                          className="glass-input h-9"
                          placeholder={t('pointsReward')}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleEditMission(mission.id)} className="glass-button-success flex-1 h-8">
                          <Save className="w-3 h-3 mr-1" /> {t('save')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingMission(null)} className="h-8">
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm">{mission.title}</h4>
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${
                            mission.completed
                              ? 'border-green-500/30 text-green-400'
                              : 'border-amber-500/30 text-amber-400'
                          }`}>
                            {mission.completed ? `✓ ${t('done')}` : `${mission.progress}/${mission.target}`}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {mission.customers?.name || 'Unknown'} ({mission.customers?.phone || '-'})
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Zap className="w-3 h-3 text-yellow-400" />
                          <span className="text-xs font-bold text-yellow-400">{mission.points} pts</span>
                          <span className="text-xs text-muted-foreground ml-2">{t('type')}: {mission.type}</span>
                        </div>
                        {!mission.completed && (
                          <Progress value={(mission.progress / mission.target) * 100} className="h-1.5 mt-2" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                          onClick={() => {
                            setEditingMission(mission.id)
                            setEditMissionData({
                              title: mission.title,
                              target: String(mission.target),
                              points: String(mission.points),
                            })
                          }}
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => handleDeleteMission(mission.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )

  const renderContent = () => {
    switch (adminView) {
      case 'analytics': return renderAnalytics()
      case 'settings': return renderSettings()
      case 'menu': return renderMenuManagement()
      case 'rewards': return renderRewardManagement()
      case 'missions': return renderMissionManagement()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-main flex flex-col">
      {/* Header */}
      <header className="glass-card rounded-none border-x-0 border-t-0 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold">{t('adminPanel')}</h1>
            <p className="text-[10px] text-muted-foreground">{t('management')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button variant="ghost" size="icon" onClick={logout} className="h-9 w-9 text-muted-foreground hover:text-white">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass-card rounded-none border-x-0 border-b-0 px-1 py-2 z-50">
        <div className="flex items-center justify-around">
          {adminNavItems.map(item => {
            const Icon = item.icon
            const isActive = adminView === item.key
            return (
              <button
                key={item.key}
                onClick={() => setAdminView(item.key)}
                className={`mobile-nav-item relative flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all ${
                  isActive ? 'active text-purple-400' : 'text-muted-foreground hover:text-white/70'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
