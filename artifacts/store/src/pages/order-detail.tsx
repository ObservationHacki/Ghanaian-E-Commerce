import { useRoute, Link } from 'wouter';
import { useGetOrder } from '@workspace/api-client-react';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, CheckCircle2, Circle, ArrowLeft, MapPin, CreditCard, Banknote } from 'lucide-react';
import { format } from 'date-fns';

const TIMELINE_STEPS = [
  { status: 'received', label: 'Order Received' },
  { status: 'payment_confirmed', label: 'Payment Confirmed' },
  { status: 'processing', label: 'Processing' },
  { status: 'dispatch', label: 'Ready for Dispatch' },
  { status: 'delivering', label: 'Out for Delivery' },
  { status: 'delivered', label: 'Delivered' },
];

export function OrderDetail() {
  const [, params] = useRoute('/orders/:id');
  const id = params?.id ? Number(params.id) : 0;

  const { data: order, isLoading } = useGetOrder(id, { query: { enabled: !!id } });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <Skeleton className="h-12 w-48" />
        <Card className="rounded-3xl border-none shadow-sm">
          <CardContent className="h-40" />
        </Card>
        <Card className="rounded-3xl border-none shadow-sm">
          <CardContent className="h-80" />
        </Card>
      </div>
    );
  }

  if (!order) return <div className="text-center py-24 text-lg">Order not found</div>;

  const currentStatusIndex = TIMELINE_STEPS.findIndex((s) => s.status === order.status);
  const activeStep = currentStatusIndex >= 0 ? currentStatusIndex : 0;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
      <Link
        href="/account/orders"
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Orders
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Order #{order.id}</h1>
          <p className="text-muted-foreground text-sm">
            Placed on {format(new Date(order.createdAt), 'MMMM d, yyyy h:mm a')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg text-muted-foreground">Total:</span>
          <span className="font-black text-2xl">{formatCurrency(order.total)}</span>
        </div>
      </div>

      {/* Visual Timeline */}
      <Card className="rounded-3xl border-none shadow-sm bg-card mb-8 overflow-hidden">
        <CardContent className="p-8">
          <h2 className="text-lg font-bold mb-8">Order Status</h2>
          <div className="relative">
            <div className="absolute top-5 left-8 right-8 h-0.5 bg-border -z-10 hidden md:block" />
            <div
              className="absolute top-5 left-8 h-0.5 bg-primary -z-10 hidden md:block transition-all duration-1000"
              style={{ width: `${(activeStep / (TIMELINE_STEPS.length - 1)) * 100}%` }}
            />

            <div className="flex flex-col md:flex-row justify-between gap-6 md:gap-0">
              {TIMELINE_STEPS.map((step, i) => {
                const isCompleted = i <= activeStep;
                const isCurrent = i === activeStep;
                const dotClass = isCompleted
                  ? 'bg-primary text-primary-foreground shadow-md scale-110'
                  : 'bg-muted text-muted-foreground';
                const labelClass = isCurrent
                  ? 'text-foreground font-bold'
                  : isCompleted
                  ? 'text-foreground'
                  : 'text-muted-foreground';
                return (
                  <div
                    key={step.status}
                    className="flex md:flex-col items-center gap-4 md:gap-3 bg-card z-10 md:px-2 relative"
                  >
                    {i < TIMELINE_STEPS.length - 1 && (
                      <div className="absolute left-[1.1rem] top-10 w-0.5 h-full bg-border -z-10 md:hidden" />
                    )}
                    {i < activeStep && (
                      <div className="absolute left-[1.1rem] top-10 w-0.5 h-full bg-primary -z-10 md:hidden" />
                    )}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${dotClass}`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Circle className="w-3 h-3" />
                      )}
                    </div>
                    <span className={`text-sm md:text-xs font-medium md:text-center ${labelClass}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Order Items */}
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-xl font-bold tracking-tight">Items in your order</h2>
          <div className="space-y-4">
            {order.items.map((item) => (
              <Card key={item.id} className="rounded-2xl border-none shadow-sm bg-background">
                <CardContent className="p-4 flex gap-4">
                  <div className="w-20 h-20 bg-secondary/50 rounded-xl flex items-center justify-center flex-shrink-0 p-2">
                    {item.productImage ? (
                      <img
                        src={item.productImage}
                        className="w-full h-full object-contain mix-blend-multiply"
                        alt={item.productName ?? ''}
                      />
                    ) : (
                      <Package className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="font-semibold">{item.productName}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{item.variantName}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-medium">Qty: {item.quantity}</span>
                      <span className="font-bold">{formatCurrency(item.unitPrice * item.quantity)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Order Details Column */}
        <div className="space-y-6">
          <Card className="rounded-2xl border-none shadow-sm bg-card">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> Delivery Address
              </h3>
              {order.address ? (
                <div className="text-sm space-y-2">
                  <p className="font-medium text-foreground">GhanaPost GPS:</p>
                  <p className="text-muted-foreground bg-secondary/50 p-2 rounded-md font-mono">
                    {order.address.digitalAddress}
                  </p>
                  {order.address.notes && (
                    <>
                      <p className="font-medium text-foreground mt-4">Delivery Notes:</p>
                      <p className="text-muted-foreground">{order.address.notes}</p>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No address details available</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-none shadow-sm bg-card">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                {order.paymentMethod === 'paystack' ? (
                  <CreditCard className="w-5 h-5 text-primary" />
                ) : (
                  <Banknote className="w-5 h-5 text-primary" />
                )}
                Payment Details
              </h3>
              <div className="text-sm space-y-4">
                <div>
                  <p className="font-medium text-foreground">Method</p>
                  <p className="text-muted-foreground capitalize">
                    {order.paymentMethod.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Status</p>
                  <div
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-bold mt-1 ${
                      order.paymentStatus === 'paid'
                        ? 'bg-success/20 text-success'
                        : 'bg-destructive/20 text-destructive'
                    }`}
                  >
                    {order.paymentStatus.toUpperCase()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
