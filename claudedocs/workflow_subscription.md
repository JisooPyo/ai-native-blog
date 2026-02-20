# 블로그 구독(이메일 뉴스레터) 기능 기술 설계 문서

> 작성일: 2026-02-20
> 프로젝트: JisooPyo/ai-native-blog
> 대상 브랜치: main

---

## 목차

- [Part 1: 기술 아키텍처 설계](#part-1-기술-아키텍처-설계)
  - [1. 시스템 아키텍처 개요](#1-시스템-아키텍처-개요)
  - [2. 데이터베이스 스키마](#2-데이터베이스-스키마)
  - [3. API 설계](#3-api-설계)
  - [4. 인증 플로우](#4-인증-플로우)
  - [5. 이메일 플로우](#5-이메일-플로우)
  - [6. 컴포넌트 아키텍처](#6-컴포넌트-아키텍처)
  - [7. 보안 고려사항](#7-보안-고려사항)
- [Part 2: 구현 워크플로우](#part-2-구현-워크플로우)
  - [Phase 1: 인프라 기반 구축](#phase-1-인프라-기반-구축)
  - [Phase 2: 구독 플로우 구현](#phase-2-구독-플로우-구현)
  - [Phase 3: 관리자 인증 및 대시보드](#phase-3-관리자-인증-및-대시보드)
  - [Phase 4: 뉴스레터 발송 기능](#phase-4-뉴스레터-발송-기능)
  - [Phase 5: 구독 해지 및 마무리](#phase-5-구독-해지-및-마무리)
  - [GitHub 이슈 목록](#github-이슈-목록)

---

# Part 1: 기술 아키텍처 설계

## 1. 시스템 아키텍처 개요

### 1.1 전체 시스템 구성도

```
                                 [사용자 브라우저]
                                       |
                                       v
                              +-----------------+
                              |  Vercel (Next.js)|
                              |  App Router      |
                              +--------+---------+
                                       |
                    +------------------+------------------+
                    |                  |                  |
                    v                  v                  v
           [React 컴포넌트]    [API Route Handlers]  [Admin 페이지]
           - SubscribeForm     - /api/subscribe      - /admin (보호됨)
           - 블로그 포스트      - /api/newsletter     - Supabase Auth
                               - /api/unsubscribe
                               - /api/admin/*
                                       |
                          +------------+------------+
                          |                         |
                          v                         v
                   +-----------+             +------------+
                   | Supabase  |             |  AWS SES   |
                   | PostgreSQL|             |  이메일     |
                   | + Auth    |             |  발송 서비스 |
                   +-----------+             +------------+
```

### 1.2 기술 스택 매핑

| 영역 | 기술 | 역할 |
|------|------|------|
| 프론트엔드 | Next.js 14 (App Router) + React 18 | UI 렌더링, 클라이언트 인터랙션 |
| 스타일링 | Tailwind CSS v4 | 기존 프로젝트 패턴 유지 |
| API | Next.js Route Handlers | 서버리스 API 엔드포인트 |
| 데이터베이스 | Supabase (PostgreSQL) | 구독자/뉴스레터 데이터 저장 |
| 인증 | Supabase Auth | 관리자 페이지 접근 제어 |
| 이메일 | AWS SES | 확인/뉴스레터/구독해지 이메일 발송 |
| 배포 | Vercel | 서버리스 환경, Edge 함수 |

### 1.3 데이터 흐름 개요

**구독 플로우:**
```
사용자 이메일 입력 -> POST /api/subscribe -> Supabase INSERT (status: pending)
                                          -> AWS SES 확인 이메일 발송
                                          -> 사용자 이메일의 확인 링크 클릭
                                          -> GET /api/subscribe/confirm?token=xxx
                                          -> Supabase UPDATE (status: confirmed)
                                          -> /subscribe/confirm 성공 페이지
```

**뉴스레터 발송 플로우:**
```
관리자 로그인 -> /admin 대시보드 -> 뉴스레터 작성
             -> POST /api/newsletter/send -> 확인된 구독자 목록 조회
             -> AWS SES 일괄 발송 -> Supabase newsletters 테이블 기록
```

**구독 해지 플로우:**
```
이메일 내 구독해지 링크 클릭 -> GET /api/unsubscribe?token=xxx
                            -> /subscribe/unsubscribe 확인 페이지
                            -> POST /api/unsubscribe (확인)
                            -> Supabase UPDATE (status: unsubscribed)
```

### 1.4 Vercel 서버리스 환경 고려사항

- **함수 실행 시간 제한**: Vercel Hobby 플랜 기준 최대 60초. 대량 이메일 발송 시 배치 처리 필요.
- **Cold Start**: Supabase 클라이언트 초기화를 모듈 레벨에서 수행하여 재사용.
- **환경 변수**: 모든 외부 서비스 키는 Vercel 환경 변수로 관리.
- **Edge Runtime 미사용**: AWS SDK가 Node.js 런타임을 요구하므로 API 라우트는 기본 Node.js 런타임 사용.

---

## 2. 데이터베이스 스키마

### 2.1 Supabase 마이그레이션 SQL

아래 파일을 `supabase/migrations/` 디렉토리에 순서대로 생성한다.

#### 마이그레이션 1: subscribers 테이블

파일명: `supabase/migrations/20260220000001_create_subscribers.sql`

```sql
-- 구독자 테이블 생성
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  token_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ
);

-- 이메일 유니크 인덱스 (대소문자 무시)
CREATE UNIQUE INDEX idx_subscribers_email_unique
  ON subscribers (LOWER(email));

-- 토큰 조회 인덱스 (확인/구독해지 링크 처리)
CREATE INDEX idx_subscribers_token
  ON subscribers (token)
  WHERE status = 'pending';

-- 상태별 조회 인덱스 (뉴스레터 발송 대상 조회)
CREATE INDEX idx_subscribers_status
  ON subscribers (status)
  WHERE status = 'confirmed';

-- RLS 활성화
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 서비스 롤은 모든 작업 가능
-- (API Route에서 supabase service_role 키 사용)
CREATE POLICY "Service role full access"
  ON subscribers
  FOR ALL
  USING (auth.role() = 'service_role');

-- RLS 정책: 인증된 관리자는 조회 가능
CREATE POLICY "Authenticated users can read subscribers"
  ON subscribers
  FOR SELECT
  USING (auth.role() = 'authenticated');
```

#### 마이그레이션 2: newsletters 테이블

파일명: `supabase/migrations/20260220000002_create_newsletters.sql`

```sql
-- 뉴스레터 테이블 생성
CREATE TABLE newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  post_slug TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipient_count INTEGER NOT NULL DEFAULT 0
);

-- 발송일 기준 조회 인덱스
CREATE INDEX idx_newsletters_sent_at
  ON newsletters (sent_at DESC);

-- RLS 활성화
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 서비스 롤은 모든 작업 가능
CREATE POLICY "Service role full access"
  ON newsletters
  FOR ALL
  USING (auth.role() = 'service_role');

-- RLS 정책: 인증된 관리자는 조회 가능
CREATE POLICY "Authenticated users can read newsletters"
  ON newsletters
  FOR SELECT
  USING (auth.role() = 'authenticated');
```

### 2.2 ERD (Entity Relationship Diagram)

```
+---------------------------+         +---------------------------+
|       subscribers         |         |       newsletters         |
+---------------------------+         +---------------------------+
| id         UUID (PK)     |         | id         UUID (PK)     |
| email      TEXT (UNIQUE)  |         | subject    TEXT           |
| status     TEXT           |         | content    TEXT           |
| token      UUID           |         | post_slug  TEXT (nullable)|
| token_expires_at TIMESTAMPTZ |     | sent_at    TIMESTAMPTZ   |
| created_at TIMESTAMPTZ    |         | recipient_count INTEGER  |
| confirmed_at TIMESTAMPTZ  |         +---------------------------+
| unsubscribed_at TIMESTAMPTZ|
+---------------------------+
```

두 테이블은 의도적으로 독립적이다. 개인 블로그 규모에서 발송 이력과 수신자 간의 상세 매핑(예: 각 이메일의 열람/클릭 추적)은 불필요한 복잡도를 야기하므로 `newsletters` 테이블은 발송 기록만 보관한다.

### 2.3 Supabase 무료 티어 제약사항

| 항목 | 무료 티어 한도 | 본 프로젝트 영향 |
|------|--------------|----------------|
| 데이터베이스 용량 | 500MB | 구독자 수천 명 수준에서 충분 |
| API 요청 | 무제한 (대역폭 2GB) | 문제없음 |
| Auth 사용자 | 50,000 MAU | 관리자 1명이므로 충분 |
| Edge Functions | 500K 호출/월 | 사용하지 않으므로 해당 없음 |
| 일시정지 정책 | 7일 비활성 시 일시정지 | 주기적 접속으로 방지 필요 |

---

## 3. API 설계

### 3.1 POST /api/subscribe -- 이메일 구독 신청

**파일 위치:** `app/api/subscribe/route.ts`

**요청:**
```typescript
// Content-Type: application/json
{
  email: string  // 필수, 유효한 이메일 형식
}
```

**응답:**
```typescript
// 성공 (200)
{
  message: "확인 이메일이 발송되었습니다. 이메일을 확인해주세요."
}

// 이미 구독 중 (409)
{
  error: "이미 구독 중인 이메일입니다."
}

// 유효성 실패 (400)
{
  error: "유효한 이메일 주소를 입력해주세요."
}

// 서버 오류 (500)
{
  error: "구독 처리 중 오류가 발생했습니다."
}
```

**처리 로직:**
1. 이메일 형식 검증 (서버사이드)
2. 이메일 소문자 정규화
3. 기존 구독자 확인:
   - `confirmed` 상태: 409 반환
   - `pending` 상태 + 토큰 만료: 새 토큰 발급, 확인 이메일 재발송
   - `unsubscribed` 상태: 새 토큰으로 상태를 `pending`으로 변경, 확인 이메일 발송
4. 신규: `subscribers` 테이블 INSERT
5. AWS SES로 확인 이메일 발송
6. 응답 반환

---

### 3.2 GET /api/subscribe/confirm -- 이메일 확인 처리

**파일 위치:** `app/api/subscribe/confirm/route.ts`

**요청:**
```
GET /api/subscribe/confirm?token=<UUID>
```

**응답:**
```typescript
// 성공: 리다이렉트
// -> /subscribe/confirm?status=success

// 토큰 만료:
// -> /subscribe/confirm?status=expired

// 유효하지 않은 토큰:
// -> /subscribe/confirm?status=invalid
```

**처리 로직:**
1. URL 쿼리에서 `token` 추출
2. `subscribers` 테이블에서 토큰으로 조회 (`status = 'pending'`)
3. 토큰 만료 여부 확인 (`token_expires_at`)
4. 유효한 경우: `status = 'confirmed'`, `confirmed_at = NOW()` 업데이트
5. 결과에 따라 확인 페이지로 리다이렉트

---

### 3.3 GET /api/unsubscribe -- 구독 해지 페이지 표시

**파일 위치:** `app/api/unsubscribe/route.ts`

**요청:**
```
GET /api/unsubscribe?token=<UUID>
```

**응답:**
```typescript
// 리다이렉트
// -> /subscribe/unsubscribe?token=<UUID>&email=<masked_email>
```

**처리 로직:**
1. 토큰으로 구독자 조회
2. 유효한 경우 이메일 마스킹 처리 (예: `j***@gmail.com`)
3. 구독 해지 확인 페이지로 리다이렉트

---

### 3.4 POST /api/unsubscribe -- 구독 해지 확인 처리

**파일 위치:** `app/api/unsubscribe/route.ts`

**요청:**
```typescript
// Content-Type: application/json
{
  token: string  // UUID
}
```

**응답:**
```typescript
// 성공 (200)
{
  message: "구독이 해지되었습니다."
}

// 유효하지 않은 토큰 (400)
{
  error: "유효하지 않은 요청입니다."
}
```

**처리 로직:**
1. 토큰으로 구독자 조회 (`status = 'confirmed'`)
2. `status = 'unsubscribed'`, `unsubscribed_at = NOW()` 업데이트
3. 응답 반환

---

### 3.5 POST /api/newsletter/send -- 뉴스레터 발송 (관리자 전용)

**파일 위치:** `app/api/newsletter/send/route.ts`

**요청:**
```typescript
// Content-Type: application/json
// Authorization: Bearer <supabase_access_token>
{
  subject: string,      // 뉴스레터 제목
  content: string,      // 뉴스레터 본문 (HTML)
  postSlug?: string     // 연결된 블로그 포스트 slug (선택)
}
```

**응답:**
```typescript
// 성공 (200)
{
  message: "뉴스레터가 발송되었습니다.",
  recipientCount: number
}

// 인증 실패 (401)
{
  error: "인증이 필요합니다."
}

// 구독자 없음 (400)
{
  error: "발송 대상 구독자가 없습니다."
}
```

**처리 로직:**
1. Supabase Auth 토큰 검증 (관리자 확인)
2. 요청 본문 유효성 검증
3. `confirmed` 상태의 구독자 목록 조회
4. 각 구독자별 구독해지 링크가 포함된 이메일 생성
5. AWS SES로 이메일 발송 (배치 처리: 한 번에 최대 50건)
6. `newsletters` 테이블에 발송 기록 INSERT
7. 응답 반환

---

### 3.6 GET /api/admin/subscribers -- 구독자 목록 (관리자 전용)

**파일 위치:** `app/api/admin/subscribers/route.ts`

**요청:**
```
GET /api/admin/subscribers?status=confirmed&page=1&limit=20
Authorization: Bearer <supabase_access_token>
```

**응답:**
```typescript
// 성공 (200)
{
  subscribers: Array<{
    id: string,
    email: string,
    status: string,
    created_at: string,
    confirmed_at: string | null
  }>,
  total: number,
  page: number,
  limit: number
}
```

---

### 3.7 GET /api/admin/stats -- 통계 (관리자 전용)

**파일 위치:** `app/api/admin/stats/route.ts`

**요청:**
```
GET /api/admin/stats
Authorization: Bearer <supabase_access_token>
```

**응답:**
```typescript
// 성공 (200)
{
  subscribers: {
    total: number,
    confirmed: number,
    pending: number,
    unsubscribed: number
  },
  newsletters: {
    totalSent: number,
    lastSentAt: string | null
  },
  unsubscribeRate: number  // 백분율 (0~100)
}
```

---

## 4. 인증 플로우

### 4.1 Supabase Auth 구성

관리자 인증은 Supabase Auth의 이메일/비밀번호 방식을 사용한다. 관리자는 1명(블로그 소유자)이므로 별도의 역할 관리(RBAC)는 구현하지 않는다.

```
                    [관리자]
                       |
                       v
              +------------------+
              | /admin (페이지)  |
              | 로그인 폼 표시    |
              +--------+---------+
                       |
                       v
              +------------------+
              | Supabase Auth    |
              | signInWithPassword|
              +--------+---------+
                       |
                  성공 / 실패
                  /         \
                 v           v
          [대시보드 표시]  [에러 메시지]
```

### 4.2 클라이언트측 인증 관리

```typescript
// app/lib/supabase.ts -- Supabase 클라이언트 설정

// 브라우저용 (클라이언트 컴포넌트)
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// 서버용 (API 라우트, 서비스 롤)
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

### 4.3 API 라우트 인증 미들웨어 패턴

관리자 전용 API 라우트에서 사용할 인증 검증 함수:

```typescript
// app/lib/auth.ts

import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return null
  }

  return user
}
```

### 4.4 Admin 페이지 보호 전략

Next.js App Router에서 클라이언트 컴포넌트 기반의 인증 체크를 사용한다. 별도의 미들웨어는 사용하지 않는다(프로젝트 규모에 비해 과도).

```
/admin
├── page.tsx          -- 메인 진입점, 로그인 상태에 따라 분기
├── components/
│   ├── LoginForm.tsx       -- 로그인 폼
│   ├── Dashboard.tsx       -- 대시보드 메인
│   ├── SubscriberList.tsx  -- 구독자 목록
│   ├── NewsletterForm.tsx  -- 뉴스레터 작성/발송 폼
│   └── StatsCard.tsx       -- 통계 카드
```

---

## 5. 이메일 플로우

### 5.1 AWS SES 아키텍처

```
+------------------+        +------------------+
| Next.js API Route|  --->  | AWS SES API      |
| (Node.js Runtime)|        | (us-east-1)      |
+------------------+        +--------+---------+
                                     |
                                     v
                            +------------------+
                            | 이메일 전송       |
                            | - 확인 이메일     |
                            | - 뉴스레터        |
                            | - 구독해지 확인   |
                            +------------------+
```

### 5.2 AWS SES 클라이언트 설정

```typescript
// app/lib/ses.ts

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const sesClient = new SESClient({
  region: process.env.AWS_SES_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function sendEmail({
  to,
  subject,
  htmlBody,
}: {
  to: string
  subject: string
  htmlBody: string
}) {
  const command = new SendEmailCommand({
    Source: process.env.SES_FROM_EMAIL!,     // 검증된 발신자 이메일
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: htmlBody, Charset: 'UTF-8' },
      },
    },
  })

  return sesClient.send(command)
}
```

### 5.3 이메일 템플릿

#### 구독 확인 이메일

```typescript
// app/lib/email-templates.ts

export function confirmationEmailTemplate({
  confirmUrl,
  blogName,
}: {
  confirmUrl: string
  blogName: string
}) {
  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: sans-serif;">
      <h2>${blogName} 구독 확인</h2>
      <p>블로그 뉴스레터 구독을 요청하셨습니다.</p>
      <p>아래 버튼을 클릭하여 구독을 확인해주세요:</p>
      <a href="${confirmUrl}"
         style="display: inline-block; padding: 12px 24px;
                background-color: #000; color: #fff;
                text-decoration: none; border-radius: 6px;">
        구독 확인하기
      </a>
      <p style="color: #666; font-size: 14px; margin-top: 24px;">
        이 링크는 24시간 동안 유효합니다.
        본인이 요청하지 않았다면 이 이메일을 무시해주세요.
      </p>
    </div>
  `
}
```

#### 뉴스레터 이메일

```typescript
export function newsletterEmailTemplate({
  subject,
  content,
  postUrl,
  unsubscribeUrl,
  blogName,
}: {
  subject: string
  content: string
  postUrl?: string
  unsubscribeUrl: string
  blogName: string
}) {
  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: sans-serif;">
      <h2>${subject}</h2>
      <div>${content}</div>
      ${postUrl ? `
        <a href="${postUrl}"
           style="display: inline-block; padding: 12px 24px; margin-top: 16px;
                  background-color: #000; color: #fff;
                  text-decoration: none; border-radius: 6px;">
          전체 글 읽기
        </a>
      ` : ''}
      <hr style="margin-top: 32px; border-color: #eee;" />
      <p style="color: #999; font-size: 12px;">
        ${blogName} | <a href="${unsubscribeUrl}" style="color: #999;">구독 해지</a>
      </p>
    </div>
  `
}
```

### 5.4 이메일 발송 배치 처리

Vercel 서버리스 함수의 실행 시간 제한(60초)을 고려하여, 뉴스레터 발송은 배치 단위로 처리한다.

```typescript
// 발송 로직 개요
async function sendNewsletter(subscribers: Subscriber[], emailParams: EmailParams) {
  const BATCH_SIZE = 50
  let sentCount = 0

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE)
    const promises = batch.map(subscriber =>
      sendEmail({
        to: subscriber.email,
        subject: emailParams.subject,
        htmlBody: newsletterEmailTemplate({
          ...emailParams,
          unsubscribeUrl: `${baseUrl}/api/unsubscribe?token=${subscriber.token}`,
        }),
      })
    )
    await Promise.allSettled(promises)
    sentCount += batch.length
  }

  return sentCount
}
```

### 5.5 AWS SES 설정 사전 요구사항

1. **발신자 이메일 검증**: SES 콘솔에서 발신 이메일 주소를 검증해야 한다.
2. **샌드박스 모드 해제**: 기본적으로 SES는 샌드박스 모드이며, 검증된 이메일에만 발송 가능하다. 프로덕션 사용을 위해 AWS에 샌드박스 해제를 요청해야 한다.
3. **발송 한도**: 샌드박스 해제 후에도 초기 한도(1일 200건)가 있으므로, 구독자 규모 증가에 따라 한도 상향 요청이 필요하다.
4. **IAM 사용자**: SES 발송 전용 IAM 사용자를 생성하고, `ses:SendEmail` 권한만 부여한다.

---

## 6. 컴포넌트 아키텍처

### 6.1 새로 생성할 컴포넌트 목록

기존 프로젝트의 컴포넌트 패턴을 따른다:
- 클라이언트 컴포넌트는 `'use client'` 선언
- Tailwind CSS 클래스 기반 스타일링
- `data-testid` 속성으로 테스트 식별자 부여
- 다크 모드 대응 (`dark:` 접두사)

```
app/
├── components/
│   └── SubscribeForm.tsx          -- [신규] 구독 폼 (클라이언트 컴포넌트)
│
├── subscribe/
│   ├── confirm/
│   │   └── page.tsx               -- [신규] 구독 확인 결과 페이지
│   └── unsubscribe/
│       └── page.tsx               -- [신규] 구독 해지 확인 페이지
│
├── admin/
│   ├── page.tsx                   -- [신규] 관리자 페이지 메인
│   └── components/
│       ├── LoginForm.tsx          -- [신규] 로그인 폼
│       ├── Dashboard.tsx          -- [신규] 대시보드 레이아웃
│       ├── SubscriberList.tsx     -- [신규] 구독자 목록 테이블
│       ├── NewsletterForm.tsx     -- [신규] 뉴스레터 작성 폼
│       └── StatsCard.tsx          -- [신규] 통계 표시 카드
│
├── hooks/
│   └── useSubscribe.ts            -- [신규] 구독 폼 상태 관리 훅
│
├── lib/
│   ├── supabase.ts                -- [신규] Supabase 클라이언트 설정
│   ├── ses.ts                     -- [신규] AWS SES 클라이언트 설정
│   ├── auth.ts                    -- [신규] 인증 유틸리티
│   ├── email-templates.ts         -- [신규] 이메일 HTML 템플릿
│   └── validators.ts              -- [신규] 이메일 등 유효성 검증 함수
│
├── api/
│   ├── subscribe/
│   │   ├── route.ts               -- [신규] 구독 API
│   │   └── confirm/
│   │       └── route.ts           -- [신규] 구독 확인 API
│   ├── unsubscribe/
│   │   └── route.ts               -- [신규] 구독 해지 API
│   ├── newsletter/
│   │   └── send/
│   │       └── route.ts           -- [신규] 뉴스레터 발송 API
│   └── admin/
│       ├── subscribers/
│       │   └── route.ts           -- [신규] 구독자 조회 API
│       └── stats/
│           └── route.ts           -- [신규] 통계 API
```

### 6.2 SubscribeForm 컴포넌트 상세

기존 `LikeButton` 패턴을 참고하여 설계한다.

**배치 위치:** `app/blog/[slug]/page.tsx` 내의 `AuthorProfile` 아래

```typescript
// app/components/SubscribeForm.tsx
'use client'

import { useSubscribe } from 'app/hooks/useSubscribe'

export function SubscribeForm() {
  const { email, setEmail, status, message, handleSubmit } = useSubscribe()

  return (
    <div
      className="mt-8 p-6 rounded-lg bg-neutral-50 dark:bg-neutral-900
                 border border-neutral-200 dark:border-neutral-800"
      data-testid="subscribe-form"
    >
      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
        새 글 알림 받기
      </h3>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        새로운 블로그 글이 발행되면 이메일로 알려드립니다.
      </p>

      {status === 'success' ? (
        <p className="mt-4 text-sm text-green-600 dark:text-green-400"
           data-testid="subscribe-success">
          {message}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소"
            required
            className="flex-1 px-3 py-2 rounded-md border text-sm
                       border-neutral-300 dark:border-neutral-700
                       bg-white dark:bg-neutral-800
                       text-neutral-900 dark:text-neutral-100
                       placeholder:text-neutral-400
                       focus:outline-none focus:ring-2 focus:ring-neutral-400"
            data-testid="subscribe-email-input"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-4 py-2 rounded-md text-sm font-medium
                       bg-neutral-900 dark:bg-neutral-100
                       text-white dark:text-neutral-900
                       hover:bg-neutral-700 dark:hover:bg-neutral-300
                       disabled:opacity-50 transition-colors"
            data-testid="subscribe-submit-button"
          >
            {status === 'loading' ? '...' : '구독'}
          </button>
        </form>
      )}

      {status === 'error' && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400"
           data-testid="subscribe-error">
          {message}
        </p>
      )}
    </div>
  )
}
```

### 6.3 useSubscribe 훅

기존 `useLike` 훅 패턴을 참고한다.

```typescript
// app/hooks/useSubscribe.ts
'use client'

import { useState, useCallback, FormEvent } from 'react'

type SubscribeStatus = 'idle' | 'loading' | 'success' | 'error'

interface UseSubscribeReturn {
  email: string
  setEmail: (email: string) => void
  status: SubscribeStatus
  message: string
  handleSubmit: (e: FormEvent) => Promise<void>
}

export function useSubscribe(): UseSubscribeReturn {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<SubscribeStatus>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage(data.message)
      } else {
        setStatus('error')
        setMessage(data.error)
      }
    } catch {
      setStatus('error')
      setMessage('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }, [email])

  return { email, setEmail, status, message, handleSubmit }
}
```

### 6.4 블로그 포스트 페이지 통합

`app/blog/[slug]/page.tsx`에서 `AuthorProfile` 하단에 `SubscribeForm`을 추가한다.

```typescript
// 기존 코드의 변경 부분만 표시
import { SubscribeForm } from 'app/components/SubscribeForm'

// ... 기존 return문 내부
      <AuthorProfile author={siteAuthor} />
      <SubscribeForm />  {/* 추가 */}
    </section>
```

이 배치는 사용자가 글을 다 읽은 후 작성자 정보를 확인하고, 자연스럽게 구독을 결정할 수 있는 위치이다.

---

## 7. 보안 고려사항

### 7.1 Rate Limiting

Vercel 서버리스 환경에서 외부 스토어 없이 구현 가능한 간이 Rate Limiting을 적용한다.

```typescript
// app/lib/rate-limit.ts

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  identifier: string,
  limit: number = 5,
  windowMs: number = 60 * 1000
): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(identifier)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) {
    return false
  }

  entry.count++
  return true
}
```

**적용 대상 및 한도:**
| 엔드포인트 | 제한 | 기준 |
|-----------|------|------|
| POST /api/subscribe | 5회/분 | IP 주소 |
| POST /api/newsletter/send | 2회/분 | 인증된 사용자 |

**주의**: 인메모리 방식은 서버리스 환경에서 인스턴스 간 공유되지 않으므로 완벽하지 않다. 개인 블로그 규모에서는 충분하며, 필요 시 Upstash Redis 등으로 교체 가능하다.

### 7.2 이메일 유효성 검증

```typescript
// app/lib/validators.ts

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export function isValidEmail(email: string): boolean {
  if (!email || email.length > 320) return false
  return EMAIL_REGEX.test(email)
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}
```

### 7.3 토큰 보안

- **토큰 생성**: PostgreSQL의 `gen_random_uuid()`를 사용하여 UUID v4 형식의 암호학적으로 안전한 토큰 생성.
- **토큰 만료**: 구독 확인 토큰은 생성 후 24시간 경과 시 만료 처리.
- **토큰 재사용 방지**: 구독 확인 후 `status`가 변경되므로, 동일 토큰으로 중복 확인 불가.
- **구독 해지 토큰**: 구독자별 고유 `token` 필드를 구독 해지 링크에도 사용. 구독 확인 시 토큰이 갱신되지 않으므로 구독 해지 링크는 항상 유효.

### 7.4 CSRF 방지

- API 라우트는 `Content-Type: application/json`만 허용한다. 브라우저의 기본 폼 제출은 `application/x-www-form-urlencoded`이므로 CSRF 공격에 대한 기본적인 방어가 된다.
- 관리자 API는 Supabase Auth 토큰을 `Authorization` 헤더로 전달하므로 CSRF에 안전하다.

### 7.5 환경 변수 관리

```env
# .env.local (로컬 개발)
# .env는 .gitignore에 포함되어야 한다

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AWS SES
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxx...
AWS_SES_REGION=us-east-1
SES_FROM_EMAIL=newsletter@yourdomain.com

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 7.6 데이터 보호

- 이메일 주소는 Supabase RLS 정책으로 보호되며, 인증된 사용자 또는 서비스 롤만 접근 가능.
- 구독 해지 페이지에서 이메일은 마스킹하여 표시 (예: `j***@gmail.com`).
- 관리자 대시보드에서만 전체 이메일 확인 가능.

---

# Part 2: 구현 워크플로우

## 전체 Phase 구조

```
Phase 1: 인프라 기반 구축        [이슈 #10 ~ #12]
    |
    v
Phase 2: 구독 플로우 구현        [이슈 #13 ~ #16]
    |
    v
Phase 3: 관리자 인증 및 대시보드   [이슈 #17 ~ #19]
    |
    v
Phase 4: 뉴스레터 발송 기능      [이슈 #20 ~ #22]
    |
    v
Phase 5: 구독 해지 및 마무리      [이슈 #23 ~ #25]
```

> 이슈 번호는 예시이다. 실제 GitHub 이슈 생성 시 할당되는 번호를 사용한다.

---

## Phase 1: 인프라 기반 구축

**목표:** Supabase 데이터베이스 연결, AWS SES 연동, 공통 유틸리티 코드 구성

### 태스크 1-1: Supabase 프로젝트 설정 및 DB 마이그레이션

**이슈 제목:** `feat: Supabase 구독자/뉴스레터 테이블 마이그레이션 추가`
**브랜치:** `feature/{이슈번호}-supabase-migration`
**복잡도:** 중

**작업 내용:**
1. Supabase 프로젝트 생성 (또는 기존 프로젝트 사용)
2. 환경 변수 설정 (.env.local 추가, .gitignore 확인)
3. `@supabase/supabase-js` 및 `@supabase/ssr` 패키지 설치
4. `supabase/migrations/20260220000001_create_subscribers.sql` 작성
5. `supabase/migrations/20260220000002_create_newsletters.sql` 작성
6. `app/lib/supabase.ts` 생성 (브라우저 클라이언트 + 서비스 클라이언트)
7. `.env.example` 파일 생성 (필요한 환경 변수 목록 문서화)

**완료 조건:**
- Supabase 대시보드에서 테이블 확인
- 로컬에서 Supabase 클라이언트 연결 테스트

---

### 태스크 1-2: AWS SES 연동 및 이메일 유틸리티

**이슈 제목:** `feat: AWS SES 이메일 발송 유틸리티 추가`
**브랜치:** `feature/{이슈번호}-ses-integration`
**복잡도:** 중

**작업 내용:**
1. `@aws-sdk/client-ses` 패키지 설치
2. `app/lib/ses.ts` 생성 (SES 클라이언트 설정 + sendEmail 함수)
3. `app/lib/email-templates.ts` 생성 (확인/뉴스레터/구독해지 이메일 템플릿)
4. AWS IAM 사용자 생성 및 SES 전용 권한 부여
5. 발신자 이메일 주소 SES 검증
6. 환경 변수 추가 (.env.local)

**완료 조건:**
- 테스트 이메일 발송 성공 (검증된 이메일 주소로)
- 이메일 템플릿 HTML 렌더링 확인

---

### 태스크 1-3: 공통 유틸리티 함수

**이슈 제목:** `feat: 이메일 검증 및 Rate Limit 유틸리티 추가`
**브랜치:** `feature/{이슈번호}-common-utils`
**복잡도:** 소

**작업 내용:**
1. `app/lib/validators.ts` 생성 (이메일 유효성 검증, 이메일 정규화)
2. `app/lib/rate-limit.ts` 생성 (인메모리 Rate Limiter)
3. `app/lib/auth.ts` 생성 (관리자 인증 검증 함수)
4. 유틸리티 함수 단위 테스트 작성

**완료 조건:**
- 유틸리티 함수 단위 테스트 전체 통과
- 빌드 성공 확인

---

### Phase 1 검증 체크포인트

- [ ] Supabase 테이블 생성 완료 (subscribers, newsletters)
- [ ] RLS 정책 적용 확인
- [ ] AWS SES 테스트 이메일 발송 성공
- [ ] 모든 환경 변수 설정 완료
- [ ] `pnpm build` 성공
- [ ] 유틸리티 단위 테스트 통과

---

## Phase 2: 구독 플로우 구현

**목표:** 사용자가 이메일을 입력하고 구독 확인까지 완료하는 전체 플로우 동작

### 태스크 2-1: 구독 API 엔드포인트 구현

**이슈 제목:** `feat: 이메일 구독 신청 API 구현`
**브랜치:** `feature/{이슈번호}-subscribe-api`
**복잡도:** 중

**작업 내용:**
1. `app/api/subscribe/route.ts` 구현 (POST 핸들러)
   - 이메일 유효성 검증
   - 중복 구독 처리 (pending 재발송, confirmed 거부, unsubscribed 재구독)
   - Supabase INSERT/UPDATE
   - AWS SES 확인 이메일 발송
   - Rate Limiting 적용
2. `app/api/subscribe/confirm/route.ts` 구현 (GET 핸들러)
   - 토큰 검증
   - 만료 확인
   - 상태 업데이트
   - 결과 페이지로 리다이렉트
3. API 라우트 단위 테스트 작성

**완료 조건:**
- POST /api/subscribe 에 이메일 전송 시 DB에 pending 레코드 생성
- 확인 이메일 수신 확인
- 확인 링크 클릭 시 status가 confirmed로 변경

---

### 태스크 2-2: 구독 폼 컴포넌트

**이슈 제목:** `feat: 블로그 포스트 하단 구독 폼 컴포넌트 추가`
**브랜치:** `feature/{이슈번호}-subscribe-form`
**복잡도:** 중

**작업 내용:**
1. `app/hooks/useSubscribe.ts` 생성
2. `app/components/SubscribeForm.tsx` 생성
3. `app/blog/[slug]/page.tsx`에서 `AuthorProfile` 하단에 `SubscribeForm` 배치
4. 다크 모드 스타일링 확인
5. 컴포넌트 단위 테스트 작성 (`SubscribeForm.test.tsx`)

**완료 조건:**
- 블로그 포스트 하단에 구독 폼 표시
- 유효한 이메일 제출 시 성공 메시지 표시
- 에러 상태 시 에러 메시지 표시
- 다크 모드에서 정상 표시
- 단위 테스트 통과

---

### 태스크 2-3: 구독 확인 결과 페이지

**이슈 제목:** `feat: 구독 확인 결과 페이지 구현`
**브랜치:** `feature/{이슈번호}-confirm-page`
**복잡도:** 소

**작업 내용:**
1. `app/subscribe/confirm/page.tsx` 구현
   - URL 쿼리 파라미터 `status`에 따라 성공/만료/오류 메시지 표시
   - 블로그 홈으로 돌아가기 링크
2. 다크 모드 스타일링

**완료 조건:**
- 확인 이메일 링크 클릭 후 성공 페이지 표시
- 만료된 토큰 시 안내 메시지 표시
- 잘못된 토큰 시 에러 메시지 표시

---

### Phase 2 검증 체크포인트

- [ ] 구독 폼 -> 확인 이메일 -> 확인 완료 전체 플로우 동작
- [ ] 중복 이메일 처리 정상 동작
- [ ] Rate Limiting 정상 동작
- [ ] 토큰 만료 처리 정상 동작
- [ ] 다크 모드 UI 정상
- [ ] 모바일 반응형 정상
- [ ] `pnpm build` 성공
- [ ] 단위 테스트 통과

---

## Phase 3: 관리자 인증 및 대시보드

**목표:** 관리자 로그인 후 구독자 목록과 통계를 확인할 수 있는 대시보드 동작

### 태스크 3-1: Supabase Auth 관리자 인증

**이슈 제목:** `feat: Supabase Auth 기반 관리자 로그인 구현`
**브랜치:** `feature/{이슈번호}-admin-auth`
**복잡도:** 중

**작업 내용:**
1. Supabase 대시보드에서 관리자 계정 생성 (이메일/비밀번호)
2. `app/admin/page.tsx` 구현 (로그인 상태 분기)
3. `app/admin/components/LoginForm.tsx` 구현
4. 세션 관리 (Supabase Auth 자동 세션 유지)

**완료 조건:**
- /admin 접속 시 로그인 폼 표시
- 올바른 자격 증명으로 로그인 성공
- 잘못된 자격 증명으로 로그인 실패 시 에러 메시지
- 로그인 상태에서 새로고침 시 세션 유지

---

### 태스크 3-2: 관리자 대시보드 - 통계 및 구독자 목록

**이슈 제목:** `feat: 관리자 대시보드 구독자 목록 및 통계 구현`
**브랜치:** `feature/{이슈번호}-admin-dashboard`
**복잡도:** 중

**작업 내용:**
1. `app/api/admin/stats/route.ts` 구현
2. `app/api/admin/subscribers/route.ts` 구현 (페이지네이션)
3. `app/admin/components/Dashboard.tsx` 구현 (전체 레이아웃)
4. `app/admin/components/StatsCard.tsx` 구현 (통계 카드)
5. `app/admin/components/SubscriberList.tsx` 구현 (구독자 테이블)
6. 관리자 API 인증 미들웨어 적용

**완료 조건:**
- 대시보드에서 구독자 수 통계 확인
- 구독자 목록 테이블 표시 (이메일, 상태, 가입일)
- 비인증 상태에서 API 접근 시 401 응답
- 페이지네이션 동작

---

### Phase 3 검증 체크포인트

- [ ] 관리자 로그인/로그아웃 정상 동작
- [ ] 미인증 사용자 접근 차단
- [ ] 대시보드 통계 정확성 (DB 데이터와 일치)
- [ ] 구독자 목록 표시 및 페이지네이션
- [ ] 비인증 API 요청 거부
- [ ] `pnpm build` 성공

---

## Phase 4: 뉴스레터 발송 기능

**목표:** 관리자가 뉴스레터를 작성하고 확인된 구독자에게 일괄 발송

### 태스크 4-1: 뉴스레터 발송 API

**이슈 제목:** `feat: 뉴스레터 발송 API 구현`
**브랜치:** `feature/{이슈번호}-newsletter-send-api`
**복잡도:** 상

**작업 내용:**
1. `app/api/newsletter/send/route.ts` 구현
   - 관리자 인증 검증
   - 확인된 구독자 목록 조회
   - 구독자별 개인화된 구독해지 링크 생성
   - AWS SES 배치 발송 (50건 단위)
   - newsletters 테이블에 발송 기록 저장
   - 발송 결과 반환

**완료 조건:**
- 관리자 인증 후 뉴스레터 발송 API 호출 성공
- 확인된 구독자에게만 이메일 발송
- 뉴스레터 테이블에 발송 기록 저장
- 각 이메일에 개인별 구독해지 링크 포함

---

### 태스크 4-2: 뉴스레터 작성 UI

**이슈 제목:** `feat: 관리자 뉴스레터 작성 및 발송 UI 구현`
**브랜치:** `feature/{이슈번호}-newsletter-ui`
**복잡도:** 중

**작업 내용:**
1. `app/admin/components/NewsletterForm.tsx` 구현
   - 제목, 본문 입력 필드
   - 블로그 포스트 연결 (선택, 드롭다운)
   - 미리보기 기능
   - 발송 확인 다이얼로그
   - 발송 결과 표시
2. Dashboard에 뉴스레터 발송 이력 표시 추가

**완료 조건:**
- 뉴스레터 작성 폼에서 제목/본문 입력 가능
- 블로그 포스트 연결 기능 동작
- 발송 전 확인 다이얼로그 표시
- 발송 후 성공/실패 피드백 표시
- 발송 이력 목록 확인

---

### Phase 4 검증 체크포인트

- [ ] 뉴스레터 작성 -> 발송 전체 플로우 동작
- [ ] 이메일 내 구독해지 링크 정상 동작
- [ ] 발송 기록 DB 저장 확인
- [ ] 배치 발송 정상 동작 (50건 단위)
- [ ] 인증되지 않은 발송 요청 거부
- [ ] `pnpm build` 성공

---

## Phase 5: 구독 해지 및 마무리

**목표:** 구독 해지 전체 플로우 동작, E2E 테스트, 최종 검증

### 태스크 5-1: 구독 해지 플로우

**이슈 제목:** `feat: 이메일 구독 해지 기능 구현`
**브랜치:** `feature/{이슈번호}-unsubscribe`
**복잡도:** 중

**작업 내용:**
1. `app/api/unsubscribe/route.ts` 구현 (GET + POST)
   - GET: 토큰 검증 후 확인 페이지로 리다이렉트
   - POST: 구독 해지 처리
2. `app/subscribe/unsubscribe/page.tsx` 구현
   - 마스킹된 이메일 표시
   - 구독 해지 확인 버튼
   - 처리 결과 메시지

**완료 조건:**
- 이메일 내 구독해지 링크 클릭 시 확인 페이지 표시
- 확인 버튼 클릭 시 구독 해지 처리
- DB에서 status가 unsubscribed로 변경
- 해지 후 더 이상 뉴스레터 수신하지 않음

---

### 태스크 5-2: E2E 테스트

**이슈 제목:** `test: 구독 플로우 E2E 테스트 추가`
**브랜치:** `feature/{이슈번호}-subscription-e2e-tests`
**복잡도:** 중

**작업 내용:**
1. 구독 폼 E2E 테스트 (Playwright)
   - 구독 폼 표시 확인
   - 유효한 이메일 제출
   - 유효하지 않은 이메일 제출
   - 성공/에러 메시지 확인
2. 구독 확인 페이지 테스트
3. 구독 해지 페이지 테스트
4. 관리자 대시보드 테스트
   - 로그인/로그아웃
   - 구독자 목록 확인

**완료 조건:**
- 모든 E2E 테스트 통과
- CI 환경에서 테스트 실행 가능

---

### 태스크 5-3: 배포 환경 설정 및 최종 검증

**이슈 제목:** `chore: 구독 기능 배포 환경 설정 및 최종 검증`
**브랜치:** `feature/{이슈번호}-subscription-deployment`
**복잡도:** 소

**작업 내용:**
1. Vercel 환경 변수 설정 (Production/Preview)
2. AWS SES 프로덕션 도메인 검증 (샌드박스 해제)
3. Supabase 프로덕션 설정 확인
4. 프로덕션 환경 전체 플로우 테스트
5. README 또는 관련 문서 업데이트

**완료 조건:**
- 프로덕션 환경에서 전체 구독/해지 플로우 동작
- AWS SES 샌드박스 해제 완료 (또는 해제 요청 진행 중)
- 모든 환경 변수 설정 완료

---

### Phase 5 검증 체크포인트

- [ ] 구독 해지 전체 플로우 동작
- [ ] E2E 테스트 전체 통과
- [ ] 프로덕션 환경 변수 설정 완료
- [ ] 프로덕션 배포 후 전체 플로우 정상 동작
- [ ] `pnpm build` 성공
- [ ] `pnpm test` 전체 통과

---

## GitHub 이슈 목록

아래는 생성할 GitHub 이슈 목록이다. 실제 이슈 번호는 생성 순서에 따라 자동 부여된다.

| Phase | 이슈 제목 | 커밋 타입 | 복잡도 | 의존성 |
|-------|---------|---------|--------|--------|
| 1 | `feat: Supabase 구독자/뉴스레터 테이블 마이그레이션 추가` | feat | 중 | 없음 |
| 1 | `feat: AWS SES 이메일 발송 유틸리티 추가` | feat | 중 | 없음 |
| 1 | `feat: 이메일 검증 및 Rate Limit 유틸리티 추가` | feat | 소 | 없음 |
| 2 | `feat: 이메일 구독 신청 API 구현` | feat | 중 | Phase 1 전체 |
| 2 | `feat: 블로그 포스트 하단 구독 폼 컴포넌트 추가` | feat | 중 | 구독 API |
| 2 | `feat: 구독 확인 결과 페이지 구현` | feat | 소 | 구독 API |
| 3 | `feat: Supabase Auth 기반 관리자 로그인 구현` | feat | 중 | Phase 1 (Supabase) |
| 3 | `feat: 관리자 대시보드 구독자 목록 및 통계 구현` | feat | 중 | 관리자 로그인 |
| 4 | `feat: 뉴스레터 발송 API 구현` | feat | 상 | Phase 1 + Phase 3 |
| 4 | `feat: 관리자 뉴스레터 작성 및 발송 UI 구현` | feat | 중 | 발송 API |
| 5 | `feat: 이메일 구독 해지 기능 구현` | feat | 중 | Phase 2 |
| 5 | `test: 구독 플로우 E2E 테스트 추가` | test | 중 | Phase 2 + Phase 5-1 |
| 5 | `chore: 구독 기능 배포 환경 설정 및 최종 검증` | chore | 소 | 전체 |

### 이슈 간 의존성 그래프

```
[1-1: Supabase 마이그레이션] ---+
                                |
[1-2: AWS SES 유틸리티] --------+--> [2-1: 구독 API] --+--> [2-2: 구독 폼]
                                |                       |
[1-3: 공통 유틸리티] -----------+                       +--> [2-3: 확인 페이지]
                                                        |
                                                        +--> [5-1: 구독 해지]
                                                        |
[1-1] ---> [3-1: 관리자 로그인] ---> [3-2: 대시보드]    |
                                       |                |
                                       v                |
                              [4-1: 발송 API] ------+   |
                                       |            |   |
                                       v            v   v
                              [4-2: 발송 UI]    [5-2: E2E 테스트]
                                                    |
                                                    v
                                        [5-3: 배포 및 최종 검증]
```

---

## 추가 참고사항

### 기존 프로젝트 패턴 준수 사항

1. **컴포넌트 구조**: 기존 `LikeButton`, `AuthorProfile` 패턴 참고
   - 클라이언트 컴포넌트: `'use client'` 선언
   - TypeScript 인터페이스로 props 정의
   - `data-testid` 속성 부여
   - 하위 컴포넌트 분리 (예: AuthorAvatar, AuthorDetails)

2. **훅 패턴**: `useLike` 참고
   - 반환 타입 인터페이스 정의 (`UseSubscribeReturn`)
   - `useState` + `useCallback` 조합
   - 상태 관리 로직 캡슐화

3. **스타일링**: Tailwind CSS v4 다크 모드 패턴
   - `dark:` 접두사로 다크 모드 스타일
   - `neutral` 색상 계열 사용 (기존 프로젝트와 일관)
   - `transition-*` 클래스로 부드러운 전환

4. **테스트 패턴**: `LikeButton.test.tsx` 참고
   - Jest + React Testing Library
   - describe/it 블록 구조
   - 모킹 패턴 (jest.mock)
   - 접근성 테스트 (aria 속성)

5. **E2E 테스트**: `blog-navigation.spec.ts` 참고
   - Playwright 사용
   - describe 블록으로 기능 단위 그룹화
   - `data-testid` 셀렉터 활용

### 패키지 추가 목록

```bash
# 프로덕션 의존성
pnpm add @supabase/supabase-js @supabase/ssr @aws-sdk/client-ses

# 개발 의존성 (기존 테스트 도구 외 추가 불필요)
```

### 환경 변수 체크리스트

| 변수명 | 용도 | 공개 여부 |
|--------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 공개 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | 공개 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 롤 키 | 비공개 |
| `AWS_ACCESS_KEY_ID` | AWS IAM 접근 키 | 비공개 |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM 비밀 키 | 비공개 |
| `AWS_SES_REGION` | AWS SES 리전 | 비공개 |
| `SES_FROM_EMAIL` | 발신자 이메일 | 비공개 |
| `NEXT_PUBLIC_BASE_URL` | 사이트 기본 URL | 공개 |
