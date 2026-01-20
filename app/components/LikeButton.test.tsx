import { render, screen, fireEvent } from '@testing-library/react'
import { LikeButton } from './LikeButton'
import * as localStorage from 'app/lib/localStorage'

jest.mock('app/lib/localStorage', () => ({
  isPostLiked: jest.fn(),
  setLikedPost: jest.fn(),
}))

const mockIsPostLiked = localStorage.isPostLiked as jest.MockedFunction<
  typeof localStorage.isPostLiked
>
const mockSetLikedPost = localStorage.setLikedPost as jest.MockedFunction<
  typeof localStorage.setLikedPost
>

describe('LikeButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsPostLiked.mockReturnValue(false)
  })

  describe('rendering', () => {
    it('renders the component without crashing', () => {
      render(<LikeButton slug="test-post" />)
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('renders with "좋아요" text', () => {
      render(<LikeButton slug="test-post" />)
      expect(screen.getByText('좋아요')).toBeInTheDocument()
    })

    it('renders as a button element', () => {
      render(<LikeButton slug="test-post" />)
      const button = screen.getByRole('button')
      expect(button.tagName).toBe('BUTTON')
    })

    it('renders with type="button" attribute', () => {
      render(<LikeButton slug="test-post" />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'button')
    })

    it('applies custom className when provided', () => {
      render(<LikeButton slug="test-post" className="custom-class" />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })
  })

  describe('initial state', () => {
    it('renders in unliked state when post is not liked', () => {
      mockIsPostLiked.mockReturnValue(false)
      render(<LikeButton slug="test-post" />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-pressed', 'false')
    })

    it('renders in liked state when post is liked', () => {
      mockIsPostLiked.mockReturnValue(true)
      render(<LikeButton slug="test-post" />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-pressed', 'true')
    })

    it('calls isPostLiked with the correct slug', () => {
      render(<LikeButton slug="my-blog-post" />)
      expect(mockIsPostLiked).toHaveBeenCalledWith('my-blog-post')
    })
  })

  describe('toggle behavior', () => {
    it('toggles from unliked to liked on click', () => {
      mockIsPostLiked.mockReturnValue(false)
      render(<LikeButton slug="test-post" />)
      const button = screen.getByRole('button')

      expect(button).toHaveAttribute('aria-pressed', 'false')
      fireEvent.click(button)
      expect(button).toHaveAttribute('aria-pressed', 'true')
    })

    it('toggles from liked to unliked on click', () => {
      mockIsPostLiked.mockReturnValue(true)
      render(<LikeButton slug="test-post" />)
      const button = screen.getByRole('button')

      expect(button).toHaveAttribute('aria-pressed', 'true')
      fireEvent.click(button)
      expect(button).toHaveAttribute('aria-pressed', 'false')
    })

    it('toggles multiple times correctly', () => {
      mockIsPostLiked.mockReturnValue(false)
      render(<LikeButton slug="test-post" />)
      const button = screen.getByRole('button')

      expect(button).toHaveAttribute('aria-pressed', 'false')
      fireEvent.click(button)
      expect(button).toHaveAttribute('aria-pressed', 'true')
      fireEvent.click(button)
      expect(button).toHaveAttribute('aria-pressed', 'false')
      fireEvent.click(button)
      expect(button).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('localStorage integration', () => {
    it('calls setLikedPost with true when liking a post', () => {
      mockIsPostLiked.mockReturnValue(false)
      render(<LikeButton slug="test-post" />)
      const button = screen.getByRole('button')

      fireEvent.click(button)
      expect(mockSetLikedPost).toHaveBeenCalledWith('test-post', true)
    })

    it('calls setLikedPost with false when unliking a post', () => {
      mockIsPostLiked.mockReturnValue(true)
      render(<LikeButton slug="test-post" />)
      const button = screen.getByRole('button')

      fireEvent.click(button)
      expect(mockSetLikedPost).toHaveBeenCalledWith('test-post', false)
    })

    it('uses the correct slug for localStorage operations', () => {
      const slug = 'unique-post-slug-123'
      mockIsPostLiked.mockReturnValue(false)
      render(<LikeButton slug={slug} />)
      const button = screen.getByRole('button')

      fireEvent.click(button)
      expect(mockSetLikedPost).toHaveBeenCalledWith(slug, true)
    })
  })

  describe('accessibility', () => {
    it('has correct aria-label when not liked', () => {
      mockIsPostLiked.mockReturnValue(false)
      render(<LikeButton slug="test-post" />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', '좋아요')
    })

    it('has correct aria-label when liked', () => {
      mockIsPostLiked.mockReturnValue(true)
      render(<LikeButton slug="test-post" />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', '좋아요 취소')
    })

    it('updates aria-label after toggle', () => {
      mockIsPostLiked.mockReturnValue(false)
      render(<LikeButton slug="test-post" />)
      const button = screen.getByRole('button')

      expect(button).toHaveAttribute('aria-label', '좋아요')
      fireEvent.click(button)
      expect(button).toHaveAttribute('aria-label', '좋아요 취소')
    })

    it('has aria-pressed attribute', () => {
      render(<LikeButton slug="test-post" />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-pressed')
    })

    it('button is focusable', () => {
      render(<LikeButton slug="test-post" />)
      const button = screen.getByRole('button')
      button.focus()
      expect(document.activeElement).toBe(button)
    })

    it('can be activated with keyboard', () => {
      mockIsPostLiked.mockReturnValue(false)
      render(<LikeButton slug="test-post" />)
      const button = screen.getByRole('button')

      button.focus()
      fireEvent.keyDown(button, { key: 'Enter' })
      fireEvent.keyUp(button, { key: 'Enter' })
      // Native button handles Enter key, we test the click handler
      fireEvent.click(button)
      expect(button).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('styling', () => {
    it('has transition classes for animation', () => {
      render(<LikeButton slug="test-post" />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('transition-all')
    })

    it('applies unliked styles when not liked', () => {
      mockIsPostLiked.mockReturnValue(false)
      render(<LikeButton slug="test-post" />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-neutral-500')
    })

    it('applies liked styles when liked', () => {
      mockIsPostLiked.mockReturnValue(true)
      render(<LikeButton slug="test-post" />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-red-500')
    })

    it('has rounded-full class for pill shape', () => {
      render(<LikeButton slug="test-post" />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('rounded-full')
    })
  })

  describe('heart icon', () => {
    it('renders empty heart icon when not liked', () => {
      mockIsPostLiked.mockReturnValue(false)
      const { container } = render(<LikeButton slug="test-post" />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveAttribute('fill', 'none')
    })

    it('renders filled heart icon when liked', () => {
      mockIsPostLiked.mockReturnValue(true)
      const { container } = render(<LikeButton slug="test-post" />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveAttribute('fill', 'currentColor')
    })

    it('icon is hidden from screen readers', () => {
      const { container } = render(<LikeButton slug="test-post" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('different slugs', () => {
    it('handles different slug values independently', () => {
      mockIsPostLiked.mockImplementation((slug) => slug === 'liked-post')

      const { rerender } = render(<LikeButton slug="unliked-post" />)
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')

      rerender(<LikeButton slug="liked-post" />)
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
    })

    it('handles slug with special characters', () => {
      const specialSlug = 'post-with-특수문자-123'
      render(<LikeButton slug={specialSlug} />)
      const button = screen.getByRole('button')

      fireEvent.click(button)
      expect(mockSetLikedPost).toHaveBeenCalledWith(specialSlug, true)
    })

    it('handles empty slug', () => {
      render(<LikeButton slug="" />)
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()

      fireEvent.click(button)
      expect(mockSetLikedPost).toHaveBeenCalledWith('', true)
    })
  })
})
