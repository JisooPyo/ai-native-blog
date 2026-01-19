# CLAUDE.md

> 이 문서는 프로젝트의 **헌법**입니다. 모든 코드 변경은 이 문서에 명시된 원칙을 따라야 합니다.

---

## Quick Start

```bash
pnpm dev      # 개발 서버 실행 (http://localhost:3000)
pnpm build    # 프로덕션 빌드
pnpm start    # 프로덕션 서버 실행
```

---

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js (App Router) | 14.2.0 |
| Language | TypeScript | ^5 |
| UI Library | React | 18.2.0 |
| Styling | Tailwind CSS | 4.0.0-alpha.13 |
| MDX | next-mdx-remote | ^4.4.1 |
| Syntax Highlighting | sugar-high | ^0.6.0 |
| Font | Geist (Sans & Mono) | 1.2.2 |
| Analytics | @vercel/analytics | ^1.1.3 |
| Performance | @vercel/speed-insights | ^1.0.9 |

---

## Architecture

```
app/
├── blog/
│   ├── posts/           # MDX 블로그 포스트 저장소
│   │   └── *.mdx
│   ├── [slug]/
│   │   └── page.tsx     # 동적 블로그 포스트 페이지
│   ├── page.tsx         # 블로그 목록 페이지
│   └── utils.ts         # MDX 파싱 및 유틸리티 함수
├── components/
│   ├── mdx.tsx          # MDX 렌더링 컴포넌트
│   ├── nav.tsx          # 네비게이션 바
│   ├── posts.tsx        # 블로그 포스트 리스트 컴포넌트
│   └── footer.tsx       # 푸터
├── og/
│   └── route.tsx        # 동적 OG 이미지 생성 API
├── rss/
│   └── route.ts         # RSS 피드 API
├── layout.tsx           # 루트 레이아웃
├── page.tsx             # 홈페이지
├── sitemap.ts           # 자동 생성 사이트맵
├── robots.ts            # robots.txt 설정
└── global.css           # 글로벌 스타일
```

---

## Content & Data Structure

### 블로그 포스트 위치

모든 블로그 포스트는 `app/blog/posts/` 디렉토리에 `.mdx` 파일로 저장됩니다.

### Frontmatter 스키마

```yaml
---
title: 'Post Title'              # 필수 - 포스트 제목
publishedAt: '2024-01-01'        # 필수 - 발행일 (YYYY-MM-DD 형식)
summary: 'Brief description'     # 필수 - 포스트 요약 (SEO description으로 사용)
image: '/optional-image.png'     # 선택 - OG 이미지 (없으면 동적 생성)
---
```

### 데이터 타입 정의

```typescript
// app/blog/utils.ts
type Metadata = {
  title: string
  publishedAt: string
  summary: string
  image?: string
}
```

### 데이터 접근 함수

| 함수 | 설명 |
|------|------|
| `getBlogPosts()` | 모든 블로그 포스트 배열 반환 |
| `formatDate(date, includeRelative?)` | 날짜 포맷팅 (상대 시간 옵션) |

---

## Code Style & Conventions

### 1. 컴포넌트 정의

```typescript
// 표준: function 키워드 + Named Export
export function ComponentName() {
  return (...)
}

// 페이지 컴포넌트: Default Export
export default function Page() {
  return (...)
}
```

> 화살표 함수(`const Component = () => {}`)는 사용하지 않습니다.

### 2. 변수 선언

```typescript
// 표준: let 사용
let posts = getBlogPosts()
let allBlogs = getBlogPosts()

// const는 상수 객체에만 사용
const navItems = { ... }
```

### 3. Tailwind CSS 스타일링

#### 색상 체계
- **중립 색상 사용**: `neutral-{100-900}` 팔레트
- 텍스트: `text-neutral-600` (라이트) / `dark:text-neutral-400` (다크)
- 강조 텍스트: `text-neutral-900` (라이트) / `dark:text-neutral-100` (다크)
- 배경: `bg-white` (라이트) / `dark:bg-black` (다크)

#### 다크모드
```tsx
// 항상 다크모드 변형을 함께 지정
<p className="text-neutral-600 dark:text-neutral-400">
```

#### 반응형 디자인
```tsx
// 모바일 우선, md: lg: 접두사로 확장
<div className="flex flex-col md:flex-row">
```

#### 일반적인 패턴
```tsx
// 레이아웃 컨테이너
className="max-w-xl mx-4 lg:mx-auto"

// 카드/링크 hover 효과
className="transition-all hover:text-neutral-800 dark:hover:text-neutral-200"

// 타이틀 스타일
className="font-semibold text-2xl tracking-tighter"

// 날짜 표시
className="text-sm text-neutral-600 dark:text-neutral-400"
```

### 4. MDX 렌더링

블로그 콘텐츠는 `prose` 클래스로 감싸서 렌더링합니다:

```tsx
<article className="prose">
  <CustomMDX source={post.content} />
</article>
```

#### 커스텀 MDX 컴포넌트 (`app/components/mdx.tsx`)

| 컴포넌트 | 기능 |
|---------|------|
| `h1-h6` | 자동 slug 생성 + anchor 링크 |
| `code` | sugar-high 문법 하이라이팅 |
| `a` | 내부/외부 링크 자동 처리 |
| `Image` | rounded-lg 스타일 적용 |
| `Table` | 테이블 렌더링 |

### 5. Import 순서

```typescript
// 1. Next.js/React
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// 2. 외부 라이브러리
import { MDXRemote } from 'next-mdx-remote/rsc'

// 3. 내부 컴포넌트/유틸
import { CustomMDX } from 'app/components/mdx'
import { getBlogPosts } from 'app/blog/utils'
import { baseUrl } from 'app/sitemap'
```

---

## SEO Principles

이 프로젝트는 SEO를 위해 다음 장치들을 사용합니다:

### 1. Metadata API

**루트 레이아웃** (`app/layout.tsx`)에서 기본 메타데이터를 정의합니다:

```typescript
export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Next.js Portfolio Starter',
    template: '%s | Next.js Portfolio Starter',  // 페이지별 타이틀 템플릿
  },
  description: '...',
  openGraph: { ... },
  robots: { ... },
}
```

### 2. 동적 메타데이터

각 블로그 포스트는 `generateMetadata` 함수로 동적 메타데이터를 생성합니다:

```typescript
export function generateMetadata({ params }) {
  // OpenGraph, Twitter Card 메타데이터 생성
}
```

### 3. JSON-LD 구조화 데이터

블로그 포스트에 `BlogPosting` 스키마를 삽입합니다:

```typescript
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.metadata.title,
      datePublished: post.metadata.publishedAt,
      // ...
    }),
  }}
/>
```

### 4. 자동 생성 SEO 파일

| 파일 | 경로 | 설명 |
|------|------|------|
| `sitemap.ts` | `/sitemap.xml` | 모든 페이지 + 블로그 포스트 URL |
| `robots.ts` | `/robots.txt` | 크롤러 규칙 + 사이트맵 위치 |
| `og/route.tsx` | `/og?title=...` | 동적 OG 이미지 생성 (1200x630) |
| `rss/route.ts` | `/rss` | RSS 2.0 피드 |

### 5. baseUrl 관리

`app/sitemap.ts`에서 `baseUrl`을 export하여 프로젝트 전체에서 일관되게 사용합니다:

```typescript
export const baseUrl = 'https://portfolio-blog-starter.vercel.app'
```

---

## 새 블로그 포스트 작성 가이드

1. `app/blog/posts/` 디렉토리에 새 `.mdx` 파일 생성
2. 파일명이 URL slug가 됨 (예: `my-post.mdx` → `/blog/my-post`)
3. 필수 frontmatter 포함:

```yaml
---
title: '포스트 제목'
publishedAt: '2024-01-01'
summary: 'SEO와 목록에 표시될 요약'
---

여기에 MDX 콘텐츠 작성...
```

---

## 주의사항

- **빌드 전 확인**: 모든 MDX 파일에 필수 frontmatter가 있는지 확인
- **이미지 최적화**: `next/image`의 `Image` 컴포넌트 사용 권장
- **링크 처리**: 외부 링크는 자동으로 `target="_blank"` 적용됨
- **폰트**: Geist Sans (본문), Geist Mono (코드)가 자동 적용됨
