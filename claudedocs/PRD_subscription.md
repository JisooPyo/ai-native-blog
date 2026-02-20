# PRD: 블로그 이메일 구독(뉴스레터) 기능

> 작성일: 2026-02-20
> 프로젝트: JisooPyo/ai-native-blog
> 상태: 구현 진행 중 (Phase 2/5)

---

## 1. 개요

### 1.1 배경

개인 블로그(Next.js 14 기반)에 이메일 뉴스레터 구독 기능을 추가한다.
현재 블로그는 MDX 기반 정적 블로그로, 좋아요(localStorage), 다크 모드, RSS 피드 등의 기능을 갖추고 있으나, 독자와의 능동적 소통 채널이 없는 상태이다.

### 1.2 목표

| 목표 | 설명 |
|------|------|
| **독자 유지(Reader Retention)** | 새 글 발행 시 독자에게 알림을 보내 재방문 유도 |
| **독자층 구축(Audience Building)** | 메일링 리스트를 통해 독자 규모 파악 및 관계 형성 |

### 1.3 비목표 (Out of Scope)

- 사용자 계정 시스템 (로그인/회원가입)
- RSS 피드 개선
- 댓글 시스템
- 유료 구독/결제
- 이메일 열람/클릭 추적 (상세 분석)

---

## 2. 기술 스택 결정사항

| 영역 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | Next.js 14 (App Router) | 기존 프로젝트 |
| 데이터베이스 | Supabase (PostgreSQL) | 프로젝트에 이미 구성됨, 무료 티어 충분 |
| 이메일 발송 | AWS SES | 비용 효율적, 안정적 대량 발송 |
| 관리자 인증 | Supabase Auth | DB와 동일 플랫폼, 추가 의존성 최소화 |
| 배포 | Vercel | 기존 배포 환경 |

### 추가 패키지 (3개만)

```
@supabase/supabase-js  @supabase/ssr  @aws-sdk/client-ses
```

---

## 3. 사용자 스토리

### 3.1 독자 (Subscriber)

| ID | 스토리 | 수용 조건 |
|----|--------|----------|
| US-01 | 독자로서, 블로그 포스트 하단에서 이메일을 입력하여 구독을 신청할 수 있다. | 이메일 입력 폼이 AuthorProfile 아래에 표시됨. 유효성 검증 후 제출 가능. |
| US-02 | 독자로서, 확인 이메일의 링크를 클릭하여 구독을 확정할 수 있다. | 이메일 수신 → 링크 클릭 → 확인 페이지 표시. 토큰 24시간 유효. |
| US-03 | 독자로서, 이메일 내 링크를 통해 언제든 구독을 해지할 수 있다. | 모든 이메일에 구독 해지 링크 포함. 확인 페이지에서 최종 해지. |
| US-04 | 독자로서, 구독 해지 후 재구독할 수 있다. | 구독 해지 상태에서 다시 구독 폼 제출 시 재구독 프로세스 시작. |

### 3.2 블로그 운영자 (Admin)

| ID | 스토리 | 수용 조건 |
|----|--------|----------|
| US-05 | 운영자로서, /admin에 로그인하여 대시보드에 접근할 수 있다. | Supabase Auth 인증. 미인증 시 로그인 폼 표시. |
| US-06 | 운영자로서, 구독자 목록과 상태를 확인할 수 있다. | 이메일, 상태, 가입일 테이블. 페이지네이션 지원. |
| US-07 | 운영자로서, 뉴스레터를 작성하고 수동으로 발송할 수 있다. | 제목/본문 입력, 블로그 포스트 연결(선택), 발송 확인 다이얼로그. |
| US-08 | 운영자로서, 기본 통계를 확인할 수 있다. | 총 구독자, 확인된 구독자, 해지율, 발송 횟수 표시. |

---

## 4. 기능 요구사항

### 4.1 구독 폼 (FR-01)

- **위치**: 블로그 포스트 하단, AuthorProfile 컴포넌트 아래
- **입력 데이터**: 이메일 주소만 (최소 마찰)
- **플로우**: 이메일 입력 → 클라이언트 유효성 검증 → POST /api/subscribe → 성공/에러 메시지 표시
- **상태**: idle → loading → success | error
- **UI**: 다크 모드 대응, 모바일 반응형, 접근성(label, role="alert")

### 4.2 이메일 확인 - Double Opt-in (FR-02)

- 구독 신청 시 `pending` 상태로 DB 저장
- AWS SES로 확인 이메일 발송 (확인 버튼 + 24시간 유효 토큰)
- 확인 링크 클릭 → GET /api/subscribe/confirm?token=xxx → `confirmed` 상태로 변경
- 결과 페이지: 성공 / 토큰 만료 / 유효하지 않은 토큰 분기 표시

### 4.3 뉴스레터 발송 (FR-03)

- **트리거**: 관리자가 수동으로 발송 (자동 발송 없음)
- **대상**: `confirmed` 상태의 구독자만
- **콘텐츠 형식**: 미리보기 텍스트 + "전체 글 읽기" 링크 (블로그로 유도)
- **배치 처리**: 50건 단위 (Vercel 서버리스 60초 제한 대응)
- **기록**: newsletters 테이블에 발송 이력 저장

### 4.4 구독 해지 (FR-04)

- 모든 이메일에 개인별 고유 구독 해지 링크 포함
- 링크 클릭 → 확인 페이지 표시 ("구독을 취소하시겠습니까?")
- 확인 시 `unsubscribed` 상태로 변경
- 이메일 마스킹 표시 (예: `j***@gmail.com`)

### 4.5 관리자 대시보드 (FR-05)

- **인증**: Supabase Auth (이메일/비밀번호)
- **구독자 관리**: 목록 조회, 상태 필터, 페이지네이션
- **뉴스레터**: 작성 폼, 포스트 연결, 발송 확인, 이력 조회
- **통계**: 구독자 수(총/확인/해지), 발송 횟수, 해지율

### 4.6 기본 분석 (FR-06)

| 지표 | 설명 |
|------|------|
| 구독자 수 | 총 수, 상태별(pending/confirmed/unsubscribed) |
| 발송 횟수 | 총 뉴스레터 발송 수, 마지막 발송일 |
| 해지율 | (해지 수 / 확인된 구독자 수) × 100 |

---

## 5. 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| **보안** | Rate Limiting (구독 API 5회/분), CSRF 방어 (JSON Content-Type), 토큰 보안 (UUID v4, 24시간 만료) |
| **접근성** | 키보드 내비게이션, ARIA 레이블, 스크린 리더 호환 |
| **반응형** | 모바일/태블릿/데스크톱 대응 |
| **다크 모드** | 기존 테마 시스템과 일관된 다크 모드 지원 |
| **성능** | 구독 폼이 블로그 포스트 페이지 로드에 영향 없음 (클라이언트 컴포넌트) |
| **규정 준수** | Double opt-in, 모든 이메일에 구독 해지 링크, RFC 8058 List-Unsubscribe 헤더 |
| **인프라 제약** | Supabase 무료 티어 (500MB DB, 50K MAU Auth), Vercel Hobby (60초 함수), AWS SES 일 200건 초기 한도 |

---

## 6. 데이터 모델

### 6.1 subscribers

```sql
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

CREATE UNIQUE INDEX idx_subscribers_email_unique ON subscribers (LOWER(email));
CREATE INDEX idx_subscribers_token ON subscribers (token) WHERE status = 'pending';
CREATE INDEX idx_subscribers_status ON subscribers (status) WHERE status = 'confirmed';
```

### 6.2 newsletters

```sql
CREATE TABLE newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  post_slug TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipient_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_newsletters_sent_at ON newsletters (sent_at DESC);
```

### 6.3 RLS 정책

- `service_role`: 모든 작업 허용 (API Route에서 사용)
- `authenticated`: 조회만 허용 (관리자 대시보드)

### 6.4 ERD

```
+---------------------------+         +---------------------------+
|       subscribers         |         |       newsletters         |
+---------------------------+         +---------------------------+
| id         UUID (PK)     |         | id         UUID (PK)     |
| email      TEXT (UNIQUE)  |         | subject    TEXT           |
| status     TEXT           |         | content    TEXT           |
| token      UUID           |         | post_slug  TEXT (nullable)|
| token_expires_at TSTZ     |         | sent_at    TIMESTAMPTZ   |
| created_at TIMESTAMPTZ    |         | recipient_count INTEGER  |
| confirmed_at TIMESTAMPTZ  |         +---------------------------+
| unsubscribed_at TIMESTAMPTZ|
+---------------------------+

두 테이블은 의도적으로 독립적. 개인 블로그 규모에서 발송-수신자 매핑은 불필요한 복잡도.
```

---

## 7. API 명세

### 7.1 공개 API

| 메서드 | 경로 | 설명 | 요청 | 응답 |
|--------|------|------|------|------|
| POST | `/api/subscribe` | 구독 신청 | `{ email }` | `{ code }` (200/400/409) |
| GET | `/api/subscribe/confirm` | 구독 확인 | `?token=UUID` | 리다이렉트 → /subscribe/confirm |
| GET | `/api/unsubscribe` | 해지 페이지 | `?token=UUID` | 리다이렉트 → /subscribe/unsubscribe |
| POST | `/api/unsubscribe` | 해지 처리 | `{ token }` | `{ code }` (200/400) |

### 7.2 관리자 API (인증 필수)

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/api/admin/subscribers` | 구독자 목록 | Bearer Token |
| GET | `/api/admin/stats` | 통계 | Bearer Token |
| POST | `/api/newsletter/send` | 뉴스레터 발송 | Bearer Token |

### 7.3 구독 상태 전이도

```
                  [신규 이메일 입력]
                        |
                        v
                    +---------+
                    | pending |<------- [토큰 만료 후 재신청]
                    +----+----+
                         |
                  [확인 링크 클릭]
                         |
                         v
                   +-----------+
          +------->| confirmed |<------+
          |        +-----+-----+       |
          |              |             |
   [재구독 확인]   [해지 링크 클릭]     |
          |              |             |
          |              v             |
          |      +--------------+      |
          +------| unsubscribed |------+
                 +--------------+
                  [재구독 시 pending 경유]
```

---

## 8. 컴포넌트 아키텍처

### 8.1 신규 파일 목록

```
app/
├── components/
│   └── SubscribeForm.tsx           ✅ 구현 완료
├── hooks/
│   └── useSubscribe.ts             ✅ 구현 완료
├── lib/
│   ├── validators.ts               ✅ 구현 완료
│   ├── supabase.ts                 ⬜ Phase 1
│   ├── ses.ts                      ⬜ Phase 1
│   ├── auth.ts                     ⬜ Phase 1
│   ├── email-templates.ts          ⬜ Phase 1
│   └── rate-limit.ts               ⬜ Phase 1
├── subscribe/
│   ├── confirm/page.tsx            ⬜ Phase 2
│   └── unsubscribe/page.tsx        ⬜ Phase 5
├── admin/
│   ├── page.tsx                    ⬜ Phase 3
│   └── components/
│       ├── LoginForm.tsx           ⬜ Phase 3
│       ├── Dashboard.tsx           ⬜ Phase 3
│       ├── SubscriberList.tsx      ⬜ Phase 3
│       ├── NewsletterForm.tsx      ⬜ Phase 4
│       └── StatsCard.tsx           ⬜ Phase 3
├── api/
│   ├── subscribe/route.ts          ⬜ Phase 2
│   ├── subscribe/confirm/route.ts  ⬜ Phase 2
│   ├── unsubscribe/route.ts        ⬜ Phase 5
│   ├── newsletter/send/route.ts    ⬜ Phase 4
│   ├── admin/subscribers/route.ts  ⬜ Phase 3
│   └── admin/stats/route.ts        ⬜ Phase 3
```

### 8.2 수정된 기존 파일

| 파일 | 변경 내용 | 상태 |
|------|----------|------|
| `app/blog/[slug]/page.tsx` | SubscribeForm import + 배치, JSON-LD XSS 방어 | ✅ 완료 |

---

## 9. 보안 설계

### 9.1 적용된 보안 조치 (구현 완료)

| 항목 | 내용 | 파일 |
|------|------|------|
| XSS 방어 (클라이언트 메시지 맵) | 서버 응답을 직접 렌더링하지 않고, `code` 기반으로 클라이언트 정의 메시지 사용 | `useSubscribe.ts` |
| XSS 방어 (입력 검증) | HTML 특수문자(`<>"'&`) 명시적 차단, typeof 검증 | `validators.ts` |
| XSS 방어 (JSON-LD) | `JSON.stringify().replace(/</g, '\\u003c')` 로 `</script>` 주입 차단 | `[slug]/page.tsx` |
| 접근성 | `<label>` + `sr-only`, `role="alert"`, `aria-hidden` | `SubscribeForm.tsx` |

### 9.2 구현 예정 보안 조치

| 항목 | 내용 | Phase |
|------|------|-------|
| Rate Limiting | 인메모리, 구독 API 5회/분 (IP 기반) | Phase 1 |
| CSRF 방어 | JSON Content-Type 강제 | Phase 2 |
| 토큰 보안 | UUID v4 (gen_random_uuid), 24시간 만료 | Phase 2 |
| 서버사이드 검증 | API에서 이메일 재검증 (클라이언트 우회 대비) | Phase 2 |
| 관리자 인증 | Supabase Auth Bearer Token | Phase 3 |
| 이메일 마스킹 | 구독 해지 페이지에서 `j***@gmail.com` 형태 | Phase 5 |
| 환경 변수 관리 | 시크릿 키 .env.local + Vercel 환경 변수 | Phase 1 |

### 9.3 보안 검토 결과 요약

2026-02-20 보안 검토 수행 완료. 즉시 악용 가능한 XSS 취약점 0건.
High 1건(서버 응답 메시지 → 즉시 수정 완료), Medium 2건(이메일 검증 강화 + JSON-LD → 즉시 수정 완료).

---

## 10. 구현 워크플로우

> 상세 태스크 목록 및 의존성 그래프는 `claudedocs/workflow_subscription.md` 참조

### 10.1 Phase 개요

| Phase | 내용 | 태스크 수 | 상태 |
|-------|------|----------|------|
| Phase 1 | 인프라 기반 구축 (Supabase, SES, 유틸리티) | 3개 (병렬 가능) | ⬜ 미시작 |
| Phase 2 | 구독 플로우 구현 (API, 폼, 확인 페이지) | 3개 | 🟡 부분 완료 |
| Phase 3 | 관리자 인증 및 대시보드 | 2개 | ⬜ 미시작 |
| Phase 4 | 뉴스레터 발송 기능 | 2개 | ⬜ 미시작 |
| Phase 5 | 구독 해지, E2E 테스트, 배포 | 3개 | ⬜ 미시작 |

### 10.2 현재 진행 상황

**Phase 2 부분 완료:**

| 구현 항목 | 파일 | 상태 |
|----------|------|------|
| 이메일 검증 유틸리티 | `app/lib/validators.ts` | ✅ 완료 |
| 구독 상태 관리 훅 | `app/hooks/useSubscribe.ts` | ✅ 완료 |
| 구독 폼 UI 컴포넌트 | `app/components/SubscribeForm.tsx` | ✅ 완료 |
| 블로그 포스트 페이지 통합 | `app/blog/[slug]/page.tsx` | ✅ 완료 |
| 보안 검토 및 수정 | XSS 방어 3건 적용 | ✅ 완료 |
| 빌드 검증 | `pnpm build` 성공 | ✅ 완료 |
| 기존 테스트 통과 | 81/81 tests passed | ✅ 완료 |

### 10.3 의존성 그래프

```
[1-1: Supabase 마이그레이션] ---+
                                |
[1-2: AWS SES 유틸리티] --------+--> [2-1: 구독 API] --+--> [2-2: 구독 폼] ✅
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

### 10.4 GitHub 이슈 목록

| Phase | 이슈 제목 | 복잡도 |
|-------|---------|--------|
| 1 | `feat: Supabase 구독자/뉴스레터 테이블 마이그레이션 추가` | 중 |
| 1 | `feat: AWS SES 이메일 발송 유틸리티 추가` | 중 |
| 1 | `feat: 이메일 검증 및 Rate Limit 유틸리티 추가` | 소 |
| 2 | `feat: 이메일 구독 신청 API 구현` | 중 |
| 2 | `feat: 블로그 포스트 하단 구독 폼 컴포넌트 추가` | 중 |
| 2 | `feat: 구독 확인 결과 페이지 구현` | 소 |
| 3 | `feat: Supabase Auth 기반 관리자 로그인 구현` | 중 |
| 3 | `feat: 관리자 대시보드 구독자 목록 및 통계 구현` | 중 |
| 4 | `feat: 뉴스레터 발송 API 구현` | 상 |
| 4 | `feat: 관리자 뉴스레터 작성 및 발송 UI 구현` | 중 |
| 5 | `feat: 이메일 구독 해지 기능 구현` | 중 |
| 5 | `test: 구독 플로우 E2E 테스트 추가` | 중 |
| 5 | `chore: 구독 기능 배포 환경 설정 및 최종 검증` | 소 |

---

## 11. 환경 변수

| 변수명 | 용도 | 공개 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | O |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | O |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 롤 키 | X |
| `AWS_ACCESS_KEY_ID` | AWS IAM 접근 키 | X |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM 비밀 키 | X |
| `AWS_SES_REGION` | AWS SES 리전 | X |
| `SES_FROM_EMAIL` | 발신자 이메일 | X |
| `NEXT_PUBLIC_BASE_URL` | 사이트 기본 URL | O |

---

## 12. 미결 사항 (Open Questions)

| # | 질문 | 영향 | 상태 |
|---|------|------|------|
| 1 | AWS SES 계정이 샌드박스 모드에서 해제되었는가? | 구독자 제한 | ⬜ 확인 필요 |
| 2 | 기존 Supabase 프로젝트를 사용할 것인가, 새로 생성할 것인가? | 초기 설정 | ⬜ 확인 필요 |
| 3 | 뉴스레터 이메일 디자인을 HTML 템플릿으로 할 것인가, 플레인 텍스트인가? | 이메일 템플릿 구현 | ⬜ 확인 필요 |
| 4 | 블로그 도메인의 이메일 주소가 있는가? (예: newsletter@yourdomain.com) | SES 발신자 설정 | ⬜ 확인 필요 |

---

## 13. 관련 문서

| 문서 | 경로 | 설명 |
|------|------|------|
| 기술 설계 + 구현 워크플로우 | `claudedocs/workflow_subscription.md` | DB 스키마, API 상세 스펙, 컴포넌트 설계, 보안 상세, Phase별 태스크 |
| 이 문서 (PRD) | `claudedocs/PRD_subscription.md` | 요구사항, 사용자 스토리, 진행 상황 통합 |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-02-20 | 초안 작성. 브레인스토밍 → 기술 설계 → 구독 폼 구현 + 보안 검토 완료. |
