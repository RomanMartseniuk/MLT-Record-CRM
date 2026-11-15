import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ShieldCheck, Wrench } from 'lucide-react'
import { useDemoUsers, useLogin, useLoginAsDemo, useSession } from '@/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { ErrorNote, FullPageLoading, InfoNote } from '@/components/common/page'
import { PERMISSION_LABELS, ROLE_LABELS } from '@/lib/labels'

/** Users offered by the quick demo sign-in on this screen. */
const DEMO_IDS = ['u_admin', 'u_master', 'u_manager']

export function LoginPage() {
  const { session, isLoading } = useSession()
  const { data: demoUsers = [] } = useDemoUsers()
  const login = useLogin()
  const loginAsDemo = useLoginAsDemo()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (isLoading) return <FullPageLoading />
  if (session) return <Navigate to="/" replace />

  const pending = login.isPending || loginAsDemo.isPending

  /** Signs in by e-mail; shows the server's message when it refuses. */
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    const result = await login.mutateAsync({ email, password })
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate('/')
  }

  /** Quick demo sign-in as one of the listed users. */
  const signInAs = async (userId: string) => {
    setError('')
    const result = await loginAsDemo.mutateAsync(userId)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate('/')
  }

  const quickUsers = demoUsers.filter((user) => DEMO_IDS.includes(user.id))

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-muted p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Wrench className="size-5" />
        </span>
        <div>
          <p className="text-lg font-semibold leading-6">MLT Облік</p>
          <p className="text-xs text-muted-foreground">Облік закупівель, складу та собівартості ремонтів</p>
        </div>
      </div>

      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col gap-4 p-4 pt-4">
          <form className="flex flex-col gap-4" onSubmit={submit}>
            <Field label="Електронна пошта">
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="roman@mlt.service"
                autoComplete="username"
              />
            </Field>
            <Field label="Пароль" hint="У прототипі пароль не перевіряється">
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>
            <ErrorNote>{error}</ErrorNote>
            <Button type="submit" size="lg" disabled={pending}>
              Увійти
            </Button>
          </form>

          <div className="flex items-center gap-2">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">Швидкий вхід для демо</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="flex flex-col gap-2">
            {quickUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                disabled={pending}
                onClick={() => void signInAs(user.id)}
                className="flex items-start gap-3 rounded-md border border-border p-3 text-left hover:bg-muted disabled:opacity-60"
              >
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{user.fullName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {ROLE_LABELS[user.role]}
                    {user.extraPermissions.length > 0
                      ? ` · ${user.extraPermissions.map((permission) => PERMISSION_LABELS[permission]).join(', ')}`
                      : ''}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <InfoNote>
            Авторизація в системі — JWT. У прототипі вона мокова: вхід відкриває той самий набір прав, що буде
            перевірятися на сервері.
          </InfoNote>
        </CardContent>
      </Card>
    </div>
  )
}
