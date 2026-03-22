'use client';

import type { InputHTMLAttributes } from 'react';
import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ className, disabled, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          className={cn('pr-12', className)}
          disabled={disabled}
          type={isVisible ? 'text' : 'password'}
          {...props}
        />
        <button
          aria-label={isVisible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={isVisible}
          className="absolute inset-y-1 right-1 flex w-10 items-center justify-center rounded-lg text-foreground-tertiary transition-colors hover:bg-surface-raised hover:text-foreground-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onClick={() => setIsVisible((current) => !current)}
          type="button"
        >
          {isVisible ? (
            <EyeOff aria-hidden="true" className="size-4" />
          ) : (
            <Eye aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>
    );
  }
);

PasswordField.displayName = 'PasswordField';

export { PasswordField };
