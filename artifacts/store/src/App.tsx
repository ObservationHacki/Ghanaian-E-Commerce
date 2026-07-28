import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider } from '@/lib/auth-context';
import { Layout } from '@/components/layout/layout';

import NotFound from '@/pages/not-found';
import { Home } from '@/pages/home';
import { Shop } from '@/pages/shop';
import { ProductDetail } from '@/pages/product-detail';
import { Cart } from '@/pages/cart';
import { Checkout } from '@/pages/checkout';
import { PaystackCallback } from '@/pages/paystack-callback';
import { OrderDetail } from '@/pages/order-detail';
import { Orders } from '@/pages/account/orders';
import { Addresses } from '@/pages/account/addresses';
import { Settings } from '@/pages/account/settings';
import { Login } from '@/pages/auth/login';
import { Register } from '@/pages/auth/register';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/shop" component={Shop} />
        <Route path="/product/:id" component={ProductDetail} />
        <Route path="/cart" component={Cart} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/checkout/paystack-callback" component={PaystackCallback} />
        <Route path="/orders/:id" component={OrderDetail} />
        <Route path="/account/orders" component={Orders} />
        <Route path="/account/addresses" component={Addresses} />
        <Route path="/account/settings" component={Settings} />
        <Route path="/auth/login" component={Login} />
        <Route path="/auth/register" component={Register} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
