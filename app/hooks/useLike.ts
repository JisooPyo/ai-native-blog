'use client'

import { useState, useEffect, useCallback } from 'react'
import { isPostLiked, setLikedPost } from 'app/lib/localStorage'

interface UseLikeReturn {
  isLiked: boolean
  toggleLike: () => void
}

export function useLike(slug: string): UseLikeReturn {
  const [isLiked, setIsLiked] = useState(false)

  useEffect(() => {
    setIsLiked(isPostLiked(slug))
  }, [slug])

  const toggleLike = useCallback(() => {
    const newLikedState = !isLiked
    setIsLiked(newLikedState)
    setLikedPost(slug, newLikedState)
  }, [slug, isLiked])

  return { isLiked, toggleLike }
}
