import { useCallback, useEffect, useRef, useState } from 'react';
export function useApiResource(loader) {
    const [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
    const version = useRef(0);
    const reload = useCallback(async () => { const id = ++version.current; setLoading(true); setError(''); try {
        const value = await loader();
        if (id === version.current)
            setData(value);
    }
    catch (e) {
        if (id === version.current)
            setError(e.message || 'Không thể tải dữ liệu.');
    }
    finally {
        if (id === version.current)
            setLoading(false);
    } }, [loader]);
    useEffect(() => { setData(null); void reload(); return () => { version.current++; }; }, [reload]);
    return { data, loading, error, reload };
}
