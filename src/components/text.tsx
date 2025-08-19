import { cn } from '@/utils';
import { HTMLAttributes } from 'react';

export const H1 = ({
	children,
	className,
	...attrs
}: HTMLAttributes<HTMLHeadingElement>) => (
	<h1
		className={cn('text-3xl font-semibold text-slate-600 mb-4', className)}
		{...attrs}
	>
		{children}
	</h1>
);

export const H2 = ({
	children,
	className,
	...attrs
}: HTMLAttributes<HTMLHeadingElement>) => (
	<h2
		className={cn('text-lg font-medium text-slate-600', className)}
		{...attrs}
	>
		{children}
	</h2>
);

export const Name = ({
	children,
	className,
	...attrs
}: HTMLAttributes<HTMLHeadingElement>) => (
	<h2
		className={cn('text-sm text-slate-600', className)}
		{...attrs}
	>
		{children}
	</h2>
);

export const Value = ({
	children,
	className,
	...attrs
}: HTMLAttributes<HTMLHeadingElement>) => (
	<h2
		className={cn('text-md font-medium', className)}
		{...attrs}
	>
		{children}
	</h2>
);

export const Note = ({
	children,
	className,
	...attrs
}: HTMLAttributes<HTMLHeadingElement>) => (
	<h2
		className={cn('text-slate-400 text-sm', className)}
		{...attrs}
	>
		{children}
	</h2>
);
