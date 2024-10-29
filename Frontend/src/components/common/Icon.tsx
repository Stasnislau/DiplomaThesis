import React from 'react';
import cn from 'classnames';

export interface IconProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  size?: number;
  src?: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  alt?: string;
  fill?: string;
}

const Icon = React.forwardRef<HTMLDivElement, IconProps>(
  ({ className, size = 24, src: SvgIcon, alt, fill, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-center', className)}
        {...props}
        aria-label={alt}
        role="img"
      >
        {SvgIcon && <SvgIcon aria-hidden={!alt} style={{ color: fill }} />}
      </div>
    );
  }
);

Icon.displayName = 'Icon';
export default Icon;
