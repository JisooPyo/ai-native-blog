'use client'

import { useSubscribe } from 'app/hooks/useSubscribe'

function EmailIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
      />
    </svg>
  )
}

function SuccessMessage({ message }: { message: string }) {
  return (
    <div
      className="mt-4 flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
      data-testid="subscribe-success"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="w-4 h-4"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m4.5 12.75 6 6 9-13.5"
        />
      </svg>
      <span>{message}</span>
    </div>
  )
}

export function SubscribeForm() {
  const { email, setEmail, status, message, handleSubmit } = useSubscribe()

  return (
    <div
      className="mt-8 p-6 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
      data-testid="subscribe-form"
    >
      <div className="flex items-center gap-2">
        <EmailIcon />
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
          새 글 알림 받기
        </h3>
      </div>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        새로운 블로그 글이 발행되면 이메일로 알려드립니다.
      </p>

      {status === 'success' ? (
        <SuccessMessage message={message} />
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <label htmlFor="subscribe-email" className="sr-only">
            이메일 주소
          </label>
          <input
            id="subscribe-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소"
            required
            autoComplete="email"
            className="flex-1 px-3 py-2 rounded-md border text-sm border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500"
            data-testid="subscribe-email-input"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-4 py-2 rounded-md text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50 transition-colors"
            data-testid="subscribe-submit-button"
          >
            {status === 'loading' ? '전송 중...' : '구독'}
          </button>
        </form>
      )}

      {status === 'error' && (
        <p
          className="mt-2 text-sm text-red-600 dark:text-red-400"
          data-testid="subscribe-error"
          role="alert"
        >
          {message}
        </p>
      )}
    </div>
  )
}
