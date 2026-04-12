import { useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import {
  ArrowUpRight,
  Download,
  LayoutDashboard,
  Loader2,
  Plus,
  Package,
  RefreshCw,
  Save,
  Settings,
  ShoppingCart,
  Trash2,
  Users,
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';
import { clearAuthToken } from '@/lib/auth';

const adminSections = ['Dashboard', 'Orders', 'Products', 'Customers', 'Settings'] as const;
type AdminSection = (typeof adminSections)[number];

interface InventoryItem {
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  stock: number;
  reorderLevel: number;
  supplier: string;
  updatedAt: string;
}

interface OrderRecord {
  id: string;
  customer: string;
  total: number;
  status: 'Paid' | 'Pending' | 'Shipped' | 'Cancelled';
  paymentStatus?: string;
  orderStatus?: string;
  shipment?: {
    trackingId?: string | null;
    courierName?: string | null;
  } | null;
  itemCount: number;
  updatedAt?: string;
}

interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  orders: number;
  spend: number;
  updatedAt?: string;
}

interface StoreSettings {
  storeInformation: string;
  orderNotifications: string;
  paymentMethods: string;
  shippingRules: string;
}

interface ProductFormState {
  sku: string;
  name: string;
  price: string;
  category: string;
  stock: string;
  image: string;
  description: string;
  longDescription: string;
}

interface OrderFormState {
  customer: string;
  customerEmail: string;
  total: string;
  itemCount: string;
  status: OrderRecord['status'];
}

interface CustomerFormState {
  name: string;
  email: string;
}

const createProductInitialState = (): ProductFormState => ({
  sku: '',
  name: '',
  price: '',
  category: '',
  stock: '0',
  image: '',
  description: '',
  longDescription: '',
});

const createOrderInitialState = (): OrderFormState => ({
  customer: '',
  customerEmail: '',
  total: '',
  itemCount: '',
  status: 'Pending',
});

const createCustomerInitialState = (): CustomerFormState => ({
  name: '',
  email: '',
});

const defaultSettings: StoreSettings = {
  storeInformation: 'PureFlow Filters • INR • Asia/Kolkata',
  orderNotifications: 'Email enabled • Daily summary at 8:00 PM',
  paymentMethods: 'UPI, Credit Card, NetBanking',
  shippingRules: 'Free shipping above ₹500 • Standard 3-5 days',
};

const statusVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Paid: 'default',
  PAID: 'default',
  Pending: 'secondary',
  PENDING: 'secondary',
  Shipped: 'outline',
  SHIPPED: 'outline',
  CONFIRMED: 'outline',
  Cancelled: 'destructive',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const sectionIconMap: Record<AdminSection, React.ComponentType<{ className?: string }>> = {
  Dashboard: LayoutDashboard,
  Orders: ShoppingCart,
  Products: Package,
  Customers: Users,
  Settings,
};

const settingsLabelMap: Record<keyof StoreSettings, string> = {
  storeInformation: 'Store Information',
  orderNotifications: 'Order Notifications',
  paymentMethods: 'Payment Methods',
  shippingRules: 'Shipping Rules',
};

const downloadCsvFile = (filename: string, headers: string[], rows: string[][]) => {
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const resolveApiError = (error: unknown, fallback: string) => {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as
      | { message?: string; issues?: Array<{ path?: Array<string | number>; message?: string }> }
      | undefined;

    if (payload?.issues && payload.issues.length > 0) {
      return payload.issues
        .map((issue) => {
          const field = issue.path?.join('.') || 'field';
          return `${field}: ${issue.message ?? 'Invalid value'}`;
        })
        .join(' | ');
    }

    if (payload?.message) {
      return payload.message;
    }

    if (error.code === 'ERR_NETWORK') {
      return 'Admin API is unavailable. Start backend with npm run api.';
    }
  }

  return fallback;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<AdminSection>('Dashboard');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [isCustomersLoading, setIsCustomersLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inventoryActionSku, setInventoryActionSku] = useState<string>('');
  const [stockAdjustmentValues, setStockAdjustmentValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);

  const [productForm, setProductForm] = useState<ProductFormState>(createProductInitialState());
  const [orderForm, setOrderForm] = useState<OrderFormState>(createOrderInitialState());
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(createCustomerInitialState());

  const loadInventory = async () => {
    setIsInventoryLoading(true);
    setError('');

    try {
      const response = await apiClient.get<{ items: InventoryItem[] }>('/api/inventory');
      setInventoryItems(response.data.items ?? []);
    } catch (requestError) {
      setError(resolveApiError(requestError, 'Failed to fetch inventory'));
      setInventoryItems([]);
    } finally {
      setIsInventoryLoading(false);
    }
  };

  const loadOrders = async () => {
    setIsOrdersLoading(true);
    setError('');

    try {
      const response = await apiClient.get<{ items: OrderRecord[] }>('/api/orders');
      setOrders(response.data.items ?? []);
    } catch (requestError) {
      setError(resolveApiError(requestError, 'Failed to fetch orders'));
      setOrders([]);
    } finally {
      setIsOrdersLoading(false);
    }
  };

  const loadCustomers = async () => {
    setIsCustomersLoading(true);
    setError('');

    try {
      const response = await apiClient.get<{ items: CustomerRecord[] }>('/api/customers');
      setCustomers(response.data.items ?? []);
    } catch (requestError) {
      setError(resolveApiError(requestError, 'Failed to fetch customers'));
      setCustomers([]);
    } finally {
      setIsCustomersLoading(false);
    }
  };

  const refreshDashboardData = async () => {
    await Promise.all([loadInventory(), loadOrders(), loadCustomers()]);
  };

  useEffect(() => {
    void refreshDashboardData();
  }, []);

  useEffect(() => {
    const savedSettings = localStorage.getItem('admin-settings');
    if (!savedSettings) {
      return;
    }

    try {
      const parsed = JSON.parse(savedSettings) as StoreSettings;
      setSettings(parsed);
    } catch {
      setSettings(defaultSettings);
    }
  }, []);

  useEffect(() => {
    if (activeSection !== 'Customers') {
      return;
    }

    void loadCustomers();
  }, [activeSection]);

  const lowStockProducts = useMemo(
    () => inventoryItems.filter((item) => item.stock <= item.reorderLevel),
    [inventoryItems]
  );

  const dashboardMetrics = useMemo(
    () => [
      {
        title: 'Revenue',
        value: formatCurrency(orders.reduce((sum, order) => sum + order.total, 0)),
        change: `${orders.length} orders tracked`,
        icon: ArrowUpRight,
      },
      {
        title: 'Orders',
        value: String(orders.length),
        change: `${orders.filter((order) => order.status === 'Pending').length} pending`,
        icon: ShoppingCart,
      },
      {
        title: 'Customers',
        value: String(customers.length),
        change: `${customers.filter((customer) => customer.orders > 3).length} repeat buyers`,
        icon: Users,
      },
      {
        title: 'Products',
        value: String(inventoryItems.length),
        change: `${lowStockProducts.length} low stock`,
        icon: Package,
      },
    ],
    [customers, inventoryItems.length, lowStockProducts.length, orders]
  );

  const openCreateDialog = () => {
    setMessage('');
    setError('');

    if (activeSection === 'Products') {
      setProductForm(createProductInitialState());
      setIsProductDialogOpen(true);
      return;
    }

    if (activeSection === 'Orders') {
      setOrderForm(createOrderInitialState());
      setIsOrderDialogOpen(true);
      return;
    }

    if (activeSection === 'Customers') {
      setCustomerForm(createCustomerInitialState());
      setIsCustomerDialogOpen(true);
      return;
    }
  };

  const handleExport = () => {
    const safeDate = new Date().toISOString().slice(0, 10);

    if (activeSection === 'Products' || activeSection === 'Dashboard') {
      downloadCsvFile(
        `inventory-report-${safeDate}.csv`,
        ['SKU', 'Name', 'Category', 'Price', 'Stock', 'Reorder Level', 'Supplier', 'Updated At'],
        inventoryItems.map((item) => [
          item.sku,
          item.name,
          item.category,
          String(item.unitPrice),
          String(item.stock),
          String(item.reorderLevel),
          item.supplier,
          item.updatedAt,
        ])
      );
      setMessage('Inventory report exported.');
      return;
    }

    if (activeSection === 'Orders') {
      downloadCsvFile(
        `orders-report-${safeDate}.csv`,
        ['Order ID', 'Customer', 'Status', 'Items', 'Total'],
        orders.map((order) => [order.id, order.customer, order.status, String(order.itemCount), String(order.total)])
      );
      setMessage('Orders report exported.');
      return;
    }

    if (activeSection === 'Customers') {
      downloadCsvFile(
        `customers-report-${safeDate}.csv`,
        ['Customer ID', 'Name', 'Email', 'Orders', 'Lifetime Spend'],
        customers.map((customer) => [
          customer.id,
          customer.name,
          customer.email,
          String(customer.orders),
          String(customer.spend),
        ])
      );
      setMessage('Customers report exported.');
      return;
    }

    downloadCsvFile(
      `settings-report-${safeDate}.csv`,
      ['Setting', 'Value'],
      Object.entries(settings).map(([key, value]) => [settingsLabelMap[key as keyof StoreSettings], value])
    );
    setMessage('Settings report exported.');
  };

  const handleCreateProduct = async () => {
    const parsedPrice = Number(productForm.price);
    const parsedStock = Number(productForm.stock);

    if (
      !productForm.name.trim() ||
      !productForm.price.trim() ||
      !productForm.category.trim() ||
      !productForm.stock.trim() ||
      !productForm.image.trim() ||
      !productForm.description.trim() ||
      !productForm.longDescription.trim()
    ) {
      setError('Please complete all product fields.');
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError('Please provide a valid non-negative price.');
      return;
    }

    if (!Number.isFinite(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock)) {
      setError('Please provide a valid non-negative stock integer.');
      return;
    }

    if (productForm.description.trim().length < 10) {
      setError('Short description must be at least 10 characters.');
      return;
    }

    if (productForm.longDescription.trim().length < 30) {
      setError('Long description must be at least 30 characters.');
      return;
    }

    if (!/^https?:\/\//i.test(productForm.image.trim())) {
      setError('Please provide a valid external image URL (http/https).');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await apiClient.post('/api/products/add', {
        sku: productForm.sku.trim() || undefined,
        name: productForm.name.trim(),
        price: parsedPrice,
        category: productForm.category.trim(),
        stock: parsedStock,
        image: productForm.image.trim(),
        description: productForm.description.trim(),
        longDescription: productForm.longDescription.trim(),
      });

      setIsProductDialogOpen(false);
      setProductForm(createProductInitialState());
      setMessage('Product added successfully.');
      await loadInventory();
    } catch (requestError) {
      setError(resolveApiError(requestError, 'Unable to add product'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!orderForm.customer.trim() || !orderForm.total.trim() || !orderForm.itemCount.trim()) {
      setError('Please complete all order fields.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await apiClient.post('/api/orders', {
        customer: orderForm.customer.trim(),
        customerEmail: orderForm.customerEmail.trim() || undefined,
        total: Number(orderForm.total),
        itemCount: Number(orderForm.itemCount),
        status: orderForm.status,
      });

      setOrderForm(createOrderInitialState());
      setIsOrderDialogOpen(false);
      setMessage('Order created successfully.');
      await loadOrders();
    } catch (requestError) {
      setError(resolveApiError(requestError, 'Unable to create order'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!customerForm.name.trim() || !customerForm.email.trim()) {
      setError('Please complete all customer fields.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await apiClient.post('/api/customers', {
        name: customerForm.name.trim(),
        email: customerForm.email.trim(),
        orders: 0,
        spend: 0,
      });

      setCustomerForm(createCustomerInitialState());
      setIsCustomerDialogOpen(false);
      setMessage('Customer created successfully.');
      await loadCustomers();
    } catch (requestError) {
      setError(resolveApiError(requestError, 'Unable to create customer'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (sku: string) => {
    setInventoryActionSku(sku);
    setError('');

    try {
      await apiClient.delete(`/api/inventory/${encodeURIComponent(sku)}`);

      setMessage('Product deleted successfully.');
      await loadInventory();
    } catch (requestError) {
      setError(resolveApiError(requestError, 'Failed to delete product.'));
    } finally {
      setInventoryActionSku('');
    }
  };

  const handleAdjustStock = async (sku: string, quantityChange: number) => {
    setInventoryActionSku(sku);
    setError('');

    try {
      await apiClient.post(`/api/inventory/${encodeURIComponent(sku)}/adjust`, {
        quantityChange,
        reason: quantityChange > 0 ? 'Manual stock increment' : 'Manual stock decrement',
      });

      setMessage('Stock updated.');
      await loadInventory();
    } catch (requestError) {
      setError(resolveApiError(requestError, 'Stock update failed'));
    } finally {
      setInventoryActionSku('');
    }
  };

  const handleAddStockByAmount = async (sku: string) => {
    const rawValue = stockAdjustmentValues[sku] ?? '';
    const quantityChange = Number(rawValue);

    if (!Number.isInteger(quantityChange) || quantityChange <= 0) {
      setError('Enter a valid positive stock quantity.');
      return;
    }

    await handleAdjustStock(sku, quantityChange);
    setStockAdjustmentValues((prev) => ({ ...prev, [sku]: '' }));
  };

  const handleSaveSettings = () => {
    localStorage.setItem('admin-settings', JSON.stringify(settings));
    setMessage('Settings saved.');
    setError('');
  };

  const handleMainAction = async () => {
    setMessage('');

    if (activeSection === 'Settings') {
      handleSaveSettings();
      return;
    }

    if (activeSection === 'Dashboard') {
      await refreshDashboardData();
      setMessage('Dashboard data refreshed.');
      return;
    }

    openCreateDialog();
  };

  const handleLogout = () => {
    clearAuthToken();
    navigate('/login', { replace: true });
  };

  const sectionDescription = useMemo(() => {
    const descriptions: Record<AdminSection, string> = {
      Dashboard: 'Track high-level business performance and operational health.',
      Orders: 'Monitor and manage the latest customer purchases.',
      Products: 'Review product catalog inventory and stock status.',
      Customers: 'View top customers and engagement metrics.',
      Settings: 'Configure core store and operational preferences.',
    };
    return descriptions[activeSection];
  }, [activeSection]);

  const renderSectionContent = () => {
    if (activeSection === 'Dashboard') {
      return (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {dashboardMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Card key={metric.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardDescription>{metric.title}</CardDescription>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold tracking-tight">{metric.value}</p>
                    <p className="text-xs text-muted-foreground">{metric.change}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest customer purchases and their current status.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell>{order.customer}</TableCell>
                        <TableCell>{order.itemCount}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariantMap[order.paymentStatus ?? order.status] ?? 'outline'}>
                            {order.paymentStatus ?? order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariantMap[order.orderStatus ?? order.status] ?? 'outline'}>
                            {order.orderStatus ?? order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground">
                            <p>{order.shipment?.trackingId ?? '-'}</p>
                            <p>{order.shipment?.courierName ?? '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Low Stock Alerts</CardTitle>
                <CardDescription>Products that need restocking soon.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {lowStockProducts.length === 0 && (
                  <p className="text-sm text-muted-foreground">No low stock items right now.</p>
                )}
                {lowStockProducts.map((product) => (
                  <div key={product.sku} className="rounded-md border p-3">
                    <p className="text-sm font-medium leading-snug">{product.name}</p>
                    <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                    <Badge variant="secondary" className="mt-2">
                      {product.stock} units left
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      );
    }

    if (activeSection === 'Orders') {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Order Management</CardTitle>
            <CardDescription>Backend-persisted orders.</CardDescription>
          </CardHeader>
          <CardContent>
            {isOrdersLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading orders...
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Tracking ID</TableHead>
                  <TableHead>Courier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>{order.customer}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariantMap[order.paymentStatus ?? order.status] ?? 'outline'}>
                        {order.paymentStatus ?? order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariantMap[order.orderStatus ?? order.status] ?? 'outline'}>
                        {order.orderStatus ?? order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.shipment?.trackingId ?? '-'}</TableCell>
                    <TableCell>{order.shipment?.courierName ?? '-'}</TableCell>
                    <TableCell>{order.itemCount}</TableCell>
                    <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
      );
    }

    if (activeSection === 'Products') {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Product Inventory</CardTitle>
            <CardDescription>API-backed inventory with stock actions.</CardDescription>
          </CardHeader>
          <CardContent>
            {isInventoryLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading inventory...
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryItems.map((product) => (
                  <TableRow key={product.sku}>
                    <TableCell className="font-medium">{product.sku}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>
                      <Badge variant={product.stock <= product.reorderLevel ? 'secondary' : 'outline'}>{product.stock}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(product.unitPrice)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleAdjustStock(product.sku, -1)}
                            disabled={inventoryActionSku === product.sku || product.stock === 0}
                          >
                            -1
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleAdjustStock(product.sku, 1)}
                            disabled={inventoryActionSku === product.sku}
                          >
                            +1
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => void handleDeleteProduct(product.sku)}
                            disabled={inventoryActionSku === product.sku}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={stockAdjustmentValues[product.sku] ?? ''}
                            onChange={(event) =>
                              setStockAdjustmentValues((prev) => ({
                                ...prev,
                                [product.sku]: event.target.value,
                              }))
                            }
                            placeholder="Qty"
                            className="h-8 w-20 text-right"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleAddStockByAmount(product.sku)}
                            disabled={inventoryActionSku === product.sku}
                          >
                            Add Qty
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
      );
    }

    if (activeSection === 'Customers') {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Customer Directory</CardTitle>
            <CardDescription>Backend-persisted customers.</CardDescription>
          </CardHeader>
          <CardContent>
            {isCustomersLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading customers...
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead className="text-right">Lifetime Spend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      No customers found in backend database.
                    </TableCell>
                  </TableRow>
                )}
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.id}</TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.orders}</TableCell>
                    <TableCell className="text-right">{formatCurrency(customer.spend)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Settings</CardTitle>
          <CardDescription>Edit and save admin defaults in browser storage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(settings).map(([key, value]) => (
            <div key={key} className="space-y-2 rounded-md border p-4">
              <Label htmlFor={key}>{settingsLabelMap[key as keyof StoreSettings]}</Label>
              <Input
                id={key}
                value={value}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, [key]: event.target.value }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  const primaryButtonLabel =
    activeSection === 'Products'
      ? 'Add Product'
      : activeSection === 'Orders'
        ? 'Create Order'
        : activeSection === 'Customers'
          ? 'Add Customer'
          : activeSection === 'Settings'
            ? 'Save Settings'
            : 'Refresh Data';

  return (
    <section className="min-h-screen bg-muted/30 px-4 py-24 md:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="h-fit lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="text-lg">Admin Panel</CardTitle>
            <CardDescription>Prototype navigation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {adminSections.map((section) => {
              const Icon = sectionIconMap[section];
              const isActive = activeSection === section;

              return (
                <Button
                  key={section}
                  variant={isActive ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveSection(section)}
                >
                  <Icon className="h-4 w-4" />
                  {section}
                </Button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {(message || error) && (
            <Card className={error ? 'border-destructive/40' : 'border-emerald-500/40'}>
              <CardContent className="py-4 text-sm">
                {error ? <p className="text-destructive">{error}</p> : <p className="text-emerald-700">{message}</p>}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-2xl">{activeSection}</CardTitle>
                <CardDescription>{sectionDescription}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4" />
                  Export Report
                </Button>
                <Button onClick={() => void handleMainAction()} disabled={isSubmitting || (activeSection === 'Products' && isInventoryLoading) || (activeSection === 'Orders' && isOrdersLoading) || (activeSection === 'Customers' && isCustomersLoading)}>
                  {activeSection === 'Settings' ? <Save className="h-4 w-4" /> : activeSection === 'Dashboard' ? <RefreshCw className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {primaryButtonLabel}
                </Button>
              </div>
            </CardHeader>
          </Card>

          {renderSectionContent()}
        </div>
      </div>

      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>Create a new product in the catalog backend.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={productForm.sku} onChange={(event) => setProductForm((prev) => ({ ...prev, sku: event.target.value }))} placeholder="PRD-1001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={productForm.category} onChange={(event) => setProductForm((prev) => ({ ...prev, category: event.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={productForm.name} onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input id="price" type="number" value={productForm.price} onChange={(event) => setProductForm((prev) => ({ ...prev, price: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input id="stock" type="number" min={0} step={1} value={productForm.stock} onChange={(event) => setProductForm((prev) => ({ ...prev, stock: event.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="image">Image URL</Label>
              <Input id="image" type="url" value={productForm.image} onChange={(event) => setProductForm((prev) => ({ ...prev, image: event.target.value }))} placeholder="https://example.com/filter.png" />
              <p className="text-xs text-muted-foreground">Paste a direct image link from the web.</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Short Description</Label>
              <Input id="description" value={productForm.description} onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="long-description">Long Description</Label>
              <Input id="long-description" value={productForm.longDescription} onChange={(event) => setProductForm((prev) => ({ ...prev, longDescription: event.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateProduct()} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Order</DialogTitle>
            <DialogDescription>Add a mock order entry for workflow testing.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="order-customer">Customer Name</Label>
              <Input id="order-customer" value={orderForm.customer} onChange={(event) => setOrderForm((prev) => ({ ...prev, customer: event.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="order-customer-email">Customer Email (optional)</Label>
              <Input id="order-customer-email" type="email" value={orderForm.customerEmail} onChange={(event) => setOrderForm((prev) => ({ ...prev, customerEmail: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order-total">Total</Label>
              <Input id="order-total" type="number" value={orderForm.total} onChange={(event) => setOrderForm((prev) => ({ ...prev, total: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order-items">Items</Label>
              <Input id="order-items" type="number" value={orderForm.itemCount} onChange={(event) => setOrderForm((prev) => ({ ...prev, itemCount: event.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="order-status">Status</Label>
              <select
                id="order-status"
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={orderForm.status}
                onChange={(event) => setOrderForm((prev) => ({ ...prev, status: event.target.value as OrderRecord['status'] }))}
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Shipped">Shipped</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateOrder()} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
            <DialogDescription>Create a mock customer entry for prototype flows.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Customer Name</Label>
              <Input id="customer-name" value={customerForm.name} onChange={(event) => setCustomerForm((prev) => ({ ...prev, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-email">Customer Email</Label>
              <Input id="customer-email" type="email" value={customerForm.email} onChange={(event) => setCustomerForm((prev) => ({ ...prev, email: event.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateCustomer()} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default AdminDashboard;
