import { cn } from '@/utils';
import { HTMLAttributes } from 'react';

export type ButtonProps = {
	variant: 'primary' | 'danger' | 'outline-danger' | 'secondary' | 'success';
} & HTMLAttributes<HTMLButtonElement>;

export const Button = ({
	children,
	className,
	variant,
	...attrs
}: ButtonProps) => {
	let variantClass = '';
	switch (variant) {
		case 'danger':
		case 'outline-danger':
			variantClass = 'bg-red-600 shadow-red-600 hover:bg-red-700';
			break;
		case 'secondary':
			variantClass = 'bg-gray-500 shadow-gray-500 hover:bg-gray-600';
			break;
		case 'success':
			variantClass = 'bg-green-600 shadow-green-600 hover:bg-green-600';
			break;
		default:
			variantClass = 'bg-blue-500 shadow-blue-500 hover:bg-blue-600';
	}

	return (
		<button
			className={cn(
				variantClass,
				'flex shadow-md border-blue-90000 items-center justify-center gap-2 text-white py-2 px-6 rounded-lg transition',
				className
			)}
			{...attrs}
		>
			{children}
		</button>
	);
};

export default Button;
