import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useGetCart, useCreateOrder, useInitializePaystackPayment } from '@workspace/api-client-react';
import { getCartSessionId } from '@/lib/cart';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle2, MapPin, CreditCard, Banknote, ShoppingBag } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useToast } from '@/hooks/use-toast';

// Fix leaflet marker icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function LocationPicker({ position, setPosition }: { position: [number, number], setPosition: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} /> : null;
}

export function Checkout() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const sessionId = getCartSessionId();
  const { toast } = useToast();

  const { data: cart } = useGetCart(sessionId, { query: { enabled: !!sessionId } });
  
  const createOrder = useCreateOrder();
  const initPaystack = useInitializePaystackPayment();

  // Form State
  const [digitalAddress, setDigitalAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [position, setPosition] = useState<[number, number]>([5.6037, -0.1870]); // Default to Accra
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'pay_on_delivery'>('paystack');
  
  // Created Order tracking
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  // Redirect if empty
  useEffect(() => {
    if (cart && cart.items.length === 0 && step === 1) {
      setLocation('/cart');
    }
  }, [cart, location, step]);

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!digitalAddress) {
      toast({ title: 'Address required', description: 'Please enter your GhanaPost GPS address', variant: 'destructive' });
      return;
    }
    setStep(2);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createOrder.mutate(
      {
        data: {
          sessionId,
          userId: user?.id,
          paymentMethod,
          address: {
            digitalAddress,
            notes,
            lat: position[0],
            lng: position[1],
            userId: user?.id
          }
        }
      },
      {
        onSuccess: (order) => {
          setCreatedOrder(order);
          if (paymentMethod === 'paystack') {
            initPaystack.mutate(
              { data: { orderId: order.id, email: user?.email || 'guest@example.com' } },
              {
                onSuccess: (result) => {
                  window.location.href = result.authorizationUrl;
                },
                onError: () => {
                  toast({ title: 'Payment Error', description: 'Failed to initialize payment gateway', variant: 'destructive' });
                }
              }
            );
          } else {
            setStep(3);
          }
        },
        onError: () => {
          toast({ title: 'Order Error', description: 'Failed to create your order. Please try again.', variant: 'destructive' });
        }
      }
    );
  };

  if (!cart) return null;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
      <div className="flex flex-col md:flex-row gap-12">
        {/* Left Col: Wizard */}
        <div className="flex-1">
          {/* Progress Bar */}
          <div className="flex items-center justify-between mb-8 relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -z-10" />
            
            {[
              { num: 1, label: 'Shipping' },
              { num: 2, label: 'Payment' },
              { num: 3, label: 'Done' }
            ].map(s => (
              <div key={s.num} className="flex flex-col items-center bg-background px-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2 transition-colors ${step >= s.num ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>
                  {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                </div>
                <span className={`text-xs font-medium ${step >= s.num ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Steps */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold mb-6 tracking-tight">Shipping Details</h2>
              <form onSubmit={handleShippingSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="digitalAddress">GhanaPost GPS Address</Label>
                    <Input 
                      id="digitalAddress" 
                      placeholder="e.g. GA-183-1234" 
                      value={digitalAddress}
                      onChange={e => setDigitalAddress(e.target.value)}
                      className="h-12 text-base"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Pin your location (Optional but helpful)</Label>
                    <div className="h-[300px] w-full rounded-2xl overflow-hidden border">
                      <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <LocationPicker position={position} setPosition={setPosition} />
                      </MapContainer>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center mt-1"><MapPin className="w-3 h-3 mr-1"/> Click on the map to place a pin at your exact location</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Delivery Notes</Label>
                    <Textarea 
                      id="notes" 
                      placeholder="e.g. Blue gate, call upon arrival" 
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="resize-none"
                    />
                  </div>
                </div>
                <Button type="submit" size="lg" className="w-full h-14 rounded-full font-bold text-base hover-elevate">
                  Continue to Payment
                </Button>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold mb-6 tracking-tight">Payment Method</h2>
              <form onSubmit={handlePaymentSubmit} className="space-y-8">
                <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="grid grid-cols-1 gap-4">
                  <Label 
                    htmlFor="paystack" 
                    className={`cursor-pointer border-2 rounded-2xl p-6 flex flex-col gap-4 transition-all hover-elevate ${paymentMethod === 'paystack' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-transparent bg-secondary'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="paystack" id="paystack" className="sr-only" />
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-base">Mobile Money / Card</p>
                          <p className="text-sm text-muted-foreground font-normal">Powered by Paystack</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'paystack' ? 'border-primary' : 'border-muted-foreground/30'}`}>
                        {paymentMethod === 'paystack' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                      </div>
                    </div>
                  </Label>

                  <Label 
                    htmlFor="pod" 
                    className={`cursor-pointer border-2 rounded-2xl p-6 flex flex-col gap-4 transition-all hover-elevate ${paymentMethod === 'pay_on_delivery' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-transparent bg-secondary'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="pay_on_delivery" id="pod" className="sr-only" />
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <Banknote className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-base">Pay on Delivery</p>
                          <p className="text-sm text-muted-foreground font-normal">Pay with cash or Momo upon receiving</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'pay_on_delivery' ? 'border-primary' : 'border-muted-foreground/30'}`}>
                        {paymentMethod === 'pay_on_delivery' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                      </div>
                    </div>
                  </Label>
                </RadioGroup>

                <div className="flex gap-4">
                  <Button type="button" variant="outline" size="lg" className="h-14 rounded-full px-8" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button type="submit" size="lg" className="flex-1 h-14 rounded-full font-bold text-base hover-elevate" disabled={createOrder.isPending || initPaystack.isPending}>
                    {paymentMethod === 'paystack' ? 'Pay Now' : 'Complete Order'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {step === 3 && createdOrder && (
            <div className="animate-in zoom-in duration-500 flex flex-col items-center text-center py-12">
              <div className="w-24 h-24 bg-success/20 text-success rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">Order Confirmed!</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-2">
                Thank you for shopping with Kumasi. Your order <span className="font-bold text-foreground">#{createdOrder.id}</span> has been received and is being processed.
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                Estimated delivery: 1-3 business days
              </p>
              <Link href={`/orders/${createdOrder.id}`}>
                <Button size="lg" className="rounded-full h-14 px-8 font-semibold">
                  Track Order Status
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Right Col: Summary */}
        {step < 3 && (
          <div className="md:w-80 lg:w-96 flex-shrink-0">
            <Card className="rounded-3xl border-none shadow-md bg-card sticky top-24">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5"/> Order Summary
                </h3>
                
                <div className="space-y-4 max-h-[40vh] overflow-auto pr-2 mb-6">
                  {cart.items.map(item => (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-16 h-16 rounded-xl bg-secondary/50 flex-shrink-0 flex items-center justify-center p-2">
                        {item.productImage ? (
                          <img src={item.productImage} className="w-full h-full object-contain mix-blend-multiply" />
                        ) : null}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold line-clamp-1">{item.productName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.variantName} x{item.quantity}</p>
                        <p className="text-sm font-bold mt-1">{formatCurrency(item.unitPrice * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="pt-6 border-t space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrency(cart.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="font-medium text-success">Free</span>
                  </div>
                  <div className="flex justify-between items-end pt-3">
                    <span className="font-bold text-base">Total</span>
                    <span className="font-black text-xl">{formatCurrency(cart.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
