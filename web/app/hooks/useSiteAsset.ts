import { useState, useEffect } from 'react';
import { getSiteAsset } from 'shared/siteAssetService';
import { SiteAsset } from 'shared/types';

/**
 * Custom hook to fetch a site asset by name
 * @param name - The unique name of the asset (e.g., 'logo', 'homepage-hero')
 * @returns Object containing the asset data, loading state, and error
 */
export function useSiteAsset(name: string) {
  const [data, setData] = useState<SiteAsset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchAsset = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const asset = await getSiteAsset(name);
        
        if (isMounted) {
          setData(asset);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch site asset'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAsset();

    return () => {
      isMounted = false;
    };
  }, [name]);

  return { data, isLoading, error };
}