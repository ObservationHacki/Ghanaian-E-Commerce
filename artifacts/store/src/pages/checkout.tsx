import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetCart,
  useCreateOrder,
  useCreateAddress,
  useListAddresses,
  useSubmitMomoReference,
  OrderInputPaymentMethod,
  OrderInputDeliveryZone,
} from '@workspace/api-client-react';
import type { Order } from '@workspace/api-client-react';
import { getCartSessionId } from '@/lib/cart';
import { useAuth } from '@/lib/auth-context';
import { GHANA_REGIONS } from '@/lib/ghana-regions';
import { cn, formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DistrictCombobox } from '@/components/commerce/district-combobox';
import { PageMeta } from '@/components/seo/page-meta';
import {
  TurnstileField,
  isTurnstileConfigured,
} from '@/components/turnstile-field';
import {
  Check,
  ChevronLeft,
  Loader2,
  ShieldCheck,
  Smartphone,
  Clock,
  MapPin,
  Plus,
} from 'lucide-react';

const ENV_MOMO_MERCHANT_NUMBER = String(
  import.meta.env.VITE_MOMO_MERCHANT_NUMBER ?? '',
).trim();

type PaymentMethod = (typeof OrderInputPaymentMethod)[keyof typeof OrderInputPaymentMethod];
type DeliveryZone = (typeof OrderInputDeliveryZone)[keyof typeof OrderInputDeliveryZone];

type StoreConfig = {
  momoMerchantNumber?: string;
  accraDeliveryFee?: number | null;
  outsideAccraDeliveryFee?: number | null;
  deliveryFeesConfigured?: boolean;
};

const STEPS = [
  { num: 1, label: 'Delivery' },
  { num: 2, label: 'Payment' },
  { num: 3, label: 'MoMo' },
  { num: 4, label: 'Done' },
];

function zoneFromRegion(regionName: string): DeliveryZone | '' {
  return regionName === 'Greater Accra' ? OrderInputDeliveryZone.accra : '';
}

function deliveryZoneLabel(zone: DeliveryZone | ''): string {
  if (zone === OrderInputDeliveryZone.accra) return 'Accra';
  if (zone === OrderInputDeliveryZone.outside_accra) return 'Outside Accra';
  return '—';
}

export function Checkout() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sessionId = getCartSessionId();

  const [step, setStep] = useState(1);
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [digitalAddress, setDigitalAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZone | ''>('');
  /** null = new address form; number = saved address id */
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const didPrefillAddress = useRef(false);
  const [paymentMethod] = useState<PaymentMethod>(OrderInputPaymentMethod.momo_manual);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [momoReference, setMomoReference] = useState('');
  const [momoMerchantNumber, setMomoMerchantNumber] = useState(ENV_MOMO_MERCHANT_NUMBER);
  const [deliveryFeesConfigured, setDeliveryFeesConfigured] = useState(false);
  const [accraDeliveryFee, setAccraDeliveryFee] = useState<number | null>(null);
  const [outsideAccraDeliveryFee, setOutsideAccraDeliveryFee] = useState<number | null>(null);
  const [orderTurnstileToken, setOrderTurnstileToken] = useState<string | null>(null);
  const [momoTurnstileToken, setMomoTurnstileToken] = useState<string | null>(null);
  const turnstileRequired = isTurnstileConfigured();

  const { data: cart } = useGetCart(sessionId, {
    query: { enabled: !!sessionId, queryKey: ['cart', sessionId] },
  });

  const { data: savedAddresses } = useListAddresses({
    query: { enabled: !!user, queryKey: ['listAddresses'] },
  });

  const createOrder = useCreateOrder();
  const createAddress = useCreateAddress();
  const submitMomo = useSubmitMomoReference();

  useEffect(() => {
    if (!user) navigate('/auth/login?redirect=/checkout');
  }, [user, navigate]);

  useEffect(() => {
    if (cart && cart.items.length === 0 && step === 1) navigate('/cart');
  }, [cart, step, navigate]);

  // Prefer API config so MoMo / fees work even if Vite was started before .env was set.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/store-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg: StoreConfig | null) => {
        if (cancelled || !cfg) return;
        const number = String(cfg.momoMerchantNumber ?? '').trim();
        if (number) setMomoMerchantNumber(number);
        setDeliveryFeesConfigured(Boolean(cfg.deliveryFeesConfigured));
        setAccraDeliveryFee(
          typeof cfg.accraDeliveryFee === 'number' ? cfg.accraDeliveryFee : null,
        );
        setOutsideAccraDeliveryFee(
          typeof cfg.outsideAccraDeliveryFee === 'number'
            ? cfg.outsideAccraDeliveryFee
            : null,
        );
      })
      .catch(() => {
        /* keep env fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const applySavedAddress = (id: number) => {
    const addr = savedAddresses?.find((a) => a.id === id);
    if (!addr) return;
    setSelectedAddressId(id);
    setRegion(addr.region);
    setDistrict(addr.district);
    setDigitalAddress(addr.digitalAddress);
    setNotes(addr.notes ?? '');
    const suggested = zoneFromRegion(addr.region);
    if (suggested) setDeliveryZone(suggested);
  };

  const startNewAddress = () => {
    setSelectedAddressId(null);
    setRegion('');
    setDistrict('');
    setDigitalAddress('');
    setNotes('');
    setDeliveryZone('');
  };

  // Prefill from the most recent saved address once (don't override "new address").
  useEffect(() => {
    if (didPrefillAddress.current || !savedAddresses?.length) return;
    didPrefillAddress.current = true;
    const addr = savedAddresses[0];
    setSelectedAddressId(addr.id);
    setRegion(addr.region);
    setDistrict(addr.district);
    setDigitalAddress(addr.digitalAddress);
    setNotes(addr.notes ?? '');
    const suggested = zoneFromRegion(addr.region);
    if (suggested) setDeliveryZone(suggested);
  }, [savedAddresses]);

  const submitDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!region) {
      toast({
        title: 'Region required',
        description: 'Select the region we should deliver to.',
        variant: 'destructive',
      });
      return;
    }
    if (!district) {
      toast({
        title: 'District required',
        description: 'Select the district we should deliver to.',
        variant: 'destructive',
      });
      return;
    }
    if (!digitalAddress.trim()) {
      toast({
        title: 'Address required',
        description: 'Enter your GhanaPost GPS address so the courier can find you.',
        variant: 'destructive',
      });
      return;
    }
    if (!deliveryZone) {
      toast({
        title: 'Delivery area required',
        description: 'Choose Accra or Outside Accra so we can calculate delivery.',
        variant: 'destructive',
      });
      return;
    }
    if (!deliveryFeesConfigured) {
      toast({
        title: 'Delivery fees not configured',
        description: 'Checkout is temporarily unavailable. Please try again later.',
        variant: 'destructive',
      });
      return;
    }

    const goPayment = () => setStep(2);

    // Persist new addresses for next checkout when the user opts in.
    if (selectedAddressId == null && saveNewAddress && user) {
      createAddress.mutate(
        {
          data: {
            digitalAddress: digitalAddress.trim(),
            region,
            district,
            notes: notes.trim() || undefined,
            userId: user.id,
          },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['listAddresses'] });
            goPayment();
          },
          onError: () => {
            // Still allow checkout if save fails.
            toast({
              title: 'Address not saved',
              description: 'Continuing to payment with this delivery address.',
            });
            goPayment();
          },
        },
      );
      return;
    }

    goPayment();
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === 'momo_manual' && !momoMerchantNumber) {
      toast({
        title: 'MoMo unavailable',
        description: 'Merchant number is not configured. Please contact support.',
        variant: 'destructive',
      });
      return;
    }
    if (!deliveryFeesConfigured || !deliveryZone) {
      toast({
        title: 'Delivery fees not configured',
        description: 'Checkout is temporarily unavailable. Please try again later.',
        variant: 'destructive',
      });
      return;
    }
    if (turnstileRequired && !orderTurnstileToken) {
      toast({
        title: 'Bot check required',
        description: 'Please complete the security check before continuing.',
        variant: 'destructive',
      });
      return;
    }

    createOrder.mutate(
      {
        data: {
          sessionId,
          userId: user?.id,
          paymentMethod,
          deliveryZone,
          turnstileToken: orderTurnstileToken || undefined,
          address: {
            digitalAddress,
            region,
            district,
            notes,
            userId: user?.id,
          },
        },
      },
      {
        onSuccess: (order) => {
          setCreatedOrder(order);
          setOrderTurnstileToken(null);
          queryClient.invalidateQueries({ queryKey: ['cart', sessionId] });
          setStep(3);
        },
        onError: (err: unknown) => {
          const message =
            err && typeof err === 'object' && 'message' in err
              ? String((err as { message?: string }).message ?? '')
              : '';
          const botFailed = /bot check failed/i.test(message);
          const feeIssue = /delivery fee/i.test(message);
          toast({
            title: botFailed
              ? 'Bot check failed'
              : feeIssue
                ? 'Delivery fees not configured'
                : 'Order failed',
            description: botFailed
              ? 'Bot check failed, please try again.'
              : feeIssue
                ? message || 'Checkout is temporarily unavailable.'
                : message || 'We could not place your order. Please try again.',
            variant: 'destructive',
          });
          if (botFailed) setOrderTurnstileToken(null);
        },
      },
    );
  };

  const submitMomoReference = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdOrder) return;
    const ref = momoReference.trim();
    if (ref.length < 3) {
      toast({
        title: 'Reference required',
        description: 'Paste the MoMo transaction ID from your payment confirmation.',
        variant: 'destructive',
      });
      return;
    }
    if (turnstileRequired && !momoTurnstileToken) {
      toast({
        title: 'Bot check required',
        description: 'Please complete the security check before continuing.',
        variant: 'destructive',
      });
      return;
    }

    submitMomo.mutate(
      {
        id: createdOrder.id,
        data: {
          momoReference: ref,
          turnstileToken: momoTurnstileToken || undefined,
        },
      },
      {
        onSuccess: (result) => {
          setCreatedOrder(result.order);
          setMomoTurnstileToken(null);
          setStep(4);
        },
        onError: (err: unknown) => {
          const status =
            err && typeof err === 'object' && 'status' in err
              ? Number((err as { status?: number }).status)
              : undefined;
          const message =
            err && typeof err === 'object' && 'message' in err
              ? String((err as { message?: string }).message ?? '')
              : '';
          const botFailed = /bot check failed/i.test(message);
          toast({
            title: botFailed
              ? 'Bot check failed'
              : status === 409 || /already been used/i.test(message)
                ? 'Reference already used'
                : 'Could not save reference',
            description: botFailed
              ? 'Bot check failed, please try again.'
              : status === 409 || /already been used/i.test(message)
                ? 'This MoMo transaction ID is already linked to another order. Use a new payment reference.'
                : 'Please check the ID and try again.',
            variant: 'destructive',
          });
          if (botFailed) setMomoTurnstileToken(null);
        },
      },
    );
  };

  if (!user || !cart) return null;

  const submitting = createOrder.isPending;
  const subtotal = cart.total;
  const selectedDeliveryFee =
    deliveryZone === OrderInputDeliveryZone.accra
      ? accraDeliveryFee
      : deliveryZone === OrderInputDeliveryZone.outside_accra
        ? outsideAccraDeliveryFee
        : null;
  const displayDeliveryFee =
    createdOrder?.deliveryFee ??
    (typeof selectedDeliveryFee === 'number' ? selectedDeliveryFee : null);
  const orderTotal =
    createdOrder?.total ??
    (typeof displayDeliveryFee === 'number' ? subtotal + displayDeliveryFee : subtotal);
  const visibleSteps = STEPS;

  return (
    <div className="container-narrow py-8 md:py-12">
      <PageMeta
        title="Checkout"
        description="Complete your VBUY order with Mobile Money."
        path="/checkout"
        noIndex
      />
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <ol className="mb-12 flex items-center gap-3">
            {visibleSteps.map((s, i) => {
              const done = step > s.num;
              const active = step === s.num;
              return (
                <li key={s.num} className="flex flex-1 items-center gap-3">
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-colors',
                      done
                        ? 'bg-accent text-accent-foreground'
                        : active
                          ? 'bg-foreground text-background'
                          : 'bg-surface-sunken text-ink-subtle',
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      'hidden text-[14px] font-medium sm:block',
                      active || done ? 'text-foreground' : 'text-ink-subtle',
                    )}
                  >
                    {s.label}
                  </span>
                  {i < visibleSteps.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'h-px flex-1 transition-colors',
                        done ? 'bg-accent' : 'bg-hairline',
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ol>

          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <h1 className="text-headline text-foreground">Where should we deliver?</h1>
              <p className="mt-3 text-lede text-ink-muted">
                {savedAddresses?.length
                  ? 'Choose a saved address or enter a new one.'
                  : 'We deliver to all 16 regions. Choose your region and district.'}
              </p>

              <form onSubmit={submitDelivery} className="mt-10 space-y-8">
                {!!savedAddresses?.length && (
                  <fieldset className="space-y-3">
                    <legend className="text-[15px] font-medium text-foreground">
                      Saved addresses
                    </legend>
                    <ul className="space-y-2.5">
                      {savedAddresses.map((addr) => {
                        const selected = selectedAddressId === addr.id;
                        return (
                          <li key={addr.id}>
                            <button
                              type="button"
                              onClick={() => applySavedAddress(addr.id)}
                              className={cn(
                                'flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors',
                                selected
                                  ? 'border-accent bg-accent-soft'
                                  : 'border-hairline hover:border-ink-subtle',
                              )}
                            >
                              <span
                                className={cn(
                                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                                  selected
                                    ? 'bg-accent text-accent-foreground'
                                    : 'bg-surface-sunken text-ink-muted',
                                )}
                              >
                                <MapPin className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block font-mono text-[15px] font-semibold tracking-wide text-foreground">
                                  {addr.digitalAddress}
                                </span>
                                <span className="mt-1 block text-caption text-ink-muted">
                                  {addr.region} · {addr.district}
                                  {addr.notes ? ` — ${addr.notes}` : ''}
                                </span>
                              </span>
                              <span
                                aria-hidden="true"
                                className={cn(
                                  'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                                  selected ? 'border-accent' : 'border-ink-subtle/40',
                                )}
                              >
                                {selected && (
                                  <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                                )}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <button
                      type="button"
                      onClick={startNewAddress}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                        selectedAddressId == null
                          ? 'bg-foreground text-background'
                          : 'text-accent-ink hover:bg-surface-sunken',
                      )}
                    >
                      <Plus className="h-4 w-4" />
                      Use a new address
                    </button>
                  </fieldset>
                )}

                {(selectedAddressId == null || !savedAddresses?.length) && (
                  <>
                    <div className="space-y-2.5">
                      <Label htmlFor="region" className="text-[15px] font-medium">
                        Region
                      </Label>
                      <Select
                        value={region}
                        onValueChange={(value) => {
                          setSelectedAddressId(null);
                          setRegion(value);
                          setDistrict('');
                          const suggested = zoneFromRegion(value);
                          if (suggested) setDeliveryZone(suggested);
                        }}
                        required
                      >
                        <SelectTrigger
                          id="region"
                          className="h-[3.25rem] rounded-2xl border-hairline px-5 text-base shadow-none"
                        >
                          <SelectValue placeholder="Select a region" />
                        </SelectTrigger>
                        <SelectContent>
                          {GHANA_REGIONS.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2.5">
                      <Label htmlFor="district" className="text-[15px] font-medium">
                        District
                      </Label>
                      <DistrictCombobox
                        id="district"
                        region={region}
                        value={district}
                        onChange={(value) => {
                          setSelectedAddressId(null);
                          setDistrict(value);
                        }}
                      />
                    </div>

                    <div className="space-y-2.5">
                      <Label htmlFor="digitalAddress" className="text-[15px] font-medium">
                        GhanaPost GPS address
                      </Label>
                      <Input
                        id="digitalAddress"
                        placeholder="e.g. GA-183-1234"
                        value={digitalAddress}
                        onChange={(e) => {
                          setSelectedAddressId(null);
                          setDigitalAddress(e.target.value);
                        }}
                        className="h-[3.25rem] rounded-2xl border-hairline px-5 text-base"
                        required
                      />
                    </div>

                    <div className="space-y-2.5">
                      <Label htmlFor="notes" className="text-[15px] font-medium">
                        Delivery notes <span className="text-ink-subtle">(optional)</span>
                      </Label>
                      <Textarea
                        id="notes"
                        placeholder="e.g. Blue gate opposite the pharmacy — please call on arrival"
                        value={notes}
                        onChange={(e) => {
                          setSelectedAddressId(null);
                          setNotes(e.target.value);
                        }}
                        className="min-h-28 resize-none rounded-2xl border-hairline px-5 py-4 text-base"
                      />
                    </div>

                    {!!user && (
                      <label className="flex items-center gap-2.5 text-sm text-ink-muted">
                        <input
                          type="checkbox"
                          checked={saveNewAddress}
                          onChange={(e) => setSaveNewAddress(e.target.checked)}
                          className="h-4 w-4 rounded border-hairline"
                        />
                        Save this address for next time
                      </label>
                    )}
                  </>
                )}

                {selectedAddressId != null && !!savedAddresses?.length && (
                  <div className="rounded-2xl border border-hairline bg-surface-sunken px-5 py-4 text-sm text-ink-muted">
                    Delivering to{' '}
                    <span className="font-mono font-semibold text-foreground">
                      {digitalAddress}
                    </span>
                    {' · '}
                    {region}, {district}
                    {notes ? (
                      <span className="mt-1 block text-caption">{notes}</span>
                    ) : null}
                  </div>
                )}

                <div className="space-y-2.5">
                  <Label htmlFor="deliveryZone" className="text-[15px] font-medium">
                    Delivery area
                  </Label>
                  <Select
                    value={deliveryZone}
                    onValueChange={(value) => setDeliveryZone(value as DeliveryZone)}
                    required
                  >
                    <SelectTrigger
                      id="deliveryZone"
                      className="h-[3.25rem] rounded-2xl border-hairline px-5 text-base shadow-none"
                    >
                      <SelectValue placeholder="Accra or Outside Accra" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={OrderInputDeliveryZone.accra}>
                        Accra
                        {typeof accraDeliveryFee === 'number'
                          ? ` · ${formatCurrency(accraDeliveryFee)}`
                          : ''}
                      </SelectItem>
                      <SelectItem value={OrderInputDeliveryZone.outside_accra}>
                        Outside Accra
                        {typeof outsideAccraDeliveryFee === 'number'
                          ? ` · ${formatCurrency(outsideAccraDeliveryFee)}`
                          : ''}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {!deliveryFeesConfigured && (
                    <p className="text-sm text-destructive">
                      Delivery fees not configured — checkout is temporarily unavailable.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={createAddress.isPending || !deliveryFeesConfigured}
                  className="inline-flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-full bg-accent text-base font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
                >
                  {createAddress.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Continue to payment
                </button>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <h1 className="text-headline text-foreground">How would you like to pay?</h1>
              <p className="mt-3 text-lede text-ink-muted">
                Pay via Mobile Money before we prepare your order.
              </p>

              <form onSubmit={submitPayment} className="mt-10">
                <fieldset className="space-y-3.5">
                  <legend className="sr-only">Payment method</legend>

                  <PaymentOption
                    id="momo_manual"
                    checked
                    onSelect={() => undefined}
                    Icon={Smartphone}
                    title="Pay via Mobile Money"
                    copy="Send MoMo to our merchant number, then paste your transaction ID"
                  />
                </fieldset>

                <p className="mt-6 flex items-center gap-2 text-caption text-ink-muted">
                  <ShieldCheck className="h-4 w-4 text-accent-ink" />
                  Payments are verified before we dispatch your order.
                </p>

                <TurnstileField
                  className="mt-6"
                  onToken={setOrderTurnstileToken}
                />

                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex h-[3.25rem] items-center justify-center gap-1.5 rounded-full border border-hairline px-7 text-base font-semibold text-foreground transition-colors hover:bg-surface-sunken"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      !deliveryFeesConfigured ||
                      !deliveryZone ||
                      (turnstileRequired && !orderTurnstileToken)
                    }
                    className="inline-flex h-[3.25rem] flex-1 items-center justify-center gap-2 rounded-full bg-accent text-base font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Continue to MoMo
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 3 && createdOrder && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <h1 className="text-headline text-foreground">Complete Mobile Money payment</h1>
              <p className="mt-3 text-lede text-ink-muted">
                Send the exact amount below, then enter your transaction reference.
              </p>

              <div className="mt-8 space-y-4 rounded-3xl border border-hairline bg-surface-sunken p-6 md:p-8">
                <div>
                  <p className="text-caption font-medium uppercase tracking-[0.12em] text-ink-subtle">
                    Merchant MoMo number
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-foreground">
                    {momoMerchantNumber}
                  </p>
                </div>
                <div>
                  <p className="text-caption font-medium uppercase tracking-[0.12em] text-ink-subtle">
                    Amount to send
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.02em] tabular-nums text-foreground">
                    {formatCurrency(orderTotal)}
                  </p>
                </div>
                <p className="text-[15px] leading-relaxed text-ink-muted">
                  Send{' '}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(orderTotal)}
                  </span>{' '}
                  to{' '}
                  <span className="font-semibold text-foreground">{momoMerchantNumber}</span>{' '}
                  via <span className="font-semibold text-foreground">*170#</span> or your MoMo
                  app, then enter the transaction reference below.
                </p>
                <p className="text-caption text-ink-subtle">
                  Order #{createdOrder.id} — keep this number for your records.
                </p>
              </div>

              <form onSubmit={submitMomoReference} className="mt-8 space-y-6">
                <div className="space-y-2.5">
                  <Label htmlFor="momoReference" className="text-[15px] font-medium">
                    MoMo transaction / reference ID
                  </Label>
                  <Input
                    id="momoReference"
                    value={momoReference}
                    onChange={(e) => setMomoReference(e.target.value)}
                    placeholder="e.g. 12345678901"
                    className="h-[3.25rem] rounded-2xl border-hairline px-5 font-mono text-base"
                    autoComplete="off"
                    spellCheck={false}
                    required
                  />
                </div>

                <TurnstileField onToken={setMomoTurnstileToken} />

                <button
                  type="submit"
                  disabled={
                    submitMomo.isPending ||
                    (turnstileRequired && !momoTurnstileToken)
                  }
                  className="inline-flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-full bg-accent text-base font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
                >
                  {submitMomo.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit for verification
                </button>
              </form>
            </div>
          )}

          {step === 4 && createdOrder && (
            <div className="flex flex-col items-center py-10 text-center animate-in fade-in zoom-in-95 duration-500">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
                {createdOrder.paymentMethod === 'momo_manual' ? (
                  <Clock className="h-9 w-9" strokeWidth={2.2} />
                ) : (
                  <Check className="h-9 w-9" strokeWidth={2.2} />
                )}
              </span>
              <h1 className="mt-8 text-headline text-foreground">
                {createdOrder.paymentMethod === 'momo_manual'
                  ? 'Payment received — verifying'
                  : 'Order confirmed'}
              </h1>
              <p className="mt-4 max-w-md text-lede text-ink-muted text-pretty">
                {createdOrder.paymentMethod === 'momo_manual' ? (
                  <>
                    Thank you. Order{' '}
                    <span className="font-semibold text-foreground">#{createdOrder.id}</span> is
                    awaiting payment verification. You’ll get a notification once it’s confirmed —
                    we won’t mark it as paid until then.
                  </>
                ) : (
                  <>
                    Thank you. Order{' '}
                    <span className="font-semibold text-foreground">#{createdOrder.id}</span> is
                    being prepared and you'll get an SMS when it ships.
                  </>
                )}
              </p>
              {createdOrder.momoReference && (
                <p className="mt-3 text-caption text-ink-subtle">
                  Reference submitted: {createdOrder.momoReference}
                </p>
              )}

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button variant="accent" size="pill-lg" asChild>
                  <Link href={`/orders/${createdOrder.id}`}>View your order</Link>
                </Button>
                <Button variant="hairline" size="pill-lg" asChild>
                  <Link href="/shop">Keep shopping</Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        {step < 4 && (
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <div className="rounded-3xl bg-surface-sunken p-7 md:p-8">
              <h2 className="text-title text-foreground">Order summary</h2>

              <ul className="mt-7 max-h-[22rem] space-y-5 overflow-y-auto pr-1">
                {cart.items.map((item) => (
                  <li key={item.id} className="flex gap-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-background p-1">
                      {item.productImage && (
                        <img
                          src={item.productImage}
                          alt=""
                          className="h-full w-full object-contain object-center"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[14px] font-medium text-foreground">
                        {item.productName}
                      </p>
                      <p className="mt-0.5 text-caption text-ink-muted">
                        {item.variantName} · Qty {item.quantity}
                      </p>
                    </div>
                    <p className="whitespace-nowrap text-[14px] font-semibold tabular-nums text-foreground">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </p>
                  </li>
                ))}
              </ul>

              <dl className="mt-6 space-y-3 border-t border-hairline pt-6 text-[15px]">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-muted">Subtotal</dt>
                  <dd className="tabular-nums text-foreground">{formatCurrency(subtotal)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-muted">
                    Delivery
                    {deliveryZone ? (
                      <span className="block text-caption text-ink-subtle">
                        {deliveryZoneLabel(deliveryZone)}
                      </span>
                    ) : null}
                  </dt>
                  <dd className="tabular-nums text-foreground">
                    {typeof displayDeliveryFee === 'number'
                      ? formatCurrency(displayDeliveryFee)
                      : 'Select area'}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t border-hairline pt-4">
                  <dt className="text-[17px] font-medium text-foreground">Total</dt>
                  <dd className="text-[1.75rem] font-semibold tracking-[-0.03em] tabular-nums text-foreground">
                    {formatCurrency(orderTotal)}
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function PaymentOption({
  id,
  checked,
  onSelect,
  Icon,
  title,
  copy,
}: {
  id: string;
  checked: boolean;
  onSelect: () => void;
  Icon: React.ElementType;
  title: string;
  copy: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-center gap-4 rounded-3xl border p-6 transition-all',
        checked
          ? 'border-accent bg-accent-soft'
          : 'border-hairline hover:border-ink-subtle',
      )}
    >
      <input
        type="radio"
        id={id}
        name="paymentMethod"
        value={id}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />

      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors',
          checked ? 'bg-accent text-accent-foreground' : 'bg-surface-sunken text-foreground',
        )}
      >
        <Icon className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-medium text-foreground">{title}</span>
        <span className="mt-1 block text-caption text-ink-muted">{copy}</span>
      </span>

      <span
        aria-hidden="true"
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          checked ? 'border-accent' : 'border-ink-subtle/40',
        )}
      >
        {checked && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
      </span>
    </label>
  );
}
