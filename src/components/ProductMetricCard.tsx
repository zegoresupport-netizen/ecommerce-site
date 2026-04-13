import { useNavigate } from 'react-router-dom';

interface ProductMetricCardProps {
  id: number | null;
  name: string;
  price: number;
  image: string;
  metricLabel: string;
  metricValue: string;
}

const ProductMetricCard = ({ id, name, price, image, metricLabel, metricValue }: ProductMetricCardProps) => {
  const navigate = useNavigate();

  return (
    <article className="min-w-[260px] max-w-[260px] rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:min-w-[320px] sm:max-w-[320px]">
      <button
        type="button"
        onClick={() => {
          if (id) {
            navigate(`/product/${id}`);
          }
        }}
        className="w-full text-left"
      >
        <div className="h-52 w-full overflow-hidden rounded-md bg-[#f7f7f7] sm:h-64">
          {image ? (
            <img src={image} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image</div>
          )}
        </div>
        <h3 className="mt-4 line-clamp-2 text-base font-medium text-black sm:text-lg">{name}</h3>
        <p className="mt-2 text-base text-[#8b6d4b] sm:text-lg">₹{price.toFixed(2)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {metricLabel}: {metricValue}
        </p>
      </button>
    </article>
  );
};

export default ProductMetricCard;
