'use client'

import { useState, useCallback, FormEvent } from 'react'
import { isValidEmail } from 'app/lib/validators'

type SubscribeStatus = 'idle' | 'loading' | 'success' | 'error'

interface UseSubscribeReturn {
  email: string
  setEmail: (email: string) => void
  status: SubscribeStatus
  message: string
  handleSubmit: (e: FormEvent) => Promise<void>
}

const SUCCESS_MESSAGES: Record<string, string> = {
  subscribed: '확인 이메일을 보내드렸습니다. 이메일을 확인해주세요.',
  already_pending: '이미 확인 이메일을 보내드렸습니다. 이메일을 확인해주세요.',
}

const ERROR_MESSAGES: Record<string, string> = {
  already_subscribed: '이미 구독 중인 이메일입니다.',
  invalid_email: '유효한 이메일 주소를 입력해주세요.',
  rate_limited: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  server_error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}

const DEFAULT_SUCCESS = SUCCESS_MESSAGES.subscribed
const DEFAULT_ERROR = '오류가 발생했습니다. 다시 시도해주세요.'

export function useSubscribe(): UseSubscribeReturn {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<SubscribeStatus>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()

      if (!isValidEmail(email)) {
        setStatus('error')
        setMessage('유효한 이메일 주소를 입력해주세요.')
        return
      }

      setStatus('loading')

      try {
        const response = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })

        const data: unknown = await response.json()
        const code =
          typeof data === 'object' && data !== null && 'code' in data
            ? String((data as Record<string, unknown>).code)
            : ''

        if (response.ok) {
          setStatus('success')
          setMessage(SUCCESS_MESSAGES[code] ?? DEFAULT_SUCCESS)
        } else {
          setStatus('error')
          setMessage(ERROR_MESSAGES[code] ?? DEFAULT_ERROR)
        }
      } catch {
        setStatus('error')
        setMessage('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
      }
    },
    [email]
  )

  return { email, setEmail, status, message, handleSubmit }
}
