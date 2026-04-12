import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShoppingBag, Star } from 'lucide-react';
import { productsConfig } from '../config';
import type { Product } from '@/types/product';
import { API_BASE_URL } from '@/lib/api-base-url';

interface ProductsProps {
  onAddToCart: (product: Product) => void;
}

const Products = ({ onAddToCart }: ProductsProps) => {
  if (!productsConfig.heading) return null;

  const navigate = useNavigate();
  const categoryScrollerRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [addedItems, setAddedItems] = useState<number[]>([]);

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const payload = (await response.json()) as { items: Product[] };
        setProducts(payload.items ?? []);
      } catch {
        setError('Unable to load products right now.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadProducts();
  }, []);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(products.map((product) => product.category)))],
    [products]
  );

  const categoryTiles = useMemo(() => {
    return categories
      .filter((category) => category !== 'All')
      .map((category) => {
        const firstProduct = products.find((product) => product.category === category);
        return {
          category,
          image: firstProduct?.image,
        };
      })
      .slice(0, 12);
  }, [categories, products]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'All') {
      return products;
    }
    return products.filter((product) => product.category === activeCategory);
  }, [activeCategory, products]);

  const bestSellers = filteredProducts.slice(0, 12);

  const handleAddToCart = (product: Product) => {
    onAddToCart(product);
    setAddedItems((prev) => [...prev, product.id]);
    setTimeout(() => {
      setAddedItems((prev) => prev.filter((id) => id !== product.id));
    }, 1500);
  };

  const scrollCategoryRail = (direction: 'left' | 'right') => {
    if (!categoryScrollerRef.current) return;
    categoryScrollerRef.current.scrollBy({
      left: direction === 'left' ? -340 : 340,
      behavior: 'smooth',
    });
  };

  const truncate = (value: string, maxLength: number) =>
    value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;

  const getDiscountPercent = (id: number) => 12 + ((id * 7) % 38);
  const getRating = (id: number) => 3.9 + ((id % 10) / 10);

  return (
    <section id="products" className="bg-[#f4f6f8] pb-16 pt-10 md:pb-20">
      <div className="mx-auto max-w-[1240px] px-4 md:px-6">
        <div>
          <h2 className="mb-8 font-display text-[36px] font-semibold text-[#1f2730] md:text-[48px]">Shop By Category</h2>

          {categoryTiles.length > 0 && (
            <div className="relative mb-14">
              <button
                onClick={() => scrollCategoryRail('left')}
                className="absolute -left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#0f5da0] shadow md:flex"
                aria-label="Scroll categories left"
              >
                <ChevronLeft size={20} />
              </button>

              <div
                ref={categoryScrollerRef}
                className="scrollbar-hide flex gap-5 overflow-x-auto rounded-sm border border-[#d8dee4] bg-white px-5 py-6"
              >
                {categoryTiles.map((tile) => (
                  <button
                    key={tile.category}
                    onClick={() => setActiveCategory(tile.category)}
                    className={`min-w-[150px] text-center ${activeCategory === tile.category ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
                  >
                    <div className="mx-auto h-[82px] w-[82px] overflow-hidden rounded-full border border-[#d7dde3] bg-[#f2f5f8]">
                      {tile.image ? (
                        <img src={tile.image} alt={tile.category} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-[#e8edf2]" />
                      )}
                    </div>
                    <p className="mt-4 text-[15px] font-medium leading-6 text-[#283646]">{tile.category}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={() => scrollCategoryRail('right')}
                className="absolute -right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#0f5da0] shadow md:flex"
                aria-label="Scroll categories right"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h3 className="font-display text-[36px] font-semibold text-[#202a34] md:text-[48px]">Best Sellers</h3>
          <button
            onClick={() => setActiveCategory('All')}
            className="rounded-full bg-[#0f5da0] px-8 py-3 text-base font-semibold text-white"
          >
            View all best sellers
          </button>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                activeCategory === category
                  ? 'border-[#0f5da0] bg-[#0f5da0] text-white'
                  : 'border-[#cfd8e1] bg-white text-[#35475a]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {isLoading && <p className="text-[#526272]">Loading products...</p>}
        {!isLoading && error && <p className="text-red-600">{error}</p>}

        {!isLoading && !error && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {bestSellers.map((product) => {
              const rating = getRating(product.id);
              const roundedStars = Math.round(rating);
              const discount = getDiscountPercent(product.id);

              return (
                <article key={product.id} className="overflow-hidden rounded-sm border border-[#cfd8e1] bg-white">
                  <div
                    className="relative h-[250px] cursor-pointer bg-[#f5f8fb]"
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                    <span className="absolute right-3 top-3 rounded bg-[#f1c40f] px-3 py-1 text-xs font-bold text-[#1a1a1a]">
                      {discount}% OFF
                    </span>
                  </div>

                  <div className="p-4">
                    <button onClick={() => navigate(`/product/${product.id}`)} className="text-left">
                      <h4 className="line-clamp-2 text-[22px] font-medium leading-7 text-[#1f2a34]">
                        {truncate(product.name, 56)}
                      </h4>
                    </button>

                    <div className="mt-2 flex items-center gap-1 text-[#f2b705]">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={`${product.id}-star-${index}`}
                          size={16}
                          fill={index < roundedStars ? 'currentColor' : 'transparent'}
                        />
                      ))}
                      <span className="ml-1 text-sm text-[#5b6d7f]">({Math.round(rating * 41)})</span>
                    </div>

                    <p className="mt-3 text-[30px] font-semibold text-[#101820]">₹ {product.price.toFixed(2)}</p>

                    <button
                      onClick={() => handleAddToCart(product)}
                      className={`mt-4 flex w-full items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-sm font-semibold ${
                        addedItems.includes(product.id)
                          ? 'bg-green-600 text-white'
                          : 'bg-[#0f5da0] text-white hover:bg-[#094f8a]'
                      }`}
                    >
                      <ShoppingBag size={16} />
                      {addedItems.includes(product.id) ? productsConfig.addedToCartText : productsConfig.addToCartText}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default Products;
