
import React from 'react';
import { icons } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

export type IconName = keyof typeof icons;

type IconProps = LucideProps & {
  name: IconName;
};

export const Icon: React.FC<IconProps> = ({ name, ...props }) => {
  const LucideIcon = icons[name];
  if (!LucideIcon) {
    return null;
  }
  return <LucideIcon {...props} />;
};
