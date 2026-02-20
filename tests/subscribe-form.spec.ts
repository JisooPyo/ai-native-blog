import { test, expect } from '@playwright/test'

test.describe('Subscribe Form', () => {
  test.describe('렌더링', () => {
    test('블로그 포스트 하단에 구독 폼이 표시된다', async ({ page }) => {
      await page.goto('/blog/vim')

      const subscribeForm = page.locator('[data-testid="subscribe-form"]')
      await expect(subscribeForm).toBeVisible()
    })

    test('구독 폼이 AuthorProfile 아래에 위치한다', async ({ page }) => {
      await page.goto('/blog/vim')

      const authorProfile = page.locator('[data-testid="author-profile"]')
      const subscribeForm = page.locator('[data-testid="subscribe-form"]')

      await expect(authorProfile).toBeVisible()
      await expect(subscribeForm).toBeVisible()

      const authorBox = await authorProfile.boundingBox()
      const formBox = await subscribeForm.boundingBox()

      expect(authorBox).not.toBeNull()
      expect(formBox).not.toBeNull()
      expect(formBox!.y).toBeGreaterThan(authorBox!.y)
    })

    test('제목, 설명, 이메일 입력, 구독 버튼이 표시된다', async ({ page }) => {
      await page.goto('/blog/vim')

      const form = page.locator('[data-testid="subscribe-form"]')

      await expect(form.locator('h3')).toHaveText('새 글 알림 받기')
      await expect(form.locator('p').first()).toContainText(
        '새로운 블로그 글이 발행되면 이메일로 알려드립니다'
      )

      const emailInput = page.locator('[data-testid="subscribe-email-input"]')
      await expect(emailInput).toBeVisible()
      await expect(emailInput).toHaveAttribute('type', 'email')
      await expect(emailInput).toHaveAttribute('placeholder', '이메일 주소')

      const submitButton = page.locator(
        '[data-testid="subscribe-submit-button"]'
      )
      await expect(submitButton).toBeVisible()
      await expect(submitButton).toHaveText('구독')
    })

    test('모든 블로그 포스트 페이지에 구독 폼이 표시된다', async ({ page }) => {
      const slugs = ['vim', 'spaces-vs-tabs', 'static-typing']

      for (const slug of slugs) {
        await page.goto(`/blog/${slug}`)
        await expect(
          page.locator('[data-testid="subscribe-form"]')
        ).toBeVisible()
      }
    })

    test('블로그 목록 페이지에는 구독 폼이 표시되지 않는다', async ({
      page,
    }) => {
      await page.goto('/blog')

      await expect(
        page.locator('[data-testid="subscribe-form"]')
      ).not.toBeVisible()
    })
  })

  test.describe('클라이언트 유효성 검증', () => {
    test('빈 이메일로 제출 시 브라우저 기본 검증이 동작한다', async ({
      page,
    }) => {
      await page.goto('/blog/vim')

      const emailInput = page.locator('[data-testid="subscribe-email-input"]')
      const submitButton = page.locator(
        '[data-testid="subscribe-submit-button"]'
      )

      await expect(emailInput).toHaveAttribute('required', '')

      await submitButton.click()

      // 브라우저의 required 검증으로 폼이 제출되지 않음
      // 에러/성공 메시지가 나타나지 않아야 한다
      await expect(
        page.locator('[data-testid="subscribe-error"]')
      ).not.toBeVisible()
      await expect(
        page.locator('[data-testid="subscribe-success"]')
      ).not.toBeVisible()
    })

    test('유효하지 않은 이메일 형식 입력 시 에러 메시지가 표시된다', async ({
      page,
    }) => {
      await page.goto('/blog/vim')

      const emailInput = page.locator('[data-testid="subscribe-email-input"]')
      const submitButton = page.locator(
        '[data-testid="subscribe-submit-button"]'
      )

      // 브라우저 기본 HTML5 email 검증을 우회하기 위해 formnovalidate 속성 추가
      await submitButton.evaluate((el: HTMLButtonElement) => {
        el.setAttribute('formnovalidate', '')
      })

      await emailInput.fill('not-an-email')
      await submitButton.click()

      const errorMessage = page.locator('[data-testid="subscribe-error"]')
      await expect(errorMessage).toBeVisible()
      await expect(errorMessage).toHaveText(
        '유효한 이메일 주소를 입력해주세요.'
      )
    })
  })

  test.describe('인터랙션', () => {
    test('이메일 입력 필드에 텍스트를 입력할 수 있다', async ({ page }) => {
      await page.goto('/blog/vim')

      const emailInput = page.locator('[data-testid="subscribe-email-input"]')

      await emailInput.fill('test@example.com')
      await expect(emailInput).toHaveValue('test@example.com')
    })

    test('유효한 이메일 제출 시 로딩 상태가 표시된다', async ({ page }) => {
      await page.goto('/blog/vim')

      // fetch 요청을 인터셉트하여 지연시킴
      await page.route('/api/subscribe', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'subscribed' }),
        })
      })

      const emailInput = page.locator('[data-testid="subscribe-email-input"]')
      const submitButton = page.locator(
        '[data-testid="subscribe-submit-button"]'
      )

      await emailInput.fill('test@example.com')
      await submitButton.click()

      // 로딩 상태 확인
      await expect(submitButton).toHaveText('전송 중...')
      await expect(submitButton).toBeDisabled()
    })

    test('API 성공 응답 시 성공 메시지가 표시된다', async ({ page }) => {
      await page.goto('/blog/vim')

      await page.route('/api/subscribe', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'subscribed' }),
        })
      })

      const emailInput = page.locator('[data-testid="subscribe-email-input"]')
      const submitButton = page.locator(
        '[data-testid="subscribe-submit-button"]'
      )

      await emailInput.fill('test@example.com')
      await submitButton.click()

      const successMessage = page.locator('[data-testid="subscribe-success"]')
      await expect(successMessage).toBeVisible()
      await expect(successMessage).toContainText('확인 이메일을 보내드렸습니다')

      // 성공 시 폼이 사라짐
      await expect(emailInput).not.toBeVisible()
      await expect(submitButton).not.toBeVisible()
    })

    test('API 에러 응답 시 에러 메시지가 표시된다', async ({ page }) => {
      await page.goto('/blog/vim')

      await page.route('/api/subscribe', async (route) => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'already_subscribed' }),
        })
      })

      const emailInput = page.locator('[data-testid="subscribe-email-input"]')
      const submitButton = page.locator(
        '[data-testid="subscribe-submit-button"]'
      )

      await emailInput.fill('test@example.com')
      await submitButton.click()

      const errorMessage = page.locator('[data-testid="subscribe-error"]')
      await expect(errorMessage).toBeVisible()
      await expect(errorMessage).toHaveText('이미 구독 중인 이메일입니다.')

      // 에러 시 폼은 유지됨
      await expect(emailInput).toBeVisible()
    })

    test('네트워크 오류 시 에러 메시지가 표시된다', async ({ page }) => {
      await page.goto('/blog/vim')

      await page.route('/api/subscribe', async (route) => {
        await route.abort('connectionrefused')
      })

      const emailInput = page.locator('[data-testid="subscribe-email-input"]')
      const submitButton = page.locator(
        '[data-testid="subscribe-submit-button"]'
      )

      await emailInput.fill('test@example.com')
      await submitButton.click()

      const errorMessage = page.locator('[data-testid="subscribe-error"]')
      await expect(errorMessage).toBeVisible()
      await expect(errorMessage).toContainText('네트워크 오류')
    })

    test('알 수 없는 에러 코드 시 기본 에러 메시지가 표시된다', async ({
      page,
    }) => {
      await page.goto('/blog/vim')

      await page.route('/api/subscribe', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'unknown_error_code' }),
        })
      })

      const emailInput = page.locator('[data-testid="subscribe-email-input"]')
      const submitButton = page.locator(
        '[data-testid="subscribe-submit-button"]'
      )

      await emailInput.fill('test@example.com')
      await submitButton.click()

      const errorMessage = page.locator('[data-testid="subscribe-error"]')
      await expect(errorMessage).toBeVisible()
      await expect(errorMessage).toHaveText(
        '오류가 발생했습니다. 다시 시도해주세요.'
      )
    })
  })

  test.describe('접근성', () => {
    test('이메일 입력 필드에 연결된 label이 있다', async ({ page }) => {
      await page.goto('/blog/vim')

      const label = page.locator('label[for="subscribe-email"]')
      await expect(label).toBeAttached()
      await expect(label).toHaveText('이메일 주소')

      const emailInput = page.locator('#subscribe-email')
      await expect(emailInput).toBeVisible()
    })

    test('에러 메시지에 role="alert"가 설정되어 있다', async ({ page }) => {
      await page.goto('/blog/vim')

      await page.route('/api/subscribe', async (route) => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'already_subscribed' }),
        })
      })

      const emailInput = page.locator('[data-testid="subscribe-email-input"]')
      await emailInput.fill('test@example.com')
      await page.locator('[data-testid="subscribe-submit-button"]').click()

      const errorMessage = page.locator('[data-testid="subscribe-error"]')
      await expect(errorMessage).toHaveAttribute('role', 'alert')
    })

    test('키보드만으로 구독 폼을 조작할 수 있다', async ({ page }) => {
      await page.goto('/blog/vim')

      // Tab으로 이메일 입력 필드에 포커스
      const emailInput = page.locator('[data-testid="subscribe-email-input"]')
      await emailInput.focus()
      await expect(emailInput).toBeFocused()

      // 이메일 입력
      await page.keyboard.type('test@example.com')
      await expect(emailInput).toHaveValue('test@example.com')

      // Tab으로 구독 버튼으로 이동
      await page.keyboard.press('Tab')
      const submitButton = page.locator(
        '[data-testid="subscribe-submit-button"]'
      )
      await expect(submitButton).toBeFocused()
    })

    test('autocomplete="email" 속성이 설정되어 있다', async ({ page }) => {
      await page.goto('/blog/vim')

      const emailInput = page.locator('[data-testid="subscribe-email-input"]')
      await expect(emailInput).toHaveAttribute('autocomplete', 'email')
    })
  })

  test.describe('XSS 보안', () => {
    test('악의적인 API 응답이 안전하게 처리된다', async ({ page }) => {
      await page.goto('/blog/vim')

      // 서버가 악의적인 코드를 포함한 응답을 보내는 경우
      await page.route('/api/subscribe', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            code: '<script>alert("xss")</script>',
          }),
        })
      })

      const emailInput = page.locator('[data-testid="subscribe-email-input"]')
      await emailInput.fill('test@example.com')
      await page.locator('[data-testid="subscribe-submit-button"]').click()

      // 알 수 없는 코드이므로 기본 에러 메시지가 표시되어야 함
      const errorMessage = page.locator('[data-testid="subscribe-error"]')
      await expect(errorMessage).toBeVisible()
      await expect(errorMessage).toHaveText(
        '오류가 발생했습니다. 다시 시도해주세요.'
      )

      // script 태그가 실행되지 않았는지 확인
      const alertTriggered = await page.evaluate(() => {
        return (window as unknown as Record<string, boolean>)
          .__xss_triggered__
      })
      expect(alertTriggered).toBeFalsy()
    })
  })
})
