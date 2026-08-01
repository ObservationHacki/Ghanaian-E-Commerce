import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider } from '@/lib/auth-context';
import { WishlistProvider } from '@/lib/wishlist';
import { Layout } from '@/components/layout/layout';

import NotFound from '@/pages/not-found';
import { Home } from '@/pages/home';
import { Shop } from '@/pages/shop';
import { ProductDetail } from '@/pages/product-detail';
import { Wishlist } from '@/pages/wishlist';
import { Info } from '@/pages/info';
import { Cart } from '@/pages/cart';
import { Checkout } from '@/pages/checkout';
import { OrderDetail } from '@/pages/order-detail';
import { ErrorBoundary } from '@/components/error-boundary';
import { HelmetProvider } from 'react-helmet-async';
import { Orders } from '@/pages/account/orders';
import { Addresses } from '@/pages/account/addresses';
import { Settings } from '@/pages/account/settings';
import { Login } from '@/pages/auth/login';
import { Register } from '@/pages/auth/register';
import { AuthCallback } from '@/pages/auth/callback';

import { AdminGate } from '@/pages/admin/admin-gate';
import { AdminDashboard } from '@/pages/admin/dashboard';
import { AdminAdministrators } from '@/pages/admin/administrators';
import { AdminSettings } from '@/pages/admin/settings';
import { AdminOrders } from '@/pages/admin/orders';
import { AdminOrderDetail } from '@/pages/admin/order-detail';
import { AdminProducts } from '@/pages/admin/products';
import { AdminProductEdit } from '@/pages/admin/product-edit';
import { AdminCategories } from '@/pages/admin/categories';
import { AdminBrands } from '@/pages/admin/brands';
import { AdminInventory } from '@/pages/admin/inventory';
import { AdminCustomers } from '@/pages/admin/customers';
import { AdminCustomerDetail } from '@/pages/admin/customer-detail';
import { AdminAnalytics } from '@/pages/admin/analytics';
import { AdminContent } from '@/pages/admin/content';
import { AdminStub } from '@/pages/admin/stub';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function withAdmin(Page: React.ComponentType) {
  return function AdminWrappedPage() {
    return (
      <AdminGate>
        <Page />
      </AdminGate>
    );
  };
}

function Router() {
  return (
    <Switch>
      <Route path="/admin/orders/:id" component={withAdmin(AdminOrderDetail)} />
      <Route path="/admin/orders" component={withAdmin(AdminOrders)} />
      <Route path="/admin/products/new" component={withAdmin(AdminProductEdit)} />
      <Route path="/admin/products/:id" component={withAdmin(AdminProductEdit)} />
      <Route path="/admin/products" component={withAdmin(AdminProducts)} />
      <Route path="/admin/categories" component={withAdmin(AdminCategories)} />
      <Route path="/admin/brands" component={withAdmin(AdminBrands)} />
      <Route path="/admin/customers/:userId" component={withAdmin(AdminCustomerDetail)} />
      <Route path="/admin/customers" component={withAdmin(AdminCustomers)} />
      <Route path="/admin/inventory" component={withAdmin(AdminInventory)} />
      <Route
        path="/admin/promotions"
        component={withAdmin(() => (
          <AdminStub
            title="Promotions"
            copy="Promotional campaigns will be managed here once pricing rules ship."
          />
        ))}
      />
      <Route
        path="/admin/reviews"
        component={withAdmin(() => (
          <AdminStub
            title="Reviews"
            copy="Review moderation will land once customer reviews are collected."
          />
        ))}
      />
      <Route path="/admin/analytics" component={withAdmin(AdminAnalytics)} />
      <Route path="/admin/content" component={withAdmin(AdminContent)} />
      <Route path="/admin/settings" component={withAdmin(AdminSettings)} />
      <Route path="/admin/administrators" component={withAdmin(AdminAdministrators)} />
      <Route path="/admin" component={withAdmin(AdminDashboard)} />

      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/shop" component={Shop} />
            <Route path="/product/:id" component={ProductDetail} />
            <Route path="/wishlist" component={Wishlist} />
            <Route path="/info/:slug" component={Info} />
            <Route path="/cart" component={Cart} />
            <Route path="/checkout" component={Checkout} />
            <Route path="/orders/:id" component={OrderDetail} />
            <Route path="/account/orders" component={Orders} />
            <Route path="/account/addresses" component={Addresses} />
            <Route path="/account/settings" component={Settings} />
            <Route path="/auth/login" component={Login} />
            <Route path="/auth/register" component={Register} />
            <Route path="/auth/callback" component={AuthCallback} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <WishlistProvider>
            <TooltipProvider>
              <ErrorBoundary>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
                  <Router />
                </WouterRouter>
              </ErrorBoundary>
              <Toaster />
            </TooltipProvider>
          </WishlistProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
