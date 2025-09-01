import { PropsWithChildren, ReactElement } from 'react';

interface ButtonProps {
  type?: 'submit' | 'reset' | 'button';
  color?: 'white' | 'primary' | 'accent' | 'green' | 'red' | 'gray'; // defaults to primary
  bold?: boolean;
  className?: string;
  icon?: ReactElement;
}

export function SolidButton(
  props: PropsWithChildren<ButtonProps & React.HTMLProps<HTMLButtonElement>>,
) {
  const {
    type,
    onClick,
    color: _color,
    className,
    bold,
    icon,
    disabled,
    title,
    ...passThruProps
  } = props;
  const color = _color ?? 'primary';

  const base =
    'flex items-center justify-center rounded-lg transition-all duration-500 active:scale-95 border';
  let baseColors, onHover;
  if (color === 'primary') {
    baseColors = 'bg-nym-green-primary text-black border-transparent';
    onHover = 'hover:border-nym-green-dark';
  } else if (color === 'accent') {
    baseColors = 'bg-nym-green-primary text-black border-transparent';
    onHover = 'hover:border-nym-green-dark';
  } else if (color === 'green') {
    baseColors = 'bg-nym-green-primary text-black border-transparent';
    onHover = 'hover:border-nym-green-dark';
  } else if (color === 'red') {
    baseColors = 'bg-nym-green-primary text-black border-transparent';
    onHover = 'hover:border-nym-green-dark';
  } else if (color === 'white') {
    baseColors = 'bg-white text-black border-transparent';
    onHover = 'hover:border-nym-green-primary';
  } else if (color === 'gray') {
    baseColors = 'bg-nym-gray-lightest text-nym-gray-darkest border-nym-gray-lighter';
    onHover = 'hover:border-nym-gray-light';
  }
  const onDisabled = 'disabled:bg-nym-gray-lighter disabled:text-nym-gray-medium disabled:border-nym-gray-lighter';
  const weight = bold ? 'font-semibold' : '';
  const allClasses = `${base} ${baseColors} ${onHover} ${onDisabled} ${weight} ${className}`;

  return (
    <button
      onClick={onClick}
      type={type ?? 'button'}
      disabled={disabled ?? false}
      title={title}
      className={allClasses}
      {...passThruProps}
    >
      {icon ? (
        <div className="flex items-center justify-center space-x-1">
          {props.icon}
          {props.children}
        </div>
      ) : (
        <>{props.children}</>
      )}
    </button>
  );
}
