"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiFetch, setStoredAuth, type ApiUser } from "@/lib/api-client"
import { ArrowLeftRight, Eye, EyeOff, Mail, Lock, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function LoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function validate() {
    const next: Record<string, string> = {}
    if (!email.trim()) next.email = "Введите email"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Некорректный email"
    if (!password) next.password = "Введите пароль"
    else if (password.length < 6) next.password = "Минимум 6 символов"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const data = await apiFetch<{ user: ApiUser; token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
        token: null,
      })
      setStoredAuth({ token: data.token, user: data.user })
      router.push("/profile")
      router.refresh()
    } catch (err) {
      setErrors({ password: err instanceof Error ? err.message : "Ошибка входа" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="login-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="login-email"
            type="email"
            placeholder="your@email.com"
            className="pl-10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Пароль</Label>
          <button type="button" className="text-xs text-primary hover:underline">
            {"Забыли пароль?"}
          </button>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
            className="pl-10 pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            <span className="sr-only">{showPassword ? "Скрыть пароль" : "Показать пароль"}</span>
          </button>
        </div>
        {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Вход…" : "Войти"}
      </Button>
    </form>
  )
}

function RegisterForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function validate() {
    const next: Record<string, string> = {}
    if (!form.username.trim()) next.username = "Введите логин"
    else if (!/^[a-zA-Z0-9_]{3,50}$/.test(form.username.trim()))
      next.username = "Логин: 3–50 символов, буквы, цифры, _"
    if (!form.name.trim()) next.name = "Введите имя"
    if (!form.email.trim()) next.email = "Введите email"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Некорректный email"
    if (!form.password) next.password = "Введите пароль"
    else if (form.password.length < 6) next.password = "Минимум 6 символов"
    if (form.password !== form.confirmPassword) next.confirmPassword = "Пароли не совпадают"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const data = await apiFetch<{ user: ApiUser; token: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          full_name: form.name.trim(),
        }),
        token: null,
      })
      setStoredAuth({ token: data.token, user: data.user })
      router.push("/profile")
      router.refresh()
    } catch (err) {
      setErrors({ email: err instanceof Error ? err.message : "Ошибка регистрации" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="reg-username">Логин</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="reg-username"
            placeholder="ivan_skill"
            className="pl-10"
            value={form.username}
            onChange={(e) => update("username", e.target.value)}
          />
        </div>
        {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="reg-name">Имя и фамилия</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="reg-name"
            placeholder="Иван Иванов"
            className="pl-10"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </div>
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="reg-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="reg-email"
            type="email"
            placeholder="your@email.com"
            className="pl-10"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </div>
        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="reg-password">Пароль</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
            className="pl-10 pr-10"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            <span className="sr-only">{showPassword ? "Скрыть пароль" : "Показать пароль"}</span>
          </button>
        </div>
        {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="reg-confirm">{"Подтвердите пароль"}</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="reg-confirm"
            type="password"
            placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
            className="pl-10"
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
          />
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword}</p>
        )}
      </div>

      <Button type="submit" size="lg" className="mt-1 w-full" disabled={submitting}>
        {submitting ? "Регистрация…" : "Создать аккаунт"}
      </Button>
    </form>
  )
}

export default function AuthPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] max-[600px]:min-h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom,0px))] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary">
              <ArrowLeftRight className="size-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Bartery
            </span>
          </Link>
          <p className="mt-3 text-muted-foreground">
            {"Войдите или создайте аккаунт, чтобы начать обмениваться навыками"}
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="login">
              <TabsList className="mb-6 grid w-full grid-cols-2">
                <TabsTrigger value="login">Вход</TabsTrigger>
                <TabsTrigger value="register">Регистрация</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <LoginForm />
              </TabsContent>

              <TabsContent value="register">
                <RegisterForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
