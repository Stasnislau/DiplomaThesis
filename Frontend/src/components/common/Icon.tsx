import React from 'react';
import cn from 'classnames';

export interface IconProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  src?: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  alt?: string;
  fill?: string;
}

const Icon = React.forwardRef<HTMLDivElement, IconProps>(
  ({ className, src: SvgIcon, alt, fill, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-center', className)}
        {...props}
        aria-label={alt}
        // An image role without a name is a serious WCAG failure, so an icon
        // that carries no caption is decoration and announces itself as such.
        role={alt ? 'img' : 'presentation'}
      >
        {SvgIcon && <SvgIcon aria-hidden={!alt} style={{ color: fill }} />}
      </div>
    );
  }
);

Icon.displayName = 'Icon';
export default Icon;
