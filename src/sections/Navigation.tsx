import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ChevronDown, CircleUserRound, MapPin, Menu, Search, ShoppingBag, X } from 'lucide-react';
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

interface CheckoutFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

const Navigation = ({ cartItems, onRemoveFromCart, onUpdateQuantity, onClearCart }: NavigationProps) => {
  if (!navigationConfig.brandName) return null;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
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

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const primaryMenuLinks = [
    { label: 'Categories', href: '#products', isDropdown: true },
    { label: 'Replacement Cartridges', href: '#products' },
    { label: 'Best Sellers', href: '#products' },
    { label: 'For Hair and Skin', href: '#products' },
    { label: 'On Sale', href: '#products' },
    { label: 'Support', href: '#footer' },
  ];

  const productCategories = useMemo(
    () => [
      'Shower and Tap Filters',
      'Appliance Filters',
      'Kitchen Tap Extenders',
      'Water Softeners',
      'Health Faucets',
      'Hard Water Cleaning Products',
      'Mainline Filters',
      'Whole House Softeners',
    ],
    []
  );

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-category-panel]')) {
        setIsCategoryOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
        setCheckoutInfo(payload.message ?? 'Payment and shipping simulated for demo');
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
    setIsCategoryOpen(false);

    if (href === '#') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <div className="sticky top-0 z-50 border-b border-[#d7dee6] bg-white">
        <div className="bg-[#0f5da0] py-1.5 text-center text-xs font-bold tracking-[0.12em] text-white md:text-sm">
          FREE DELIVERY ON ORDERS ABOVE INR 500
        </div>

        <header className="mx-auto max-w-[1240px] px-4 md:px-6">
          <div className="flex items-center gap-3 py-4">
            <div className="hidden flex-1 md:block">
              <div className="flex max-w-[280px] items-center gap-2 rounded-full border border-[#cfd8e1] px-4 py-2.5">
                <Search size={18} className="text-[#55687c]" />
                <input
                  type="text"
                  placeholder={navigationConfig.searchPlaceholder}
                  className="w-full border-none bg-transparent text-[17px] text-[#2b3a49] outline-none"
                />
              </div>
            </div>

            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                scrollToSection('#');
              }}
              className="flex flex-1 items-center justify-center gap-2 text-[#0f5da0]"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#0f5da0] text-white">W</span>
              <span className="text-2xl font-extrabold tracking-tight">waterscience</span>
            </a>

            <div className="flex flex-1 items-center justify-end gap-3">
              <button className="hidden text-[#263444] md:block" aria-label="Account">
                <CircleUserRound size={31} strokeWidth={1.7} />
              </button>

              <button onClick={() => setIsCartOpen(true)} className="relative text-[#0f5da0]" aria-label="Open cart">
                <ShoppingBag size={31} strokeWidth={1.8} />
                {totalItems > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#0f5da0] text-xs font-bold text-white">
                    {totalItems}
                  </span>
                )}
              </button>

              <button
                className="text-[#263444] md:hidden"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-label="Open menu"
              >
                <Menu size={30} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div className="hidden border-t border-[#d7dee6] md:block" data-category-panel>
            <div className="flex min-h-[56px] items-center gap-8 overflow-x-auto py-3 text-[#1f2b37]">
              {primaryMenuLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => {
                    if (link.isDropdown) {
                      setIsCategoryOpen((prev) => !prev);
                    } else {
                      scrollToSection(link.href);
                    }
                  }}
                  className="whitespace-nowrap text-[17px] font-medium hover:text-[#0f5da0]"
                >
                  <span className="inline-flex items-center gap-1">
                    {link.label}
                    {link.isDropdown && <ChevronDown size={18} />}
                  </span>
                </button>
              ))}
            </div>

            {isCategoryOpen && (
              <div className="rounded-md border border-[#d7dee6] bg-white p-5 shadow-lg">
                <p className="mb-4 text-[18px] font-semibold text-[#1d2a38]">Products</p>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {productCategories.map((category) => (
                    <button
                      key={category}
                      onClick={() => scrollToSection('#products')}
                      className="text-left text-[16px] text-[#2f4152] hover:text-[#0f5da0]"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="py-2 md:py-3">
            <button
              className="inline-flex items-center gap-2 text-[17px] font-medium text-[#0f5da0] hover:underline"
              onClick={() => scrollToSection('#footer')}
            >
              <MapPin size={16} />
              Locate Our Store
            </button>
          </div>
        </header>

        {isMenuOpen && (
          <div className="border-t border-[#d7dee6] bg-white px-4 py-3 md:hidden">
            {primaryMenuLinks.map((link) => (
              <button
                key={`mobile-${link.label}`}
                onClick={() => scrollToSection(link.href)}
                className="block w-full border-b border-[#edf1f5] py-3 text-left text-[17px] font-medium text-[#243445]"
              >
                {link.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className={`fixed inset-0 z-[9999] transition-opacity duration-300 ${
          isCartOpen ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
      >
        <div className="absolute inset-0 bg-black/40" onClick={closeCart} />
        <div
          className={`absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl transition-transform duration-500 ${
            isCartOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b p-6">
              <h3 className="font-display text-2xl font-semibold">{navigationConfig.brandName}</h3>
              <button onClick={closeCart} className="p-2 hover:opacity-60 transition-opacity">
                <X size={24} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {checkoutStep === 'success' ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#e6f0fb] text-[#0f5da0]">
                    <ShoppingBag size={30} strokeWidth={1.5} />
                  </div>
                  {IS_DEMO_MODE && (
                    <span className="mb-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                      Test Mode Order
                    </span>
                  )}
                  <h4 className="mb-2 font-display text-2xl font-semibold">Order Confirmed</h4>
                  <p className="text-[#566577]">Thank you, {formData.firstName || 'Customer'}! We have received your order details.</p>
                  {IS_DEMO_MODE && (
                    <p className="mt-2 text-xs text-[#566577]">{checkoutInfo || 'Payment and shipping simulated for demo'}</p>
                  )}
                  <button onClick={closeCart} className="mt-6 rounded-sm bg-[#0f5da0] px-8 py-3 font-semibold text-white">
                    Continue Shopping
                  </button>
                </div>
              ) : checkoutStep === 'details' ? (
                <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                  <h4 className="font-display text-2xl font-semibold">Customer Details</h4>
                  <p className="text-sm text-[#566577]">Complete your details to place the order.</p>
                  {IS_DEMO_MODE && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                      <p className="text-xs font-medium text-amber-800">Test Mode Order</p>
                      <p className="text-xs text-amber-700">Payment and shipping simulated for demo</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(event) => handleFormChange('firstName', event.target.value)}
                        placeholder="First name"
                        className="w-full border border-gray-200 px-3 py-2 focus:border-[#0f5da0] focus:outline-none"
                      />
                      {formErrors.firstName && <p className="mt-1 text-xs text-red-500">{formErrors.firstName}</p>}
                    </div>
                    <div>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(event) => handleFormChange('lastName', event.target.value)}
                        placeholder="Last name"
                        className="w-full border border-gray-200 px-3 py-2 focus:border-[#0f5da0] focus:outline-none"
                      />
                      {formErrors.lastName && <p className="mt-1 text-xs text-red-500">{formErrors.lastName}</p>}
                    </div>
                  </div>

                  <div>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(event) => handleFormChange('email', event.target.value)}
                      placeholder="Email address"
                      className="w-full border border-gray-200 px-3 py-2 focus:border-[#0f5da0] focus:outline-none"
                    />
                    {formErrors.email && <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>}
                  </div>

                  <div>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(event) => handleFormChange('phone', event.target.value)}
                      placeholder="Phone number"
                      className="w-full border border-gray-200 px-3 py-2 focus:border-[#0f5da0] focus:outline-none"
                    />
                    {formErrors.phone && <p className="mt-1 text-xs text-red-500">{formErrors.phone}</p>}
                  </div>

                  <div>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(event) => handleFormChange('address', event.target.value)}
                      placeholder="Street address"
                      className="w-full border border-gray-200 px-3 py-2 focus:border-[#0f5da0] focus:outline-none"
                    />
                    {formErrors.address && <p className="mt-1 text-xs text-red-500">{formErrors.address}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(event) => handleFormChange('city', event.target.value)}
                        placeholder="City"
                        className="w-full border border-gray-200 px-3 py-2 focus:border-[#0f5da0] focus:outline-none"
                      />
                      {formErrors.city && <p className="mt-1 text-xs text-red-500">{formErrors.city}</p>}
                    </div>
                    <div>
                      <input
                        type="text"
                        value={formData.postalCode}
                        onChange={(event) => handleFormChange('postalCode', event.target.value)}
                        placeholder="Postal code"
                        className="w-full border border-gray-200 px-3 py-2 focus:border-[#0f5da0] focus:outline-none"
                      />
                      {formErrors.postalCode && <p className="mt-1 text-xs text-red-500">{formErrors.postalCode}</p>}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-gray-100 pt-4">
                    {checkoutError && <p className="mb-3 text-xs text-red-500">{checkoutError}</p>}
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-[#566577]">Order Total</span>
                      <span className="font-display text-xl font-semibold">₹{totalPrice.toFixed(2)}</span>
                    </div>

                    <button type="submit" disabled={isPlacingOrder} className="w-full bg-[#0f5da0] py-4 font-semibold text-white">
                      {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('cart')}
                      disabled={isPlacingOrder}
                      className="mt-3 w-full py-3 font-medium text-[#566577] hover:text-black"
                    >
                      Back to Cart
                    </button>
                  </div>
                </form>
              ) : cartItems.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShoppingBag size={48} className="mb-4 text-gray-300" strokeWidth={1} />
                  <p className="text-lg text-[#566577]">{navigationConfig.cartEmptyText}</p>
                  <button onClick={closeCart} className="mt-6 rounded-sm bg-[#0f5da0] px-8 py-3 font-semibold text-white">
                    {navigationConfig.continueShoppingText}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 border-b border-gray-100 pb-6">
                      <div className="h-24 w-24 overflow-hidden bg-[#f6f8fb]">
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-display text-lg font-semibold">{item.name}</h4>
                        <p className="mt-1 text-[#748396]">₹{item.price.toFixed(2)}</p>
                        <div className="mt-3 flex items-center gap-3">
                          <button
                            onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                            className="flex h-8 w-8 items-center justify-center border border-gray-200 transition-colors hover:border-[#0f5da0]"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="flex h-8 w-8 items-center justify-center border border-gray-200 transition-colors hover:border-[#0f5da0]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <button onClick={() => onRemoveFromCart(item.id)} className="text-gray-400 transition-colors hover:text-red-500">
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="border-t bg-[#f6f8fb] p-6">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-lg">Subtotal</span>
                  <span className="font-display text-xl font-semibold">₹{totalPrice.toFixed(2)}</span>
                </div>
                <button onClick={() => setCheckoutStep('details')} className="w-full bg-[#0f5da0] py-4 font-semibold text-white">
                  {navigationConfig.cartCheckoutText}
                </button>
                <button onClick={closeCart} className="mt-3 w-full py-3 font-medium text-[#566577] hover:text-black">
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
