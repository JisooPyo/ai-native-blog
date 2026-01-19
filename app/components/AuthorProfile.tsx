import { siteAuthor } from 'app/lib/author';

export function AuthorProfile() {
  return (
    <div className="mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-800">
      <div className="flex items-start space-x-4">
        <img
          src={siteAuthor.avatar}
          alt={siteAuthor.name}
          width={64}
          height={64}
          className="rounded-full"
        />
        <div className="flex-1">
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">
            {siteAuthor.name} Sir
          </p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {siteAuthor.bio}
          </p>
        </div>
      </div>
    </div>
  );
}
