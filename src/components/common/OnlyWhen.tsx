import type React from 'react';
import type { ReactNode } from 'react';

interface OnlyWhenProps {
  children: ReactNode;
  when: boolean;
}

const OnlyWhen: React.FC<OnlyWhenProps> = (props: OnlyWhenProps) => {
  const { children, when } = props;
  return when ? <>{children}</> : null;
};

const Only = OnlyWhen;

export default Only;
