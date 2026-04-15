import Link from 'next/link';
import type { AnchorHTMLAttributes, CSSProperties, ReactNode } from 'react';

import { normalizeHref } from '@/app/lib/public-content';

interface SafeLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  children: ReactNode;
  className: string;
  href: string;
  style?: CSSProperties;
}

function isExternalHref(href: string) {
  return href.startsWith('http://') || href.startsWith('https://');
}

export function SafeLink({ href, className, children, style, target, rel, ...rest }: SafeLinkProps) {
  const normalizedHref = normalizeHref(href);

  if (!normalizedHref) {
    return (
      <span {...rest} className={className} style={style}>
        {children}
      </span>
    );
  }

  if (isExternalHref(normalizedHref)) {
    const safeRel = ['noopener', 'noreferrer', rel].filter(Boolean).join(' ');
    return (
      <a {...rest} href={normalizedHref} target={target ?? '_blank'} rel={safeRel} className={className} style={style}>
        {children}
      </a>
    );
  }

  return (
    <Link {...rest} href={normalizedHref} className={className} style={style} target={target} rel={rel}>
      {children}
    </Link>
  );
}