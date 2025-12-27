import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useTenantName(tenantId?: string) {
    const [tenantName, setTenantName] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTenantName() {
            if (!tenantId) {
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('tenants')
                    .select('name')
                    .eq('id', tenantId)
                    .single();

                if (error) {
                    console.error('Error fetching tenant name:', error);
                    setTenantName('');
                } else {
                    setTenantName(data?.name || '');
                }
            } catch (err) {
                console.error('Error:', err);
                setTenantName('');
            } finally {
                setLoading(false);
            }
        }

        fetchTenantName();
    }, [tenantId]);

    return { tenantName, loading };
}
