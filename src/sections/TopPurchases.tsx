import ProductMetricSection from '@/components/ProductMetricSection';

const TopPurchases = () => {
  return <ProductMetricSection title="💰 Top Purchases" endpoint="/api/products/top-purchases" metricType="revenue" />;
};

export default TopPurchases;
