import { useCallback, useEffect, useState } from 'react';
import { errMsg } from '../api/client';

// Charge des données au montage et à chaque changement de deps. Renvoie { data, loading, error, pagination, body, reload }
export default function useApi(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null, pagination: null, body: null });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    return fetcher()
      .then((r) => setState({ data: r.data.data, loading: false, error: null, pagination: r.data.pagination || null, body: r.data }))
      .catch((e) => setState({ data: null, loading: false, error: errMsg(e), pagination: null, body: null }));
  }, deps);

  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}
