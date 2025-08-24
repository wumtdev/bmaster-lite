import { cn } from '@/utils';
import { HTMLAttributes } from 'react';
import { Card } from 'react-bootstrap';

export let Panel = ({
	children,
	className,
	...attrs
}: HTMLAttributes<HTMLDivElement>) => {
	return (
		<Card
			className={cn('shadow rounded-2xl overflow-hidden border flex flex-col', className)}
			{...attrs}
		>
			{children}
		</Card>
	);
};

// @ts-ignore
Panel.Header = ({
	children,
	className,
	...attrs
}: HTMLAttributes<HTMLDivElement>) => {
	return (
		<div {...attrs} className={cn('p-4 border-b', className)}>
			{children}
		</div>
	);
};

// @ts-ignore
Panel.Body = ({
	children,
	className,
	...attrs
}: HTMLAttributes<HTMLDivElement>) => {
	return (
		<div {...attrs} className={cn('p-4 bg-gray-50 flex-1', className)}>
			{children}
		</div>
	);
};

export default Panel;
