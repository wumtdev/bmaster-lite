import { cn } from '@/utils';
import { HTMLAttributes, useEffect, useRef, useState } from 'react';
import { Check, CheckLg, PencilFill } from 'react-bootstrap-icons';

export const TextProperty = ({
	className,
	disabled,
	onSubmit,
	value,
	...attrs
}: HTMLAttributes<HTMLInputElement> & {
	disabled?: boolean;
	onSubmit?: (v: string) => any;
	value: string;
}) => {
	const [isEditing, setEditing] = useState<boolean>(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isEditing) {
			inputRef.current.focus();
		}
	}, [isEditing]);

	useEffect(() => {
		if (disabled) setEditing(false);
	}, [disabled]);

	const submit = () => {
		if (onSubmit) onSubmit(inputRef.current.value);
		setEditing(false);
	};

	return (
		<div className={cn('flex rounded-md border-2', className)}>
			<input
				{...attrs}
				ref={inputRef}
				disabled={!isEditing}
				value={isEditing ? undefined : value}
				onBlur={() => setEditing(false)}
				onKeyDown={(e) => {
					switch (e.key) {
						case 'Enter':
							submit();
							break;
						case 'Escape':
							setEditing(false);
							break;
					}
				}}
				className='flex-1 bg-gray-50 p-1'
			/>
			<button
				className='bg-gray-200 w-10 h-10'
				disabled={disabled}
				onClick={() => {
					if (isEditing) submit();
					else setEditing(true);
				}}
			>
				{isEditing ? (
					<CheckLg className='m-auto' />
				) : (
					<PencilFill className='m-auto' />
				)}
			</button>
		</div>
	);
};

export default TextProperty;
