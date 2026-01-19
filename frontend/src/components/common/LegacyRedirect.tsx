import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchAnnouncementBySlug } from '../../utils/api';
import { SkeletonLoader } from '../ui/SkeletonLoader';
import { PATHS } from '../../utils/constants';

export function LegacyRedirect() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkRedirect = async () => {
            const itemSlug = searchParams.get('item');
            const tab = searchParams.get('tab');

            // Handle ?item=slug
            if (itemSlug) {
                try {
                    const announcement = await fetchAnnouncementBySlug(itemSlug);
                    if (announcement) {
                        // Redirect to the correct type/slug path
                        navigate(`/${announcement.type}/${announcement.slug}`, { replace: true });
                        return;
                    }
                } catch (error) {
                    console.error('Failed to resolve legacy item URL:', error);
                }
            }

            // Handle ?tab=type
            if (tab) {
                // Map 'job' -> '/jobs', etc. using PATHS constant
                // PATHS keys are ContentType, but tab might be 'jobs' or 'job'
                // Let's normalize
                let targetPath = '/';
                
                // Direct match in PATHS (e.g., 'job', 'result')
                if (tab in PATHS) {
                    targetPath = PATHS[tab];
                } 
                // Handle plural forms if they were used
                else if (tab === 'jobs') targetPath = '/jobs';
                else if (tab === 'results') targetPath = '/results';
                
                navigate(targetPath, { replace: true });
                return;
            }

            // If no valid legacy params, go home
            setLoading(false);
            navigate('/', { replace: true });
        };

        checkRedirect();
    }, [searchParams, navigate]);

    if (loading) {
        return (
            <div style={{ padding: '2rem' }}>
                <p style={{ textAlign: 'center', color: '#666' }}>Redirecting to new URL...</p>
                <SkeletonLoader />
            </div>
        );
    }

    return null;
}
