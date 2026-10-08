import { useState } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { Input } from './Input.jsx';

export function PasswordInput(props) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeSlash : Eye;

  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
          aria-pressed={visible}
          className="grid size-9 place-items-center rounded-full text-text-muted hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
        >
          <Icon size={20} weight="bold" aria-hidden="true" />
        </button>
      }
    />
  );
}
