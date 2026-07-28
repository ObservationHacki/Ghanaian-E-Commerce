import { useEffect, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useVerifyPaystackPayment } from '@workspace/api-client-react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export function PaystackCallback() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const reference = searchParams.get('reference');
  
  const [, setLocation] = useLocation();
  const verifyPayment = useVerifyPaystackPayment();
  const isVerifying = useRef(false);

  useEffect(() => {
    if (!reference || isVerifying.current) return;
    
    // In a real scenario, we might also have the orderId in the callback URL or local storage
    // If we only have reference, we'll need to pass it to the backend and the backend will find the order
    // But Orval spec says `useVerifyPaystackPayment` mutation takes { data: { reference, orderId } }
    // Let's assume orderId is passed in the callback URL by Paystack callback or handled in backend if orderId is 0 
    const orderIdParam = searchParams.get('orderId');
    const orderId = orderIdParam ? Number(orderIdParam) : 0;

    isVerifying.current = true;
    verifyPayment.mutate(
      { data: { reference, orderId } },
      {
        onSuccess: (res) => {
          if (res.success && res.orderId) {
            setLocation(`/orders/${res.orderId}`);
          }
        },
        onError: () => {
          isVerifying.current = false;
        }
      }
    );
  }, [reference, verifyPayment, setLocation, searchParams]);

  if (!reference) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Invalid Request</h1>
        <p className="text-muted-foreground mb-6">No payment reference found.</p>
        <Link href="/">
          <Button>Return Home</Button>
        </Link>
      </div>
    );
  }

  if (verifyPayment.isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Payment Verification Failed</h1>
        <p className="text-muted-foreground mb-6">We couldn't verify your payment. If you were charged, please contact support.</p>
        <Link href="/account/orders">
          <Button>View My Orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
      <h1 className="text-2xl font-bold tracking-tight mb-2">Verifying Payment...</h1>
      <p className="text-muted-foreground">Please wait while we confirm your payment with Paystack.</p>
    </div>
  );
}
