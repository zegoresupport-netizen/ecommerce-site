import { useState, useCallback } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { siteConfig } from './config';
import type { Product } from '@/types/product';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navigation from './sections/Navigation';
import AdminDashboard from './sections/AdminDashboard';
import Login from './sections/Login';
import Hero from './sections/Hero';
import SubHero from './sections/SubHero';
import VideoSection from './sections/VideoSection';
import Products from './sections/Products';
import ProductDetail from './sections/ProductDetail';
import Features from './sections/Features';
import Blog from './sections/Blog';
import FAQ from './sections/FAQ';
import About from './sections/About';
import Contact from './sections/Contact';
import Footer from './sections/Footer';

interface CartItem {
  id: number;
  sku?: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

function App() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const handleAddToCart = useCallback((product: Product) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prevItems,
        {
          id: product.id,
          sku: product.sku,
          name: product.name,
          price: product.price,
          quantity: 1,
          image: product.image,
        },
      ];
    });
  }, []);

  const handleRemoveFromCart = useCallback((id: number) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
  }, []);

  const handleUpdateQuantity = useCallback((id: number, quantity: number) => {
    if (quantity === 0) {
      setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
    } else {
      setCartItems((prevItems) =>
        prevItems.map((item) =>
          item.id === id ? { ...item, quantity } : item
        )
      );
    }
  }, []);

  const handleClearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  return (
    <div className="min-h-screen bg-white" lang={siteConfig.language || undefined}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Navigation
                cartItems={cartItems}
                onRemoveFromCart={handleRemoveFromCart}
                onUpdateQuantity={handleUpdateQuantity}
                onClearCart={handleClearCart}
              />
              <main>
                <Hero />
                <SubHero />
                <VideoSection />
                <Products onAddToCart={handleAddToCart} />
                <Features />
                <Blog />
                <FAQ />
                <About />
                <Contact />
              </main>
              <Footer />
            </>
          }
        />
        <Route
          path="/product/:id"
          element={
            <>
              <main>
                <ProductDetail onAddToCart={handleAddToCart} />
              </main>
              <Footer />
            </>
          }
        />
        <Route
          path="/login"
          element={<Login />}
        />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route
            path="/admin/dashboard"
            element={
              <main>
                <AdminDashboard />
              </main>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
