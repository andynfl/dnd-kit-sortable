import { cn } from '@/lib/utils';
import type { PolymorphicProps } from '@/types';

import Text from './text';
import Icon from './icon';

type InteractiveOptions = {
  hover?: boolean;
};

interface ButtonOptions {
  icon: React.ElementType;
  depth?: number;
  interactive?: InteractiveOptions;
}

export function Button<T extends React.ElementType = 'button'>({
  ref,
  children,
  className,
  as: As,
  icon,
  depth = 0,
  interactive = {},
  ...props
}: PolymorphicProps<T, ButtonOptions>) {
  const Comp = As ?? 'button';
  return (
    <Comp
      ref={ref}
      className={cn(
        'group . cursor-default . inline-flex items-center . py-1 w-full . outline-none',
        className,
      )}
      {...props}
    >
      <Text
        variant="body-4"
        className={cn(
          'grow . inline-flex items-center justify-start . h-7 . rounded-md . group-focus:bg-slate-100 group-aria-[current]:bg-accent-100',
          'dark:group-focus:bg-zinc-800 dark:group-aria-[current]:bg-accent-900',
          (interactive.hover ?? true) && 'group-hover:bg-slate-100 dark:group-hover:bg-zinc-800',
        )}
      >
        <span
          className="shrink-0 . w-(--w) h-7"
          style={{
            ['--w' as string]: `calc(1.75rem * ${depth + 1})`,
          }}
        />
        <Icon as={icon} className="opacity-40 . group-aria-[current]:opacity-100" />
        <span className="grow . inline-flex items-center . px-2 . line-clamp-1 text-left">
          {children}
        </span>
      </Text>
    </Comp>
  );
}

export function Input({ ref, className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      ref={ref}
      className={cn(
        'grow . -mx-2 px-2 w-full h-7 . rounded-md outline-none . focus:ring-1 focus:ring-inset focus:ring-accent-700',
        'dark:focus:ring-accent-600',
        className,
      )}
      {...props}
    />
  );
}

type IndicatorOptions = {
  depth?: number;
};

export function Indicator<T extends React.ElementType = 'span'>({
  className,
  style,
  as: As,
  depth = 0,
  ...props
}: PolymorphicProps<T, IndicatorOptions>) {
  const Comp = As ?? 'span';
  return (
    <Comp
      className={cn(
        'absolute left-(--left) right-0 . mt-(--mt) h-(--h) . opacity-0 . data-over:opacity-100',
        'before:absolute before:top-1/2 before:left-0 . before:-translate-y-1/2 . before:box-content before:size-(--before-size) . before:rounded-full before:border-(length:--size) before:border-accent-700',
        'after:absolute after:top-1/2 after:left-(--after-left) after:right-0 . after:-translate-y-1/2 . after:box-content . after:border-t-(length:--size) after:border-accent-700',
        'dark:before:border-accent-600',
        'dark:after:border-accent-600',
        className,
      )}
      style={{
        ['--space' as string]: '0.5rem',
        ['--size' as string]: '0.125rem',
        ['--left' as string]: `calc((1.75rem * ${depth + 1}) - (var(--before-size) / 2))`,
        ['--mt' as string]: 'calc(-1 * (var(--size) + 0.25px))',
        ['--h' as string]: 'var(--size)',
        ['--before-size' as string]: 'calc(var(--space) - var(--size))',
        ['--after-left' as string]: 'var(--space)',
        ...style,
      }}
      {...props}
    />
  );
}
