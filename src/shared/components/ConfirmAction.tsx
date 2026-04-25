import type { ReactNode } from 'react';
import { Popconfirm } from 'antd';

interface ConfirmActionProps {
  title: string;
  description?: string;
  onConfirm: () => void;
  children: ReactNode;
}

export function ConfirmAction({ title, description, onConfirm, children }: ConfirmActionProps) {
  return (
    <Popconfirm title={title} description={description} onConfirm={onConfirm}>
      {children}
    </Popconfirm>
  );
}

