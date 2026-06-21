import { ComponentProps } from 'react';

interface ButtonProps extends Omit<ComponentProps<'button'>, 'type'> {
  variant?: 'primary' | 'danger' | 'success' | 'default';
}

export function Button({ variant = 'default', className = '', children, ...props }: ButtonProps) {
  const baseClasses = 'px-4 py-1.5 rounded font-medium text-sm transition-colors';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    danger: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900',
    success: 'bg-green-600 text-white hover:bg-green-700',
    default: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
