import { Skeleton } from '@/components/ui/skeleton';

import { AuthCard } from './AuthCard';

type AuthCardSkeletonProps = {
  title?: string;
  description?: string;
};

export function AuthCardSkeleton({
  title = 'Carregando acesso',
  description = 'Preparando o fluxo de autenticação...',
}: AuthCardSkeletonProps) {
  return (
    <AuthCard title={title} description={description}>
      <div aria-busy="true" aria-label="Carregando formulário" className="space-y-5" role="status">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </AuthCard>
  );
}
