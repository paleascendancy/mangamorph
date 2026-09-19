'use client';

import { useFormStatus } from 'react-dom';

export function SaveWorkButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="admin-primary-action"
      type="submit"
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? 'Salvando e iniciando...' : 'Salvar obra e iniciar sincronização'}
    </button>
  );
}
