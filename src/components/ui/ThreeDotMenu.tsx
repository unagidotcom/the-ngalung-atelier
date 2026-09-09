import React, { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';

export interface ThreeDotMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
  disabled?: boolean;
}

interface ThreeDotMenuProps {
  label?: string;
  items: ThreeDotMenuItem[];
  align?: 'left' | 'right';
  buttonClassName?: string;
  menuClassName?: string;
}

export const ThreeDotMenu: React.FC<ThreeDotMenuProps> = ({
  label = 'More options',
  items,
  align = 'right',
  buttonClassName = '',
  menuClassName = ''
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className={`flex h-9 w-9 items-center justify-center rounded-full border border-[#E7DFCE] bg-white text-[#404252] shadow-2xs hover:bg-[#F3EDE0] hover:text-[#17181F] ${buttonClassName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div
          className={`absolute top-11 z-50 min-w-56 overflow-hidden rounded-2xl border border-[#E7DFCE] bg-white p-1.5 text-[#17181F] shadow-xl ${align === 'right' ? 'right-0' : 'left-0'} ${menuClassName}`}
          role="menu"
        >
          {items.map(item => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                setOpen(false);
                item.onClick();
              }}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
                item.danger
                  ? 'text-red-600 hover:bg-red-50'
                  : item.active
                    ? 'bg-[#17181F] text-[#FAF6EE]'
                    : 'text-[#404252] hover:bg-[#F3EDE0] hover:text-[#17181F]'
              } disabled:cursor-not-allowed disabled:opacity-50`}
              role="menuitem"
            >
              {item.icon && <span className="flex h-4 w-4 items-center justify-center">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThreeDotMenu;
