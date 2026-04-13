import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Check } from 'lucide-react';
import { productsConfig } from '../config';
import type { Product } from '@/types/product';

interface ProductsProps {
  onAddToCart: (product: Product) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

const Products = ({ onAddToCart }: ProductsProps) => {
  if (!productsConfig.heading) return null;

  const sectionRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [addedItems, setAddedItems] = useState<number[]>([]);

  const categories = ['All', ...Array.from(new Set(products.map((product) => product.category)))];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

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

  const filteredProducts = activeCategory === 'All'
    ? products
    : products.filter((product) => product.category === activeCategory);

  const handleAddToCart = (product: Product) => {
    onAddToCart(product);
    setAddedItems(prev => [...prev, product.id]);
    setTimeout(() => {
      setAddedItems(prev => prev.filter(id => id !== product.id));
    }, 2000);
  };

  const truncate = (value: string, maxLength: number) =>
    value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;

  return (
    <section
      id="products"
      ref={sectionRef}
      className="py-24 md:py-32 bg-white"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-[60px]">
        {/* Header */}
        <div className="text-center mb-12">
          <span
            className={`inline-block mb-4 text-sm tracking-[0.2em] text-[#8b6d4b] font-medium uppercase transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {productsConfig.tag}
          </span>
          <h2
            className={`font-serif text-4xl md:text-5xl text-black mb-6 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '200ms' }}
          >
            {productsConfig.heading}
          </h2>
          <p
            className={`max-w-2xl mx-auto text-[#696969] text-lg transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '400ms' }}
          >
            {productsConfig.description}
          </p>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div
            className={`flex flex-wrap justify-center gap-4 mb-12 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '600ms' }}
          >
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-6 py-2 text-sm tracking-wide transition-all duration-300 ${
                  activeCategory === category
                    ? 'bg-[#8b6d4b] text-white'
                    : 'bg-[#fafafa] text-[#696969] hover:bg-[#f0f0f0]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {isLoading && <p className="text-center text-[#696969]">Loading products...</p>}
        {!isLoading && error && <p className="text-center text-red-600">{error}</p>}

        {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product, index) => (
            <div
              key={product.id}
              className={`group bg-[#fafafa] border border-[#f5f5f5] transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${800 + index * 100}ms` }}
            >
              {/* Image Container */}
              <div
                onClick={() => navigate(`/product/${product.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/product/${product.id}`);
                  }
                }}
                role="button"
                tabIndex={0}
                className="relative h-[400px] w-full overflow-hidden bg-[#fafafa] text-left"
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                />

                {/* Quick Add Button */}
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    handleAddToCart(product);
                  }}
                  className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 flex items-center gap-2 text-sm tracking-wide transition-all duration-300 ${
                    addedItems.includes(product.id)
                      ? 'bg-green-600 text-white'
                      : 'bg-[#8b6d4b] text-white opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0'
                  }`}
                >
                  {addedItems.includes(product.id) ? (
                    <>
                      <Check size={16} />
                      {productsConfig.addedToCartText}
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={16} />
                      {productsConfig.addToCartText}
                    </>
                  )}
                </button>
              </div>

              {/* Product Info */}
              <div className="flex flex-col p-5 bg-white">
                <span className="mb-1 block text-xs text-[#888888] tracking-wide uppercase">{product.category}</span>
                <button
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="mt-1 text-left"
                >
                  <h3 className="font-serif text-xl text-black hover:text-[#8b6d4b] transition-colors">{product.name}</h3>
                </button>
                <p className="mt-2 text-sm text-[#696969]">{truncate(product.description, 90)}</p>
                <p className="text-[#aea4a4] font-medium mt-2">₹{product.price.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* View All Link */}
        {productsConfig.viewAllText && (
          <div
            className={`text-center mt-12 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '1200ms' }}
          >
            <button className="px-12 py-4 border-2 border-[#8b6d4b] text-[#8b6d4b] font-light tracking-widest text-sm hover:bg-[#8b6d4b] hover:text-white transition-all duration-300">
              {productsConfig.viewAllText}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default Products;
