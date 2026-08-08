import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-margin-mobile text-center">
      <Link href="/" className="mb-stack-md font-display text-[28px]">
        luwjje
      </Link>
      <p className="label-caps mb-4 text-secondary">404</p>
      <h1 className="font-display text-display-sm">This page does not exist.</h1>
      <p className="mt-4 max-w-[46ch] text-body-lg text-secondary">
        The piece may have been retired, or the link may be mistaken.
      </p>
      <ButtonLink href="/shop" size="lg" className="mt-8">
        Browse the collection
      </ButtonLink>
    </div>
  );
}
