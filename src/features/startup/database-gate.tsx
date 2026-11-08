import { useEffect, useState, type ReactNode } from 'react';

import type { DatabaseStartResult } from '@/database/bootstrap/open-encrypted-database';
import type { ClosableSqlDatabase } from '@/database/connection/sql-database';

import { RecoveryScreen, StartupErrorScreen, StartupLoadingScreen } from './startup-screens';

type GateState = { attempt: number; result: DatabaseStartResult | null };

/**
 * Runs the encrypted-database startup and renders the app only once the database is ready.
 * "Start fresh" and "Try again" both re-run startup: after a quarantine there is no database
 * file any more, so startup creates a new one (state A or E) and the quarantined file is kept.
 */
export function DatabaseGate({
  start,
  children,
}: {
  start: () => Promise<DatabaseStartResult>;
  children: (db: ClosableSqlDatabase) => ReactNode;
}) {
  const [state, setState] = useState<GateState>({ attempt: 0, result: null });

  useEffect(() => {
    let current = true;
    start().then(
      (result) => current && setState((s) => ({ ...s, result })),
      () =>
        current && setState((s) => ({ ...s, result: { status: 'error', reason: 'open-failed' } })),
    );
    return () => {
      current = false;
    };
  }, [start, state.attempt]);

  const retry = () => setState((s) => ({ attempt: s.attempt + 1, result: null }));

  const { result } = state;
  if (result === null) return <StartupLoadingScreen />;
  switch (result.status) {
    case 'ready':
      return <>{children(result.db)}</>;
    case 'recovery':
      return <RecoveryScreen onStartFresh={retry} />;
    case 'error':
      return <StartupErrorScreen reason={result.reason} onRetry={retry} />;
  }
}
