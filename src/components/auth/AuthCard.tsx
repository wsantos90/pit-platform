import { useId } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

type AuthCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  footerClassName?: string;
};

export function AuthCard({
  title,
  description,
  children,
  footer,
  className,
  contentClassName,
  footerClassName,
}: AuthCardProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Card
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className={cn(
        'w-full overflow-hidden rounded-[28px] border border-border/15 bg-card/95 shadow-[0_24px_80px_hsl(var(--background)/0.45)] backdrop-blur-sm',
        className
      )}
      role="region"
    >
      <CardHeader className="space-y-3 border-b border-border/10 px-6 pb-0 pt-6 sm:px-8 sm:pt-8">
        <CardTitle className="text-section-title text-foreground" id={titleId}>
          {title}
        </CardTitle>
        <CardDescription
          className="max-w-[34ch] text-body-sm leading-6 text-foreground-secondary"
          id={descriptionId}
        >
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className={cn('px-6 pb-6 pt-5 sm:px-8 sm:pb-8', contentClassName)}>
        {children}
      </CardContent>
      {footer ? (
        <CardFooter
          className={cn(
            'flex justify-center border-t border-border/10 px-6 py-5 sm:px-8',
            footerClassName
          )}
        >
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  );
}
