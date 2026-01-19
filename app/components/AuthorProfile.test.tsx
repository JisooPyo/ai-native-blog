import { render, screen } from '@testing-library/react';
import { AuthorProfile } from './AuthorProfile';
import { Author } from 'app/lib/author';

describe('AuthorProfile', () => {
  const mockAuthor: Author = {
    name: 'Jisoo Pyo',
    bio: '일단 시작.',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=JP',
  };

  describe('rendering', () => {
    it('renders the component without crashing with required props', () => {
      render(<AuthorProfile author={mockAuthor} />);
      const authorImage = screen.getByRole('img', { name: mockAuthor.name });
      expect(authorImage).toBeInTheDocument();
    });

    it('renders all required elements', () => {
      render(<AuthorProfile author={mockAuthor} />);

      // Check for avatar image
      const avatar = screen.getByRole('img');
      expect(avatar).toBeInTheDocument();

      // Check for author name
      const authorName = screen.getByText(mockAuthor.name);
      expect(authorName).toBeInTheDocument();

      // Check for bio
      const bio = screen.getByText(mockAuthor.bio);
      expect(bio).toBeInTheDocument();
    });

    it('renders the container with correct CSS classes', () => {
      const { container } = render(<AuthorProfile author={mockAuthor} />);
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass(
        'mt-16',
        'pt-8',
        'border-t',
        'border-neutral-200',
        'dark:border-neutral-800'
      );
    });
  });

  describe('props - author', () => {
    it('renders with author name from props', () => {
      render(<AuthorProfile author={mockAuthor} />);
      const authorName = screen.getByText(mockAuthor.name);
      expect(authorName).toBeInTheDocument();
    });

    it('renders with author bio from props', () => {
      render(<AuthorProfile author={mockAuthor} />);
      const bio = screen.getByText(mockAuthor.bio);
      expect(bio).toBeInTheDocument();
    });

    it('renders with author avatar from props', () => {
      render(<AuthorProfile author={mockAuthor} />);
      const avatar = screen.getByRole('img', { name: mockAuthor.name });
      expect(avatar).toHaveAttribute('src', mockAuthor.avatar);
    });

    it('accepts different author data', () => {
      const differentAuthor: Author = {
        name: 'Jane Doe',
        bio: 'Software Engineer',
        avatar: 'https://example.com/avatar.jpg',
      };

      render(<AuthorProfile author={differentAuthor} />);

      expect(screen.getByText(differentAuthor.name)).toBeInTheDocument();
      expect(screen.getByText(differentAuthor.bio)).toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute('src', differentAuthor.avatar);
    });
  });

  describe('props - displayNameSuffix', () => {
    it('renders author name without suffix when not provided', () => {
      render(<AuthorProfile author={mockAuthor} />);
      const authorName = screen.getByText(mockAuthor.name);
      expect(authorName).toBeInTheDocument();
      expect(authorName.textContent).toBe(mockAuthor.name);
    });

    it('renders author name without suffix when empty string is provided', () => {
      render(<AuthorProfile author={mockAuthor} displayNameSuffix="" />);
      const authorName = screen.getByText(mockAuthor.name);
      expect(authorName).toBeInTheDocument();
      expect(authorName.textContent).toBe(mockAuthor.name);
    });

    it('renders author name with suffix when provided', () => {
      render(<AuthorProfile author={mockAuthor} displayNameSuffix=" Sir" />);
      const authorName = screen.getByText(`${mockAuthor.name} Sir`);
      expect(authorName).toBeInTheDocument();
    });

    it('renders author name with different suffixes', () => {
      const { rerender } = render(
        <AuthorProfile author={mockAuthor} displayNameSuffix=" PhD" />
      );
      expect(screen.getByText(`${mockAuthor.name} PhD`)).toBeInTheDocument();

      rerender(<AuthorProfile author={mockAuthor} displayNameSuffix=", MD" />);
      expect(screen.getByText(`${mockAuthor.name}, MD`)).toBeInTheDocument();

      rerender(<AuthorProfile author={mockAuthor} displayNameSuffix=" Jr." />);
      expect(screen.getByText(`${mockAuthor.name} Jr.`)).toBeInTheDocument();
    });

    it('handles special characters in suffix', () => {
      render(<AuthorProfile author={mockAuthor} displayNameSuffix=" (CEO)" />);
      expect(screen.getByText(`${mockAuthor.name} (CEO)`)).toBeInTheDocument();
    });

    it('handles emoji in suffix', () => {
      render(<AuthorProfile author={mockAuthor} displayNameSuffix=" 🚀" />);
      expect(screen.getByText(`${mockAuthor.name} 🚀`)).toBeInTheDocument();
    });
  });

  describe('avatar image (AuthorAvatar component)', () => {
    it('renders with correct src attribute', () => {
      render(<AuthorProfile author={mockAuthor} />);
      const avatar = screen.getByRole('img', { name: mockAuthor.name });
      expect(avatar).toHaveAttribute('src', mockAuthor.avatar);
    });

    it('renders with correct alt attribute', () => {
      render(<AuthorProfile author={mockAuthor} />);
      const avatar = screen.getByRole('img', { name: mockAuthor.name });
      expect(avatar).toHaveAttribute('alt', mockAuthor.name);
    });

    it('renders with default width and height of 64', () => {
      render(<AuthorProfile author={mockAuthor} />);
      const avatar = screen.getByRole('img', { name: mockAuthor.name });
      expect(avatar).toHaveAttribute('width', '64');
      expect(avatar).toHaveAttribute('height', '64');
    });

    it('applies rounded-full CSS class', () => {
      render(<AuthorProfile author={mockAuthor} />);
      const avatar = screen.getByRole('img', { name: mockAuthor.name });
      expect(avatar).toHaveClass('rounded-full');
    });

    it('updates when author prop changes', () => {
      const { rerender } = render(<AuthorProfile author={mockAuthor} />);
      const avatar = screen.getByRole('img');
      expect(avatar).toHaveAttribute('src', mockAuthor.avatar);

      const newAuthor: Author = {
        name: 'New Author',
        bio: 'New bio',
        avatar: 'https://new-avatar.com/image.jpg',
      };
      rerender(<AuthorProfile author={newAuthor} />);
      expect(avatar).toHaveAttribute('src', newAuthor.avatar);
      expect(avatar).toHaveAttribute('alt', newAuthor.name);
    });
  });

  describe('author details (AuthorDetails component)', () => {
    it('displays author name correctly', () => {
      render(<AuthorProfile author={mockAuthor} />);
      const authorName = screen.getByText(mockAuthor.name);
      expect(authorName).toBeInTheDocument();
    });

    it('applies correct CSS classes to author name', () => {
      render(<AuthorProfile author={mockAuthor} />);
      const authorName = screen.getByText(mockAuthor.name);
      expect(authorName).toHaveClass(
        'font-semibold',
        'text-neutral-900',
        'dark:text-neutral-100'
      );
    });

    it('renders author name in a paragraph element', () => {
      render(<AuthorProfile author={mockAuthor} />);
      const authorName = screen.getByText(mockAuthor.name);
      expect(authorName.tagName).toBe('P');
    });

    it('displays bio text correctly', () => {
      render(<AuthorProfile author={mockAuthor} />);
      const bio = screen.getByText(mockAuthor.bio);
      expect(bio).toBeInTheDocument();
    });

    it('applies correct CSS classes to bio', () => {
      render(<AuthorProfile author={mockAuthor} />);
      const bio = screen.getByText(mockAuthor.bio);
      expect(bio).toHaveClass(
        'mt-1',
        'text-sm',
        'text-neutral-600',
        'dark:text-neutral-400'
      );
    });

    it('renders bio in a paragraph element', () => {
      render(<AuthorProfile author={mockAuthor} />);
      const bio = screen.getByText(mockAuthor.bio);
      expect(bio.tagName).toBe('P');
    });
  });

  describe('layout and structure', () => {
    it('renders avatar and content in a flex container', () => {
      const { container } = render(<AuthorProfile author={mockAuthor} />);
      const flexContainer = container.querySelector('.flex.items-start.space-x-4');
      expect(flexContainer).toBeInTheDocument();
    });

    it('renders name and bio within a flex-1 container', () => {
      const { container } = render(<AuthorProfile author={mockAuthor} />);
      const contentContainer = container.querySelector('.flex-1');
      expect(contentContainer).toBeInTheDocument();

      // Verify name and bio are within this container
      const authorName = screen.getByText(mockAuthor.name);
      const bio = screen.getByText(mockAuthor.bio);
      expect(contentContainer).toContainElement(authorName);
      expect(contentContainer).toContainElement(bio);
    });

    it('positions avatar before text content', () => {
      const { container } = render(<AuthorProfile author={mockAuthor} />);
      const flexContainer = container.querySelector('.flex.items-start.space-x-4');
      const avatar = screen.getByRole('img');
      const textContainer = container.querySelector('.flex-1');

      expect(flexContainer?.children[0]).toContainElement(avatar);
      expect(flexContainer?.children[1]).toBe(textContainer);
    });
  });

  describe('accessibility', () => {
    it('provides accessible alt text for avatar image', () => {
      render(<AuthorProfile author={mockAuthor} />);
      const avatar = screen.getByRole('img', { name: mockAuthor.name });
      expect(avatar).toHaveAccessibleName(mockAuthor.name);
    });

    it('renders text content that is accessible to screen readers', () => {
      render(<AuthorProfile author={mockAuthor} />);

      const authorName = screen.getByText(mockAuthor.name);
      const bio = screen.getByText(mockAuthor.bio);

      expect(authorName).toBeVisible();
      expect(bio).toBeVisible();
    });

    it('maintains proper heading hierarchy with semantic elements', () => {
      const { container } = render(<AuthorProfile author={mockAuthor} />);

      // Check that name and bio are in paragraph elements for screen readers
      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs.length).toBe(2);
    });
  });

  describe('edge cases - author name', () => {
    it('handles empty author name', () => {
      const authorWithEmptyName: Author = {
        name: '',
        bio: 'Test bio',
        avatar: 'https://example.com/avatar.jpg',
      };
      const { container } = render(<AuthorProfile author={authorWithEmptyName} />);

      // When alt is empty, image gets role="presentation"
      const avatar = container.querySelector('img');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('alt', '');
    });

    it('handles author name with special characters', () => {
      const authorWithSpecialChars: Author = {
        name: "O'Brien-Smith & Co.",
        bio: 'Test bio',
        avatar: 'https://example.com/avatar.jpg',
      };
      render(<AuthorProfile author={authorWithSpecialChars} />);

      const authorName = screen.getByText(authorWithSpecialChars.name);
      expect(authorName).toBeInTheDocument();
    });

    it('handles author name with Unicode characters', () => {
      const authorWithUnicode: Author = {
        name: '김철수',
        bio: 'Test bio',
        avatar: 'https://example.com/avatar.jpg',
      };
      render(<AuthorProfile author={authorWithUnicode} />);

      const authorName = screen.getByText(authorWithUnicode.name);
      expect(authorName).toBeInTheDocument();
    });

    it('handles very long author name', () => {
      const authorWithLongName: Author = {
        name: 'A Very Long Author Name That Might Wrap To Multiple Lines In The UI',
        bio: 'Test bio',
        avatar: 'https://example.com/avatar.jpg',
      };
      render(<AuthorProfile author={authorWithLongName} />);

      const authorName = screen.getByText(authorWithLongName.name);
      expect(authorName).toBeInTheDocument();
      expect(authorName).toBeVisible();
    });

    it('handles name with only whitespace', () => {
      const authorWithWhitespaceName: Author = {
        name: '   ',
        bio: 'Test bio',
        avatar: 'https://example.com/avatar.jpg',
      };
      render(<AuthorProfile author={authorWithWhitespaceName} />);

      const avatar = screen.getByRole('img');
      expect(avatar).toBeInTheDocument();
    });
  });

  describe('edge cases - bio', () => {
    it('handles empty bio string', () => {
      const authorWithEmptyBio: Author = {
        name: 'Test User',
        bio: '',
        avatar: 'https://example.com/avatar.jpg',
      };
      render(<AuthorProfile author={authorWithEmptyBio} />);

      // Component should still render without crashing
      const avatar = screen.getByRole('img');
      expect(avatar).toBeInTheDocument();
      const authorName = screen.getByText(authorWithEmptyBio.name);
      expect(authorName).toBeInTheDocument();
    });

    it('handles bio with Unicode characters and emojis', () => {
      const authorWithUnicodeBio: Author = {
        name: 'Test User',
        bio: '안녕하세요! 🚀 Hello World 🌍',
        avatar: 'https://example.com/avatar.jpg',
      };
      render(<AuthorProfile author={authorWithUnicodeBio} />);

      const bio = screen.getByText(authorWithUnicodeBio.bio);
      expect(bio).toBeInTheDocument();
    });

    it('handles very long bio text', () => {
      const authorWithLongBio: Author = {
        name: 'Test User',
        bio: 'This is a very long biography that contains multiple sentences and could potentially wrap to many lines in the UI. It tests how the component handles extensive biographical information that might exceed typical length expectations. The bio continues with even more text to ensure proper handling.',
        avatar: 'https://example.com/avatar.jpg',
      };
      render(<AuthorProfile author={authorWithLongBio} />);

      const bio = screen.getByText(authorWithLongBio.bio);
      expect(bio).toBeInTheDocument();
      expect(bio).toBeVisible();
    });

    it('handles bio with line breaks and special formatting', () => {
      const authorWithFormattedBio: Author = {
        name: 'Test User',
        bio: 'Line 1\nLine 2\nLine 3',
        avatar: 'https://example.com/avatar.jpg',
      };
      render(<AuthorProfile author={authorWithFormattedBio} />);

      // Use a more flexible matcher for content with line breaks
      const bio = screen.getByText((content, element) => {
        return element?.textContent === authorWithFormattedBio.bio;
      });
      expect(bio).toBeInTheDocument();
    });

    it('handles bio with HTML-like content (should render as plain text)', () => {
      const authorWithHtmlBio: Author = {
        name: 'Test User',
        bio: '<script>alert("test")</script>',
        avatar: 'https://example.com/avatar.jpg',
      };
      render(<AuthorProfile author={authorWithHtmlBio} />);

      const bio = screen.getByText(authorWithHtmlBio.bio);
      expect(bio).toBeInTheDocument();
      expect(bio.textContent).toBe(authorWithHtmlBio.bio);
    });
  });

  describe('edge cases - avatar', () => {
    it('handles different avatar URL formats', () => {
      const authors = [
        {
          name: 'User 1',
          bio: 'Bio 1',
          avatar: 'https://example.com/avatar.jpg',
        },
        {
          name: 'User 2',
          bio: 'Bio 2',
          avatar: 'https://cdn.example.com/users/avatar.png',
        },
        {
          name: 'User 3',
          bio: 'Bio 3',
          avatar: '/local/path/avatar.svg',
        },
      ];

      authors.forEach((author) => {
        const { unmount } = render(<AuthorProfile author={author} />);
        const avatar = screen.getByRole('img', { name: author.name });
        expect(avatar).toHaveAttribute('src', author.avatar);
        unmount();
      });
    });

    it('handles data URI for avatar', () => {
      const authorWithDataUri: Author = {
        name: 'Test User',
        bio: 'Test bio',
        avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };
      render(<AuthorProfile author={authorWithDataUri} />);

      const avatar = screen.getByRole('img');
      expect(avatar).toHaveAttribute('src', authorWithDataUri.avatar);
    });

    it('handles empty avatar string', () => {
      const authorWithEmptyAvatar: Author = {
        name: 'Test User',
        bio: 'Test bio',
        avatar: '',
      };
      render(<AuthorProfile author={authorWithEmptyAvatar} />);

      const avatar = screen.getByRole('img');
      expect(avatar).toHaveAttribute('src', '');
    });
  });

  describe('component composition', () => {
    it('renders all sub-components correctly', () => {
      const { container } = render(<AuthorProfile author={mockAuthor} />);

      // Verify AuthorAvatar is rendered
      const avatar = screen.getByRole('img');
      expect(avatar).toBeInTheDocument();

      // Verify AuthorDetails is rendered with its children
      const authorName = screen.getByText(mockAuthor.name);
      const bio = screen.getByText(mockAuthor.bio);
      expect(authorName).toBeInTheDocument();
      expect(bio).toBeInTheDocument();

      // Verify proper nesting
      const flexContainer = container.querySelector('.flex-1');
      expect(flexContainer).toContainElement(authorName);
      expect(flexContainer).toContainElement(bio);
    });

    it('passes correct props to sub-components', () => {
      render(<AuthorProfile author={mockAuthor} displayNameSuffix=" Sir" />);

      // Verify AuthorAvatar receives correct props
      const avatar = screen.getByRole('img');
      expect(avatar).toHaveAttribute('src', mockAuthor.avatar);
      expect(avatar).toHaveAttribute('alt', mockAuthor.name);
      expect(avatar).toHaveAttribute('width', '64');
      expect(avatar).toHaveAttribute('height', '64');

      // Verify AuthorDetails receives correct display name (with suffix)
      const authorName = screen.getByText(`${mockAuthor.name} Sir`);
      expect(authorName).toBeInTheDocument();
    });
  });

  describe('re-rendering behavior', () => {
    it('updates when author prop changes', () => {
      const { rerender } = render(<AuthorProfile author={mockAuthor} />);

      expect(screen.getByText(mockAuthor.name)).toBeInTheDocument();
      expect(screen.getByText(mockAuthor.bio)).toBeInTheDocument();

      const newAuthor: Author = {
        name: 'Jane Doe',
        bio: 'New biography',
        avatar: 'https://new-avatar.com/image.jpg',
      };
      rerender(<AuthorProfile author={newAuthor} />);

      expect(screen.getByText(newAuthor.name)).toBeInTheDocument();
      expect(screen.getByText(newAuthor.bio)).toBeInTheDocument();
      expect(screen.queryByText(mockAuthor.name)).not.toBeInTheDocument();
      expect(screen.queryByText(mockAuthor.bio)).not.toBeInTheDocument();
    });

    it('updates when displayNameSuffix prop changes', () => {
      const { rerender } = render(<AuthorProfile author={mockAuthor} />);
      expect(screen.getByText(mockAuthor.name)).toBeInTheDocument();

      rerender(<AuthorProfile author={mockAuthor} displayNameSuffix=" PhD" />);
      expect(screen.getByText(`${mockAuthor.name} PhD`)).toBeInTheDocument();
      expect(screen.queryByText(mockAuthor.name)).not.toBeInTheDocument();

      rerender(<AuthorProfile author={mockAuthor} displayNameSuffix="" />);
      expect(screen.getByText(mockAuthor.name)).toBeInTheDocument();
    });

    it('handles rapid prop changes', () => {
      const { rerender } = render(<AuthorProfile author={mockAuthor} />);

      for (let i = 0; i < 5; i++) {
        const tempAuthor: Author = {
          name: `Author ${i}`,
          bio: `Bio ${i}`,
          avatar: `https://example.com/avatar${i}.jpg`,
        };
        rerender(<AuthorProfile author={tempAuthor} />);
        expect(screen.getByText(`Author ${i}`)).toBeInTheDocument();
      }
    });
  });

  describe('snapshot testing', () => {
    it('matches snapshot with required props only', () => {
      const { container } = render(<AuthorProfile author={mockAuthor} />);
      expect(container).toMatchSnapshot();
    });

    it('matches snapshot with all props', () => {
      const { container } = render(
        <AuthorProfile author={mockAuthor} displayNameSuffix=" Sir" />
      );
      expect(container).toMatchSnapshot();
    });

    it('matches snapshot with different author data', () => {
      const differentAuthor: Author = {
        name: 'John Smith',
        bio: 'Full-stack developer with passion for open source',
        avatar: 'https://different-avatar.com/image.png',
      };
      const { container } = render(
        <AuthorProfile author={differentAuthor} displayNameSuffix=", PhD" />
      );
      expect(container).toMatchSnapshot();
    });
  });
});
