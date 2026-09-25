import { ScopedLink } from '@/components/Layout';
import { Empty } from '@/components/Bits';

export default function NotFound() {
  return (
    <Empty>
      Diese Seite gibt es nicht.{' '}
      <ScopedLink href="/" className="text-foreground underline">
        Zur Rangliste
      </ScopedLink>
    </Empty>
  );
}
