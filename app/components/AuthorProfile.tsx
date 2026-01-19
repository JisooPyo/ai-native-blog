import { Author } from 'app/lib/author';

interface AuthorProfileProps {
  author: Author;
  displayNameSuffix?: string;
}

interface AuthorAvatarProps {
  imageUrl: string;
  authorName: string;
  size?: number;
}

function AuthorAvatar({ imageUrl, authorName, size = 64 }: AuthorAvatarProps) {
  return (
    <img
      src={imageUrl}
      alt={authorName}
      width={size}
      height={size}
      className="rounded-full"
    />
  );
}

interface AuthorDetailsProps {
  displayName: string;
  biography: string;
}

function AuthorDetails({ displayName, biography }: AuthorDetailsProps) {
  return (
    <div className="flex-1">
      <p className="font-semibold text-neutral-900 dark:text-neutral-100">
        {displayName}
      </p>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        {biography}
      </p>
    </div>
  );
}

export function AuthorProfile({ author, displayNameSuffix = '' }: AuthorProfileProps) {
  const fullDisplayName = `${author.name}${displayNameSuffix}`;

  return (
    <div className="mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-800">
      <div className="flex items-start space-x-4">
        <AuthorAvatar imageUrl={author.avatar} authorName={author.name} />
        <AuthorDetails displayName={fullDisplayName} biography={author.bio} />
      </div>
    </div>
  );
}
