'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { useT } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UtensilsCrossed, Phone, Mail, User, Lock, Sparkles, BookOpen, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { LanguageSwitcher } from '@/components/ui/language-switcher'

interface AuthScreenProps {
  onBrowseMenu?: () => void
  /** When true, the app detected a PASSWORD_RECOVERY event and the user
   *  clicked the reset link in their email. Show the "Set New Password"
   *  form instead of the normal login/signup tabs. */
  passwordRecoveryMode?: boolean
  onRecoveryComplete?: () => void
}

export function AuthScreen({ onBrowseMenu, passwordRecoveryMode, onRecoveryComplete }: AuthScreenProps) {
  const { login } = useAuthStore()
  const { t } = useT()
  const [isLoading, setIsLoading] = useState(false)
  const [loginForm, setLoginForm] = useState({ phone: '', password: '' })
  const [signupForm, setSignupForm] = useState({ phone: '', email: '', name: '', password: '' })

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetInput, setResetInput] = useState('')
  const [resetSent, setResetSent] = useState(false)

  // Set new password state (recovery flow)
  const [newPasswordForm, setNewPasswordForm] = useState({ password: '', confirm: '' })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const data = await api.login(loginForm.phone, loginForm.password)
      login(
        { ...data.user, totalVisits: data.user.total_visits || data.user.totalVisits || 0, createdAt: data.user.created_at || data.user.createdAt, updatedAt: data.user.updated_at || data.user.updatedAt },
        data.token
      )
      toast.success(t('welcomeBack', { name: data.user.name }))
    } catch (error: any) {
      const code = error?.code || error?.message
      if (code === 'ACCOUNT_PENDING') {
        toast.error(t('accountPending'), { description: t('accountPendingDesc') })
      } else if (code === 'ACCOUNT_REJECTED') {
        toast.error(t('accountRejected'), { description: t('accountRejectedDesc') })
      } else {
        toast.error(error.message || t('loginFailed'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const data = await api.signup(
        signupForm.phone,
        signupForm.email,
        signupForm.name,
        signupForm.password
      )
      login(
        { ...data.user, totalVisits: data.user.total_visits || data.user.totalVisits || 0, createdAt: data.user.created_at || data.user.createdAt, updatedAt: data.user.updated_at || data.user.updatedAt },
        data.token
      )
      toast.success(t('welcomeNew', { name: data.user.name }))
    } catch (error: any) {
      const code = error?.code || error?.message
      if (code === 'SIGNUP_PENDING') {
        toast.success(t('signupReceived'), { description: t('signupReceivedDesc') })
      } else {
        toast.error(error.message || t('signupFailed'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetInput.trim()) return
    setIsLoading(true)
    try {
      await api.resetPassword(resetInput.trim())
      setResetSent(true)
      toast.success(t('resetLinkSent'), { description: t('resetLinkSentDesc') })
    } catch (error: any) {
      toast.error(error.message || t('failedToSendResetLink'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPasswordForm.password.length < 6) {
      toast.error(t('passwordMinLength'))
      return
    }
    if (newPasswordForm.password !== newPasswordForm.confirm) {
      toast.error(t('passwordsDoNotMatch'))
      return
    }
    setIsLoading(true)
    try {
      await api.updatePassword(newPasswordForm.password)
      toast.success(t('passwordUpdated'))
      // Sign out the recovery session and go back to login
      await api.signOut()
      onRecoveryComplete?.()
    } catch (error: any) {
      toast.error(error.message || t('failedToUpdatePassword'))
    } finally {
      setIsLoading(false)
    }
  }

  // ===== Password Recovery: Set New Password form =====
  if (passwordRecoveryMode) {
    return (
      <div className="min-h-screen bg-gradient-main flex items-center justify-center p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="flex justify-end mb-2">
              <LanguageSwitcher />
            </div>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 mb-4">
              <KeyRound className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold">{t('setNewPassword')}</h1>
            <p className="text-muted-foreground mt-2 text-sm">{t('setNewPasswordDesc')}</p>
          </div>

          <Card className="glass-card border-0 shadow-2xl">
            <CardContent className="p-6">
              <form onSubmit={handleSetNewPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">{t('newPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
                    <Input
                      type="password"
                      placeholder={t('createPassword')}
                      value={newPasswordForm.password}
                      onChange={(e) => setNewPasswordForm(prev => ({ ...prev, password: e.target.value }))}
                      className="glass-input pl-10 h-12 border-white/10"
                      dir="ltr"
                      minLength={6}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">{t('confirmPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
                    <Input
                      type="password"
                      placeholder={t('confirmNewPassword')}
                      value={newPasswordForm.confirm}
                      onChange={(e) => setNewPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                      className="glass-input pl-10 h-12 border-white/10"
                      dir="ltr"
                      minLength={6}
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full glass-button h-12 text-base"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('updating')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      {t('setNewPassword')}
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ===== Forgot Password form =====
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-main flex items-center justify-center p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="flex justify-end mb-2">
              <LanguageSwitcher />
            </div>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 mb-4">
              <KeyRound className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold">{t('forgotPasswordTitle')}</h1>
            <p className="text-muted-foreground mt-2 text-sm">{t('forgotPasswordDesc')}</p>
          </div>

          <Card className="glass-card border-0 shadow-2xl">
            <CardContent className="p-6">
              {resetSent ? (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                    <Mail className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('resetLinkSentDesc')}</p>
                  <Button
                    onClick={() => {
                      setShowForgotPassword(false)
                      setResetSent(false)
                      setResetInput('')
                    }}
                    variant="ghost"
                    className="w-full h-11"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2 rtl-flip" />
                    {t('backToLogin')}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSendResetLink} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">{t('emailOrPhone')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
                      <Input
                        type="text"
                        placeholder={t('emailOrPhonePlaceholder')}
                        value={resetInput}
                        onChange={(e) => setResetInput(e.target.value)}
                        className="glass-input pl-10 h-12 border-white/10"
                        dir="ltr"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full glass-button h-12 text-base"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('sending')}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {t('sendResetLink')}
                      </div>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowForgotPassword(false)
                      setResetInput('')
                    }}
                    variant="ghost"
                    className="w-full h-10 text-sm"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2 rtl-flip" />
                    {t('backToLogin')}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ===== Default: Login + Signup tabs =====
  return (
    <div className="min-h-screen bg-gradient-main flex items-center justify-center p-4">
      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Language Switcher */}
        <div className="text-center mb-8">
          <div className="flex justify-end mb-2">
            <LanguageSwitcher />
          </div>
          <div className="inline-flex items-center justify-center ">
              <img src="logo.png" alt="Logo" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            {t('appName')}
          </h1>
          <p className="text-muted-foreground mt-2">{t('appTagline')}</p>
        </div>

        {/* Auth Card */}
        <Card className="glass-card border-0 shadow-2xl">
          <CardContent className="p-0">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="w-full bg-transparent border-b border-white/5 rounded-none h-14 p-0">
                <TabsTrigger
                  value="login"
                  className="flex-1 h-full rounded-none data-[state=active]:bg-purple-500/20 data-[state=active]:border-b-2 data-[state=active]:border-purple-400 data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-white"
                >
                  {t('signIn')}
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="flex-1 h-full rounded-none data-[state=active]:bg-purple-500/20 data-[state=active]:border-b-2 data-[state=active]:border-purple-400 data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-white"
                >
                  {t('signUp')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="p-6 mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">{t('phoneNumber')}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
                      <Input
                        type="tel"
                        placeholder={t('enterPhone')}
                        value={loginForm.phone}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="glass-input pl-10 h-12 border-white/10"
                        dir="ltr"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">{t('password')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
                      <Input
                        type="password"
                        placeholder={t('enterPassword')}
                        value={loginForm.password}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                        className="glass-input pl-10 h-12 border-white/10"
                        dir="ltr"
                        required
                      />
                    </div>
                  </div>
                  {/* Forgot Password link */}
                  <div className="text-end">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      {t('forgotPassword')}
                    </button>
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full glass-button h-12 text-base"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('signingIn')}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        {t('signIn')}
                      </div>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="p-6 mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">{t('fullName')}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
                      <Input
                        placeholder={t('enterName')}
                        value={signupForm.name}
                        onChange={(e) => setSignupForm(prev => ({ ...prev, name: e.target.value }))}
                        className="glass-input pl-10 h-12 border-white/10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">{t('phoneNumber')}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
                      <Input
                        type="tel"
                        placeholder={t('enterPhone')}
                        value={signupForm.phone}
                        onChange={(e) => setSignupForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="glass-input pl-10 h-12 border-white/10"
                        dir="ltr"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">{t('email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
                      <Input
                        type="email"
                        placeholder={t('enterEmail')}
                        value={signupForm.email}
                        onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                        className="glass-input pl-10 h-12 border-white/10"
                        dir="ltr"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">{t('password')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
                      <Input
                        type="password"
                        placeholder={t('createPassword')}
                        value={signupForm.password}
                        onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                        className="glass-input pl-10 h-12 border-white/10"
                        dir="ltr"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full glass-button h-12 text-base"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('creatingAccount')}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        {t('signUp')}
                      </div>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Browse menu + Setup hint */}
        <div className="mt-6 text-center space-y-3">
          {onBrowseMenu && (
            <button
              onClick={onBrowseMenu}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-sm text-muted-foreground hover:text-white transition-colors w-full justify-center"
            >
              <BookOpen className="w-4 h-4" />
              {t('browseMenu')}
            </button>
          )}
          <div>
            {/* <p className="text-xs text-muted-foreground/60">
              {t('poweredBy')}
            </p>
            <p className="text-xs text-muted-foreground/40 mt-1">
              {t('demoAccounts')}
            </p> */}
          </div>
        </div>
      </div>
    </div>
  )
}
