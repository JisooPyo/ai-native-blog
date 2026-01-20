import { test, expect } from '@playwright/test'

test.describe('Blog Navigation', () => {
  test.describe('Homepage', () => {
    test('should display homepage with basic elements', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('h1')).toHaveText('My Portfolio')

      await expect(page.locator('nav#nav')).toBeVisible()

      const homeLink = page.locator('nav#nav a[href="/"]')
      const blogLink = page.locator('nav#nav a[href="/blog"]')
      await expect(homeLink).toHaveText('home')
      await expect(blogLink).toHaveText('blog')

      await expect(page.locator('section')).toBeVisible()
    })

    test('should display blog posts on homepage', async ({ page }) => {
      await page.goto('/')

      const blogPostLinks = page.locator('a[href^="/blog/"]')
      await expect(blogPostLinks.first()).toBeVisible()

      const postCount = await blogPostLinks.count()
      expect(postCount).toBeGreaterThan(0)
    })
  })

  test.describe('Blog List Page', () => {
    test('should display blog list page with posts', async ({ page }) => {
      await page.goto('/blog')

      await expect(page.locator('h1')).toHaveText('My Blog')

      const blogPostLinks = page.locator('a[href^="/blog/"]')
      await expect(blogPostLinks.first()).toBeVisible()

      const postCount = await blogPostLinks.count()
      expect(postCount).toBeGreaterThan(0)
    })

    test('should navigate to blog list from homepage', async ({ page }) => {
      await page.goto('/')

      await page.click('nav#nav a[href="/blog"]')

      await expect(page).toHaveURL('/blog')
      await expect(page.locator('h1')).toHaveText('My Blog')
    })

    test('should display post titles and dates', async ({ page }) => {
      await page.goto('/blog')

      const firstPostLink = page.locator('a[href^="/blog/"]').first()
      const postTitle = firstPostLink.locator('p.text-neutral-900, p.dark\\:text-neutral-100')
      const postDate = firstPostLink.locator('p.text-neutral-600, p.dark\\:text-neutral-400')

      await expect(postTitle).toBeVisible()
      await expect(postDate).toBeVisible()
    })
  })

  test.describe('Individual Blog Post Page', () => {
    test('should navigate to individual blog post and display content', async ({ page }) => {
      await page.goto('/blog')

      const firstPostLink = page.locator('a[href^="/blog/"]').first()
      const postHref = await firstPostLink.getAttribute('href')

      await firstPostLink.click()

      await expect(page).toHaveURL(postHref!)

      await expect(page.locator('h1.title')).toBeVisible()

      await expect(page.locator('article.prose')).toBeVisible()
    })

    test('should display blog post with correct structure', async ({ page }) => {
      await page.goto('/blog/vim')

      await expect(page.locator('h1.title')).toHaveText(
        'Embracing Vim: The Unsung Hero of Code Editors'
      )

      await expect(page.locator('article.prose')).toBeVisible()

      await expect(page.locator('article.prose h2')).toHaveCount(5)

      await expect(page.locator('[data-testid="author-profile"]')).toBeVisible()
    })

    test('should display author profile on blog post', async ({ page }) => {
      await page.goto('/blog/vim')

      const authorProfile = page.locator('[data-testid="author-profile"]')
      await expect(authorProfile).toBeVisible()

      await expect(authorProfile.locator('[data-testid="author-avatar"]')).toBeVisible()
      await expect(authorProfile.locator('[data-testid="author-name"]')).toBeVisible()
      await expect(authorProfile.locator('[data-testid="author-bio"]')).toBeVisible()
    })

    test('should navigate back to blog list from post', async ({ page }) => {
      await page.goto('/blog/vim')

      await page.click('nav#nav a[href="/blog"]')

      await expect(page).toHaveURL('/blog')
      await expect(page.locator('h1')).toHaveText('My Blog')
    })

    test('should return 404 for non-existent post', async ({ page }) => {
      const response = await page.goto('/blog/non-existent-post')
      expect(response?.status()).toBe(404)
    })
  })
})
