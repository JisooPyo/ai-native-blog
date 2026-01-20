const LIKED_POSTS_KEY = 'blog-liked-posts'

export function getLikedPosts(): string[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const stored = localStorage.getItem(LIKED_POSTS_KEY)
    if (!stored) {
      return []
    }
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function setLikedPost(slug: string, isLiked: boolean): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const likedPosts = getLikedPosts()

    if (isLiked) {
      if (!likedPosts.includes(slug)) {
        likedPosts.push(slug)
      }
    } else {
      const index = likedPosts.indexOf(slug)
      if (index > -1) {
        likedPosts.splice(index, 1)
      }
    }

    localStorage.setItem(LIKED_POSTS_KEY, JSON.stringify(likedPosts))
  } catch {
    // Silently fail if localStorage is not available
  }
}

export function isPostLiked(slug: string): boolean {
  return getLikedPosts().includes(slug)
}
