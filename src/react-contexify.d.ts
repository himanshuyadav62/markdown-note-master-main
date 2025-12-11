declare module 'react-contexify' {
  import * as React from 'react';

  export interface ItemParams<T = unknown> {
    props?: T;
  }

  export interface ShowContextParams<T = unknown> {
    event: React.MouseEvent;
    props?: T;
  }

  export interface UseContextMenuResult<T = unknown> {
    show: (params: ShowContextParams<T>) => void;
    hideAll: () => void;
  }

  export function useContextMenu<T = unknown>(options: { id: string }): UseContextMenuResult<T>;

  export interface MenuProps {
    id: string;
    children?: React.ReactNode;
    className?: string;
  }

  export const Menu: React.FC<MenuProps>;

  export interface ItemProps<T = unknown> {
    children?: React.ReactNode;
    onClick?: (params: ItemParams<T>) => void;
    disabled?: boolean;
    className?: string;
  }

  export const Item: React.FC<ItemProps>;
}
