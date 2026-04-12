export interface Product {
  id: number;
  sku?: string;
  name: string;
  price: number;
  category: string;
  stock?: number;
  image: string;
  description: string;
  longDescription: string;
}
