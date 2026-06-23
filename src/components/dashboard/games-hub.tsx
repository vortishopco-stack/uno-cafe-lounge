'use client'

import { useState, useEffect } from 'react'
import { useAppStore, type GameType } from '@/store/app-store'
import { useAuthStore } from '@/store/auth-store'
import { useT } from '@/lib/i18n'
import { api, type WinTier, type WheelSegment } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Gamepad2, Timer, Coins, ArrowLeft, Hamburger, Coffee, CircleDot } from 'lucide-react'
import { toast } from 'sonner'

import { BurgerCatchGame } from '@/components/games/burger-catch'
import { CoffeeShooterGame } from '@/components/games/coffee-shooter'
import { GrandWheelGame } from '@/components/games/grand-wheel'

interface GameStatus {
  canPlay: boolean
  entryCost: number
  cooldownRemaining: number
  lastPlayedAt: string | null
  winTiers?: WinTier[]
  segments?: WheelSegment[]
}

interface GamesHubProps {
  onRefresh: () => void
}

export function GamesHub({ onRefresh }: GamesHubProps) {
  const { activeGame, setActiveGame } = useAppStore()
  const { user, updateUser } = useAuthStore()
  const { t } = useT()
  const [gameStatuses, setGameStatuses] = useState<Record<GameType, GameStatus | null>>({
    burger_catch: null,
    coffee_shooter: null,
    grand_wheel: null,
  })

  const GAME_INFO: Record<GameType, { name: string; icon: any; description: string; color: string; emoji: string }> = {
    burger_catch: {
      name: t('burgerCatchName'),
      icon: Hamburger,
      description: t('burgerCatchDesc'),
      color: 'from-amber-500 to-orange-500',
      emoji: '🍔',
    },
    coffee_shooter: {
      name: t('coffeeShooterName'),
      icon: Coffee,
      description: t('coffeeShooterDesc'),
      color: 'from-amber-700 to-yellow-600',
      emoji: '☕',
    },
    grand_wheel: {
      name: t('grandWheelName'),
      icon: CircleDot,
      description: t('grandWheelDesc'),
      color: 'from-purple-500 to-pink-500',
      emoji: '🎡',
    },
  }

  const fetchGameStatuses = async () => {
    const results: Record<string, GameStatus> = {}
    for (const gameType of Object.keys(GAME_INFO) as GameType[]) {
      try {
        const data = await api.getGameStatus(gameType)
        results[gameType] = data as GameStatus
      } catch (error) {
        console.error(`Failed to fetch status for ${gameType}:`, error)
      }
    }
    setGameStatuses(prev => ({ ...prev, ...results }))
  }

  useEffect(() => {
    const load = async () => {
      const results: Record<string, GameStatus> = {}
      for (const gameType of Object.keys(GAME_INFO) as GameType[]) {
        try {
          const data = await api.getGameStatus(gameType)
          results[gameType] = data as GameStatus
        } catch (error) {
          console.error(`Failed to fetch status for ${gameType}:`, error)
        }
      }
      setGameStatuses(prev => ({ ...prev, ...results }))
    }
    load()
  }, [])

  const formatCooldown = (ms: number) => {
    const hours = Math.ceil(ms / (60 * 60 * 1000))
    if (hours >= 24) return `${Math.ceil(hours / 24)}d ${hours % 24}h`
    return `${hours}h`
  }

  const handleGameEnd = async (gameType: GameType, winnings: number) => {
    try {
      const result = await api.playGame(gameType, winnings)
      const newBalance = result.new_points_balance ?? result.newPointsBalance ?? 0
      updateUser({ points: newBalance })
      toast.success(
        winnings > 0
          ? t('youWonPoints', { points: winnings })
          : t('betterLuckNextTime'),
        { description: t('newBalance', { points: newBalance }) }
      )
      onRefresh()
      fetchGameStatuses()
      setActiveGame(null)
    } catch (error: any) {
      toast.error(error.message || t('gameError'))
      setActiveGame(null)
    }
  }

  const handleStartGame = (gameType: GameType) => {
    const status = gameStatuses[gameType]
    if (!status?.canPlay) {
      toast.error(t('gameOnCooldown'))
      return
    }
    if ((user?.points || 0) < (status?.entryCost || 0)) {
      toast.error(t('notEnoughPoints'))
      return
    }
    setActiveGame(gameType)
  }

  // If a game is active, render the game component
  if (activeGame) {
    const gameInfo = GAME_INFO[activeGame]
    const status = gameStatuses[activeGame]
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setActiveGame(null)} className="text-muted-foreground hover:text-white">
            <ArrowLeft className="w-5 h-5 rtl-flip" />
          </Button>
          <div>
            <h2 className="text-lg font-bold">{gameInfo.emoji} {gameInfo.name}</h2>
            <p className="text-xs text-muted-foreground">{t('entryCost', { cost: status?.entryCost || 0 })}</p>
          </div>
        </div>

        {activeGame === 'burger_catch' && (
          <BurgerCatchGame
            onEnd={(winnings) => handleGameEnd('burger_catch', winnings)}
            entryCost={status?.entryCost || 50}
            winTiers={status?.winTiers}
          />
        )}
        {activeGame === 'coffee_shooter' && (
          <CoffeeShooterGame
            onEnd={(winnings) => handleGameEnd('coffee_shooter', winnings)}
            entryCost={status?.entryCost || 50}
            winTiers={status?.winTiers}
          />
        )}
        {activeGame === 'grand_wheel' && (
          <GrandWheelGame
            onEnd={(winnings) => handleGameEnd('grand_wheel', winnings)}
            entryCost={status?.entryCost || 100}
            segments={status?.segments}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-purple-400" />
          {t('arcadeGames')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{t('spendPointsToPlay')}</p>
      </div>

      <div className="space-y-4">
        {(Object.keys(GAME_INFO) as GameType[]).map(gameType => {
          const info = GAME_INFO[gameType]
          const status = gameStatuses[gameType]
          const Icon = info.icon

          return (
            <Card key={gameType} className="glass-card border-0 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${info.color} flex items-center justify-center text-2xl shrink-0`}>
                    {info.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold">{info.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center gap-1">
                        <Coins className="w-3 h-3 text-yellow-400" />
                        <span className="text-xs text-yellow-400 font-medium">{status?.entryCost || '...'}</span>
                      </div>
                      {status && !status.canPlay && (
                        <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400">
                          <Timer className="w-3 h-3 mr-1" />
                          {formatCooldown(status.cooldownRemaining)}
                        </Badge>
                      )}
                      {status?.canPlay && (
                        <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400">
                          {t('available')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleStartGame(gameType)}
                    disabled={!status?.canPlay || (user?.points || 0) < (status?.entryCost || 0)}
                    className="glass-button shrink-0"
                    size="sm"
                  >
                    {t('play')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
