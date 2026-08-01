import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListAddresses,
  useCreateAddress,
  useDeleteAddress,
} from '@workspace/api-client-react';
import { useAuth } from '@/lib/auth-context';
import { GHANA_REGIONS } from '@/lib/ghana-regions';
import { useToast } from '@/hooks/use-toast';
import { AccountShell } from '@/components/layout/account-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DistrictCombobox } from '@/components/commerce/district-combobox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MapPin, Plus, Trash2 } from 'lucide-react';

const EMPTY_FORM = { digitalAddress: '', region: '', district: '', notes: '' };

export function Addresses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: addresses, isLoading } = useListAddresses({
    query: { enabled: !!user, queryKey: ['listAddresses'] },
  });

  const createAddress = useCreateAddress();
  const deleteAddress = useDeleteAddress();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['listAddresses'] });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.region || !form.district) {
      toast({
        title: 'Region and district required',
        description: 'Choose both a region and a district.',
        variant: 'destructive',
      });
      return;
    }

    createAddress.mutate(
      {
        data: {
          digitalAddress: form.digitalAddress,
          region: form.region,
          district: form.district,
          notes: form.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          refresh();
          setOpen(false);
          setForm(EMPTY_FORM);
          toast({ title: 'Address saved' });
        },
        onError: () => toast({ title: 'Could not save address', variant: 'destructive' }),
      },
    );
  };

  const remove = (id: number) => {
    deleteAddress.mutate(
      { id },
      {
        onSuccess: () => {
          refresh();
          toast({ title: 'Address removed' });
        },
      },
    );
  };

  return (
    <AccountShell
      title="Addresses"
      description="Save your delivery spots for a faster checkout"
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-accent px-6 text-[15px] font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              <Plus className="h-4 w-4" />
              Add address
            </button>
          </DialogTrigger>

          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-title">Add a delivery address</DialogTitle>
            </DialogHeader>

            <form onSubmit={submit} className="mt-4 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="region" className="text-[14px] font-medium">
                  Region
                </Label>
                <Select
                  value={form.region}
                  onValueChange={(region) =>
                    setForm((f) => ({ ...f, region, district: '' }))
                  }
                  required
                >
                  <SelectTrigger
                    id="region"
                    className="h-12 rounded-2xl border-hairline px-4 text-base shadow-none"
                  >
                    <SelectValue placeholder="Select a region" />
                  </SelectTrigger>
                  <SelectContent>
                    {GHANA_REGIONS.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="district" className="text-[14px] font-medium">
                  District
                </Label>
                <DistrictCombobox
                  id="district"
                  region={form.region}
                  value={form.district}
                  onChange={(district) => setForm((f) => ({ ...f, district }))}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="digitalAddress" className="text-[14px] font-medium">
                  GhanaPost GPS code
                </Label>
                <Input
                  id="digitalAddress"
                  placeholder="e.g. GA-123-4567"
                  value={form.digitalAddress}
                  onChange={(e) => setForm((f) => ({ ...f, digitalAddress: e.target.value }))}
                  required
                  className="h-12 rounded-2xl border-hairline px-4 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-[14px] font-medium">
                  Delivery notes <span className="text-ink-subtle">(optional)</span>
                </Label>
                <Input
                  id="notes"
                  placeholder="e.g. Blue gate opposite Shoprite"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="h-12 rounded-2xl border-hairline px-4 text-base"
                />
              </div>

              <button
                type="submit"
                disabled={createAddress.isPending}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-accent text-[15px] font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {createAddress.isPending ? 'Saving…' : 'Save address'}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-3xl" />
          ))}
        </div>
      ) : !addresses || addresses.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-surface-sunken px-6 py-24 text-center">
          <MapPin className="h-10 w-10 text-ink-subtle" strokeWidth={1.4} />
          <h2 className="mt-6 text-title text-foreground">No addresses saved</h2>
          <p className="mt-3 max-w-sm text-[15px] text-ink-muted text-pretty">
            Add a region and district once and skip typing it at every checkout.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => (
            <li
              key={addr.id}
              className="flex items-start gap-4 rounded-3xl border border-hairline p-6"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-accent-ink">
                <MapPin className="h-[18px] w-[18px]" strokeWidth={1.7} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-foreground">{addr.district}</p>
                <p className="mt-1 text-[14px] text-ink-muted">{addr.region} Region</p>
                <p className="mt-1.5 font-mono text-[13px] tracking-wide text-ink-subtle">
                  {addr.digitalAddress}
                </p>
                {addr.notes && (
                  <p className="mt-1.5 text-[14px] text-ink-muted text-pretty">{addr.notes}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => remove(addr.id)}
                disabled={deleteAddress.isPending}
                aria-label={`Remove address ${addr.district}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
