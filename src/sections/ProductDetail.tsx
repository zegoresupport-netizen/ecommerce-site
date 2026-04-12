import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Product } from '@/types/product';
import { API_BASE_URL } from '@/lib/api-base-url';

interface ProductDetailProps {
  onAddToCart: (product: Product) => void;
}

const ProductDetail = ({ onAddToCart }: ProductDetailProps) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [productResponse, productsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/products/${productId}`),
          fetch(`${API_BASE_URL}/api/products`),
        ]);

        if (!productResponse.ok || !productsResponse.ok) {
          throw new Error('Failed to load product details');
        }

        const productPayload = (await productResponse.json()) as Product;
        const productsPayload = (await productsResponse.json()) as { items: Product[] };

        setProduct(productPayload);
        setAllProducts(productsPayload.items ?? []);
      } catch {
        setError('Unable to load product details right now.');
      } finally {
        setIsLoading(false);
      }
    };

    if (!Number.isNaN(productId)) {
      void loadData();
    } else {
      setError('Invalid product id.');
      setIsLoading(false);
    }
  }, [productId]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];

    return allProducts
      .filter((item) => item.category === product.category && item.id !== product.id)
      .slice(0, 4);
  }, [allProducts, product]);

  const handleAddToCart = () => {
    if (!product) return;
    onAddToCart(product);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  if (isLoading) {
    return (
      <section className="min-h-screen px-6 py-20 md:px-12 lg:px-[60px]">
        <div className="mx-auto max-w-6xl text-center text-[#696969]">Loading product...</div>
      </section>
    );
  }

  if (error || !product) {
    return (
      <section className="min-h-screen px-6 py-20 md:px-12 lg:px-[60px]">
        <div className="mx-auto max-w-6xl">
          <button
            onClick={() => navigate('/')}
            className="mb-6 inline-flex items-center gap-2 text-sm text-[#8b6d4b] hover:opacity-80"
          >
            <ArrowLeft size={16} />
            Back to Gallery
          </button>
          <p className="text-[#696969]">{error || 'Product not found.'}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-12 md:px-12 lg:px-[60px] lg:py-16">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => navigate('/')}
          className="mb-8 inline-flex items-center gap-2 text-sm text-[#8b6d4b] hover:opacity-80"
        >
          <ArrowLeft size={16} />
          Back to Gallery
        </button>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="overflow-hidden bg-[#fafafa]">
            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
          </div>

          <div>
            <span className="text-xs uppercase tracking-wide text-[#aea4a4]">{product.category}</span>
            <h1 className="mt-2 font-serif text-3xl text-black md:text-4xl">{product.name}</h1>
            <p className="mt-4 text-2xl font-medium text-[#8b6d4b]">₹{product.price.toFixed(2)}</p>

            <button
              onClick={handleAddToCart}
              className={`mt-6 inline-flex items-center gap-2 px-8 py-3 text-sm tracking-wide transition-colors ${
                isAdded ? 'bg-green-600 text-white' : 'bg-[#8b6d4b] text-white hover:opacity-90'
              }`}
            >
              <ShoppingBag size={16} />
              {isAdded ? 'Added to Cart' : 'Add to Cart'}
            </button>

            <div className="mt-8 border-t border-[#f0f0f0] pt-6">
              <h2 className="font-serif text-2xl text-black">Product Details</h2>
              <p className="mt-4 leading-7 text-[#696969]">{product.longDescription}</p>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="font-serif text-3xl text-black">You May Also Like</h2>
          {relatedProducts.length === 0 ? (
            <p className="mt-4 text-[#696969]">No related products found.</p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/product/${item.id}`)}
                  className="overflow-hidden border border-[#f5f5f5] bg-white text-left transition-shadow hover:shadow-sm"
                >
                  <div className="h-52 overflow-hidden bg-[#fafafa]">
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-serif text-lg text-black">{item.name}</h3>
                    <p className="mt-2 text-[#8b6d4b]">₹{item.price.toFixed(2)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductDetail;
