import { useState, useEffect, type FormEvent } from 'react';
import { ShoppingBag, X, Search, Instagram, Facebook, Twitter } from 'lucide-react';
import { navigationConfig } from '../config';
import { API_BASE_URL } from '@/lib/api-base-url';

const IS_DEMO_MODE = (import.meta.env.VITE_DEMO_MODE ?? 'true').toLowerCase() === 'true';

interface CartItem {
  id: number;
  sku?: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface NavigationProps {
  cartItems: CartItem[];
  onRemoveFromCart: (id: number) => void;
  onUpdateQuantity: (id: number, quantity: number) => void;
  onClearCart: () => void;
}

const iconMap: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  Instagram,
  Facebook,
  Twitter,
};

const Navigation = ({ cartItems, onRemoveFromCart, onUpdateQuantity, onClearCart }: NavigationProps) => {
  if (!navigationConfig.brandName) return null;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'details' | 'success'>('cart');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutInfo, setCheckoutInfo] = useState('');
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CheckoutFormData, string>>>({});
  const [formData, setFormData] = useState<CheckoutFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
  });

  interface CheckoutFormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
  }

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  useEffect(() => {
    if (cartItems.length === 0 && checkoutStep !== 'success') {
      setCheckoutStep('cart');
    }
  }, [cartItems.length, checkoutStep]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (!sessionId) {
      return;
    }

    onClearCart();
    setIsCartOpen(true);
    setCheckoutStep('success');

    params.delete('session_id');
    params.delete('order_id');
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, [onClearCart]);

  const closeCart = () => {
    setIsCartOpen(false);
    setCheckoutStep('cart');
    setCheckoutError('');
  };

  const handleFormChange = (field: keyof CheckoutFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateCheckoutForm = () => {
    const nextErrors: Partial<Record<keyof CheckoutFormData, string>> = {};

    if (!formData.firstName.trim()) nextErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) nextErrors.lastName = 'Last name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) nextErrors.email = 'Enter a valid email address';
    if (!/^[0-9+\s()-]{8,}$/.test(formData.phone.trim())) nextErrors.phone = 'Enter a valid phone number';
    if (!formData.address.trim()) nextErrors.address = 'Address is required';
    if (!formData.city.trim()) nextErrors.city = 'City is required';
    if (!/^[A-Za-z0-9\s-]{4,10}$/.test(formData.postalCode.trim())) nextErrors.postalCode = 'Enter a valid postal code';

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCheckoutSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateCheckoutForm()) {
      return;
    }

    setIsPlacingOrder(true);
    setCheckoutError('');
    setCheckoutInfo('');

    try {
      const response = await fetch(`${API_BASE_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            address: formData.address.trim(),
            city: formData.city.trim(),
            state: formData.city.trim(),
            pincode: formData.postalCode.trim(),
            country: 'India',
          },
          currency: 'inr',
          successUrl: `${window.location.origin}/`,
          cancelUrl: `${window.location.origin}/`,
          items: cartItems.map((item) => ({
            productId: item.id,
            sku: item.sku,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            weight: 0.5,
          })),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message ?? 'Unable to start payment right now');
      }

      const payload = (await response.json()) as {
        checkoutUrl?: string;
        mode?: 'demo' | 'live';
        message?: string;
      };

      if (payload.mode === 'demo') {
        onClearCart();
        setCheckoutStep('success');
        setCheckoutInfo(payload.message ?? 'Payment & shipping simulated for demo');
        return;
      }

      if (!payload.checkoutUrl) {
        throw new Error('Payment session created, but checkout URL is missing');
      }

      window.location.href = payload.checkoutUrl;

    } catch (requestError) {
      setCheckoutError(requestError instanceof Error ? requestError.message : 'Unable to start payment right now');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const scrollToSection = (href: string) => {
    setIsMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm"
      >
        <div className="flex items-center justify-between h-[70px] px-6 md:px-12 lg:px-[170px]">
          <a
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('#hero');
            }}
            className="font-serif text-2xl tracking-wide"
            style={{ color: '#000' }}
          >
            {navigationConfig.brandName}
          </a>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative btn-hover"
              style={{ color: '#8b6d4b' }}
            >
              <ShoppingBag size={22} strokeWidth={1.5} />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center text-xs text-white bg-[#8b6d4b] rounded-full">
                  {totalItems}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsMenuOpen(true)}
              className="flex flex-col gap-1.5 w-7 btn-hover"
            >
              <span
                className="h-[2px] w-full bg-black"
              />
              <span
                className="h-[2px] w-full bg-black"
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Full Screen Menu */}
      <div
        className={`fixed inset-0 z-[9999] transition-all duration-700 ${
          isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        <div className="absolute inset-0 bg-white" />
        <div className="relative h-full flex">
          <div className="flex-1 flex flex-col justify-center items-center px-8 lg:px-20">
            <button
              onClick={() => setIsMenuOpen(false)}
              className="absolute top-6 right-6 lg:right-20 p-2 hover:opacity-60 transition-opacity"
            >
              <X size={28} strokeWidth={1.5} />
            </button>

            <div className="w-full max-w-md mb-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder={navigationConfig.searchPlaceholder}
                  className="w-full py-3 border-b-2 border-[#8b6d4b] bg-transparent focus:outline-none font-light text-lg"
                />
                <Search className="absolute right-0 top-1/2 -translate-y-1/2 text-[#8b6d4b]" size={20} />
              </div>
            </div>

            <nav className="flex flex-col items-center gap-6">
              {navigationConfig.menuLinks.map((link, index) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(link.href);
                  }}
                  className="font-serif text-3xl lg:text-[45px] text-black hover:text-[#8b6d4b] transition-colors duration-300"
                  style={{
                    opacity: isMenuOpen ? 1 : 0,
                    transform: isMenuOpen ? 'translateY(0)' : 'translateY(20px)',
                    transition: `all 0.5s ease ${index * 0.1}s`,
                  }}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-6 mt-12">
              {navigationConfig.socialLinks.map((social) => {
                const IconComponent = iconMap[social.icon];
                if (!IconComponent) return null;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    className="text-[#696969] hover:text-[#8b6d4b] transition-colors"
                    aria-label={social.label}
                  >
                    <IconComponent size={20} strokeWidth={1.5} />
                  </a>
                );
              })}
            </div>
          </div>

          {navigationConfig.menuBackgroundImage && (
            <div
              className="hidden lg:block w-[40%] bg-cover bg-center"
              style={{
                backgroundImage: `url(${navigationConfig.menuBackgroundImage})`,
                opacity: isMenuOpen ? 1 : 0,
                transform: isMenuOpen ? 'translateX(0)' : 'translateX(100%)',
                transition: 'all 0.7s ease 0.2s',
              }}
            />
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div
        className={`fixed inset-0 z-[9999] transition-opacity duration-300 ${
          isCartOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        <div
          className="absolute inset-0 bg-black/40"
          onClick={closeCart}
        />
        <div
          className={`absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl transition-transform duration-500 ${
            isCartOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="font-serif text-2xl">{navigationConfig.brandName}</h3>
              <button
                onClick={closeCart}
                className="p-2 hover:opacity-60 transition-opacity"
              >
                <X size={24} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {checkoutStep === 'success' ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-[#f2ece5] text-[#8b6d4b] flex items-center justify-center mb-4">
                    <ShoppingBag size={30} strokeWidth={1.5} />
                  </div>
                  {IS_DEMO_MODE && (
                    <span className="mb-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                      Test Mode Order
                    </span>
                  )}
                  <h4 className="font-serif text-2xl mb-2">Order Confirmed</h4>
                  <p className="text-[#696969]">Thank you, {formData.firstName || 'Customer'}! We have received your order details.</p>
                  {IS_DEMO_MODE && (
                    <p className="mt-2 text-xs text-[#696969]">{checkoutInfo || 'Payment & shipping simulated for demo'}</p>
                  )}
                  <button
                    onClick={closeCart}
                    className="mt-6 px-8 py-3 bg-[#8b6d4b] text-white font-light tracking-wide btn-hover"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : checkoutStep === 'details' ? (
                <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                  <h4 className="font-serif text-2xl">Customer Details</h4>
                  <p className="text-sm text-[#696969]">Complete your details to place the order.</p>
                  {IS_DEMO_MODE && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                      <p className="text-xs font-medium text-amber-800">Test Mode Order</p>
                      <p className="text-xs text-amber-700">Payment & shipping simulated for demo</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(event) => handleFormChange('firstName', event.target.value)}
                        placeholder="First name"
                        className="w-full border border-gray-200 px-3 py-2 focus:outline-none focus:border-[#8b6d4b]"
                      />
                      {formErrors.firstName && <p className="text-xs text-red-500 mt-1">{formErrors.firstName}</p>}
                    </div>
                    <div>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(event) => handleFormChange('lastName', event.target.value)}
                        placeholder="Last name"
                        className="w-full border border-gray-200 px-3 py-2 focus:outline-none focus:border-[#8b6d4b]"
                      />
                      {formErrors.lastName && <p className="text-xs text-red-500 mt-1">{formErrors.lastName}</p>}
                    </div>
                  </div>

                  <div>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(event) => handleFormChange('email', event.target.value)}
                      placeholder="Email address"
                      className="w-full border border-gray-200 px-3 py-2 focus:outline-none focus:border-[#8b6d4b]"
                    />
                    {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                  </div>

                  <div>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(event) => handleFormChange('phone', event.target.value)}
                      placeholder="Phone number"
                      className="w-full border border-gray-200 px-3 py-2 focus:outline-none focus:border-[#8b6d4b]"
                    />
                    {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
                  </div>

                  <div>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(event) => handleFormChange('address', event.target.value)}
                      placeholder="Street address"
                      className="w-full border border-gray-200 px-3 py-2 focus:outline-none focus:border-[#8b6d4b]"
                    />
                    {formErrors.address && <p className="text-xs text-red-500 mt-1">{formErrors.address}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(event) => handleFormChange('city', event.target.value)}
                        placeholder="City"
                        className="w-full border border-gray-200 px-3 py-2 focus:outline-none focus:border-[#8b6d4b]"
                      />
                      {formErrors.city && <p className="text-xs text-red-500 mt-1">{formErrors.city}</p>}
                    </div>
                    <div>
                      <input
                        type="text"
                        value={formData.postalCode}
                        onChange={(event) => handleFormChange('postalCode', event.target.value)}
                        placeholder="Postal code"
                        className="w-full border border-gray-200 px-3 py-2 focus:outline-none focus:border-[#8b6d4b]"
                      />
                      {formErrors.postalCode && <p className="text-xs text-red-500 mt-1">{formErrors.postalCode}</p>}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4 mt-6">
                    {checkoutError && (
                      <p className="text-xs text-red-500 mb-3">{checkoutError}</p>
                    )}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[#696969]">Order Total</span>
                      <span className="font-serif text-xl">₹{totalPrice.toFixed(2)}</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isPlacingOrder}
                      className="w-full py-4 bg-[#8b6d4b] text-white font-light tracking-widest btn-hover"
                    >
                      {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('cart')}
                      disabled={isPlacingOrder}
                      className="w-full py-3 mt-3 text-[#696969] font-light tracking-wide hover:text-black transition-colors"
                    >
                      Back to Cart
                    </button>
                  </div>
                </form>
              ) : cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingBag size={48} className="text-gray-300 mb-4" strokeWidth={1} />
                  <p className="text-[#696969] text-lg">{navigationConfig.cartEmptyText}</p>
                  <button
                    onClick={closeCart}
                    className="mt-6 px-8 py-3 bg-[#8b6d4b] text-white font-light tracking-wide btn-hover"
                  >
                    {navigationConfig.continueShoppingText}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 pb-6 border-b border-gray-100">
                      <div className="w-24 h-24 bg-[#fafafa] overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-serif text-lg">{item.name}</h4>
                        <p className="text-[#aea4a4] mt-1">₹{item.price.toFixed(2)}</p>
                        <div className="flex items-center gap-3 mt-3">
                          <button
                            onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                            className="w-8 h-8 flex items-center justify-center border border-gray-200 hover:border-[#8b6d4b] transition-colors"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center border border-gray-200 hover:border-[#8b6d4b] transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveFromCart(item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="p-6 border-t bg-[#fafafa]">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-lg">Subtotal</span>
                  <span className="font-serif text-xl">₹{totalPrice.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => setCheckoutStep('details')}
                  className="w-full py-4 bg-[#8b6d4b] text-white font-light tracking-widest btn-hover"
                >
                  {navigationConfig.cartCheckoutText}
                </button>
                <button
                  onClick={closeCart}
                  className="w-full py-3 mt-3 text-[#696969] font-light tracking-wide hover:text-black transition-colors"
                >
                  {navigationConfig.continueShoppingText}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Navigation;
