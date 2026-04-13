import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ProductMetricCard from './ProductMetricCard';
import { API_BASE_URL } from '@/lib/api-base-url';

interface ProductMetricItem {
  id: number | null;
  name: string;
  price: number;
  image: string;
  totalSold?: number;
  revenue?: number;
}

interface ProductMetricSectionProps {
  title: string;
  endpoint: '/api/products/best-sellers' | '/api/products/top-purchases';
  metricType: 'sold' | 'revenue';
}

const ProductMetricSection = ({ title, endpoint, metricType }: ProductMetricSectionProps) => {
  const [items, setItems] = useState<ProductMetricItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadItems = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!response.ok) {
          throw new Error('Failed to load products');
        }

        const payload = (await response.json()) as { items?: ProductMetricItem[] };
        if (isMounted) {
          setItems(payload.items ?? []);
        }
      } catch {
        if (isMounted) {
          setError('Unable to load data right now.');
          setItems([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadItems();

    return () => {
      isMounted = false;
    };
  }, [endpoint]);

  const formatted = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        metricLabel: metricType === 'sold' ? 'Sold' : 'Revenue',
        metricValue:
          metricType === 'sold'
            ? String(item.totalSold ?? 0)
            : `₹${Number(item.revenue ?? 0).toLocaleString('en-IN')}`,
      })),
    [items, metricType]
  );

  const updateScrollState = () => {
    const element = rowRef.current;
    if (!element) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    setCanScrollLeft(element.scrollLeft > 0);
    setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 2);
  };

  useEffect(() => {
    updateScrollState();
  }, [formatted.length, isLoading, error]);

  useEffect(() => {
    const handleResize = () => updateScrollState();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleScrollBy = (direction: 'left' | 'right') => {
    const element = rowRef.current;
    if (!element) {
      return;
    }

    const scrollAmount = Math.max(280, Math.floor(element.clientWidth * 0.8));
    element.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section className="py-10">
      <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-[60px]">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-black sm:text-3xl">{title}</h2>

          {!isLoading && !error && formatted.length > 0 && (
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => handleScrollBy('left')}
                disabled={!canScrollLeft}
                className="rounded-full border p-2 text-[#8b6d4b] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Scroll ${title} left`}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => handleScrollBy('right')}
                disabled={!canScrollRight}
                className="rounded-full border p-2 text-[#8b6d4b] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Scroll ${title} right`}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="flex gap-5 overflow-x-auto pb-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-[340px] min-w-[260px] animate-pulse rounded-lg border bg-[#f7f7f7] sm:min-w-[320px]" />
            ))}
          </div>
        )}

        {!isLoading && error && <p className="text-sm text-red-600">{error}</p>}

        {!isLoading && !error && formatted.length === 0 && (
          <p className="text-sm text-muted-foreground">No data available</p>
        )}

        {!isLoading && !error && formatted.length > 0 && (
          <div
            ref={rowRef}
            onScroll={updateScrollState}
            className="scrollbar-hide flex gap-5 overflow-x-auto pb-2"
          >
            {formatted.map((item) => (
              <ProductMetricCard
                key={`${title}-${item.id ?? item.name}`}
                id={item.id}
                name={item.name}
                price={Number(item.price ?? 0)}
                image={item.image}
                metricLabel={item.metricLabel}
                metricValue={item.metricValue}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductMetricSection;
