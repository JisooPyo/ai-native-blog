# AuthorProfile

블로그 포스트 하단에 표시되는 작성자 프로필 섹션 컴포넌트.

## Overview

`AuthorProfile` 컴포넌트는 블로그 글 하단에 작성자 정보를 표시하는 섹션을 렌더링합니다. `siteAuthor` 설정에서 작성자의 아바타, 이름, 소개를 가져와 표시하며, 다크 모드를 지원합니다. 이 컴포넌트는 props를 받지 않으며, 전역 설정된 작성자 정보를 자동으로 사용합니다.

## Props

이 컴포넌트는 props를 받지 않습니다. 모든 데이터는 `app/lib/author.ts`의 `siteAuthor` 설정에서 가져옵니다.

## Data Structure

컴포넌트가 사용하는 `siteAuthor` 객체의 구조:

| 필드 | 타입 | 설명 |
|------|------|------|
| name | string | 작성자 이름 |
| bio | string | 작성자 소개 문구 |
| avatar | string | 아바타 이미지 URL |

## Usage

### 기본 사용법

```tsx
import { AuthorProfile } from 'app/components/AuthorProfile';

export default function BlogPost() {
  return (
    <article>
      <h1>블로그 포스트 제목</h1>
      <p>포스트 내용...</p>

      {/* 포스트 하단에 작성자 프로필 표시 */}
      <AuthorProfile />
    </article>
  );
}
```

### MDX 블로그 포스트에서 사용

```mdx
---
title: '나의 첫 블로그 포스트'
publishedAt: '2024-01-19'
---

# 블로그 포스트 내용

여기에 포스트 내용을 작성합니다...

<AuthorProfile />
```

### 작성자 정보 설정 변경

작성자 정보를 변경하려면 `app/lib/author.ts` 파일을 수정합니다:

```typescript
export const siteAuthor: Author = {
  name: 'Your Name',
  bio: '당신의 소개 문구',
  avatar: 'https://example.com/your-avatar.jpg',
};
```

## Styling

컴포넌트는 Tailwind CSS 클래스를 사용하여 스타일링됩니다:

- **레이아웃**: 상단 여백(`mt-16`)과 패딩(`pt-8`)으로 본문과 구분
- **구분선**: 상단에 얇은 테두리로 섹션 구분 (다크 모드 지원)
- **아바타**: 64x64 픽셀 크기의 원형 이미지
- **텍스트**: 이름은 세미볼드, 소개는 작은 크기로 표시
- **다크 모드**: 자동으로 다크 모드 색상 적용

## Notes

- 이 컴포넌트는 props가 없는 순수 표시 컴포넌트입니다.
- 작성자 정보는 전역 설정을 사용하므로, 사이트 전체에서 일관된 작성자 정보가 표시됩니다.
- 다크 모드 전환 시 테두리와 텍스트 색상이 자동으로 조정됩니다.
- 아바타 이미지는 항상 원형(`rounded-full`)으로 표시됩니다.
- 이름 뒤에 "Sir"이 자동으로 추가됩니다.
- 반응형 디자인을 위해 flexbox 레이아웃을 사용합니다.
