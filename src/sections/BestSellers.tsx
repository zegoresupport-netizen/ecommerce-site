import ProductMetricSection from '@/components/ProductMetricSection';

const BestSellers = () => {
  return <ProductMetricSection title="🔥 Best Sellers" endpoint="/api/products/best-sellers" metricType="sold" />;
};

export default BestSellers;
