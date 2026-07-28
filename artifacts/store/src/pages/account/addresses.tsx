import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  useListAddresses,
  useCreateAddress,
  useDeleteAddress,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MapPin, Plus, Trash2, Link as LinkIcon } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

export function Addresses() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: addresses, isLoading } = useListAddresses({
    query: { enabled: !!user },
  });

  const createAddress = useCreateAddress();
  const deleteAddress = useDeleteAddress();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    digitalAddress: '',
    notes: '',
    lat: '',
    lng: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAddress.mutate(
      {
        data: {
          digitalAddress: form.digitalAddress,
          notes: form.notes || undefined,
          lat: form.lat ? parseFloat(form.lat) : undefined,
          lng: form.lng ? parseFloat(form.lng) : undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['listAddresses'] });
          setOpen(false);
          setForm({ digitalAddress: '', notes: '', lat: '', lng: '' });
          toast({ title: 'Address saved' });
        },
        onError: () => {
          toast({ title: 'Failed to save address', variant: 'destructive' });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteAddress.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['listAddresses'] });
          toast({ title: 'Address removed' });
        },
      }
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Skeleton className="h-10 w-52 mb-8" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-3xl text-center">
        <h1 className="text-2xl font-bold mb-4">Sign in to manage addresses</h1>
        <Link href="/auth/login">
          <Button size="lg" className="rounded-full">Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Saved Addresses</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full gap-2">
              <Plus className="w-4 h-4" /> Add Address
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Add New Address</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 mt-2">
              <div className="space-y-2">
                <Label htmlFor="digitalAddress">GhanaPost GPS Code *</Label>
                <Input
                  id="digitalAddress"
                  placeholder="e.g. GA-123-4567"
                  value={form.digitalAddress}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, digitalAddress: e.target.value }))
                  }
                  required
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Delivery Notes</Label>
                <Input
                  id="notes"
                  placeholder="e.g. Blue gate, opposite Shoprite"
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lat">Latitude (optional)</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="any"
                    placeholder="5.6037"
                    value={form.lat}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lat: e.target.value }))
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lng">Longitude (optional)</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="any"
                    placeholder="-0.1870"
                    value={form.lng}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lng: e.target.value }))
                    }
                    className="rounded-xl"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full rounded-full"
                disabled={createAddress.isPending}
              >
                {createAddress.isPending ? 'Saving…' : 'Save Address'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!addresses || addresses.length === 0 ? (
        <div className="text-center py-20 bg-secondary/30 rounded-3xl border border-dashed">
          <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="font-semibold text-lg mb-2">No addresses saved</p>
          <p className="text-sm text-muted-foreground">
            Add a GhanaPost GPS address to speed up checkout.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((addr) => (
            <Card
              key={addr.id}
              className="rounded-2xl border-none shadow-sm bg-card"
            >
              <CardContent className="p-6 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold font-mono tracking-wide">
                      {addr.digitalAddress}
                    </p>
                    {addr.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {addr.notes}
                      </p>
                    )}
                    {addr.lat && addr.lng && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {addr.lat.toFixed(4)}, {addr.lng.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => handleDelete(addr.id)}
                  disabled={deleteAddress.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
