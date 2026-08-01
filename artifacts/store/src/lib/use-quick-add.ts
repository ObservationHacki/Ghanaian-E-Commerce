import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getProduct, useAddCartItem } from '@workspace/api-client-react';
import { getCartSessionId } from '@/lib/cart';
import { useToast } from '@/hooks/use-toast';

/**
 * Product listings only expose `variantCount`, not variant ids, so adding from a
 * card has to resolve the product detail first and pick the first sellable
 * variant. Multi-variant products are sent to the PDP instead so the shopper
 * chooses deliberately.
 */
export function useQuickAdd() {
  const queryClient = useQueryClient();
  const addCartItem = useAddCartItem();
  const { toast } = useToast();
  const [pendingId, setPendingId] = useState<number | null>(null);

  const quickAdd = useCallback(
    async (productId: number, productName?: string) => {
      const sessionId = getCartSessionId();
      setPendingId(productId);
      try {
        const detail = await queryClient.fetchQuery({
          queryKey: ['product', productId],
          queryFn: () => getProduct(productId),
          staleTime: 5 * 60 * 1000,
        });

        const variant =
          detail.variants?.find((v) => v.stockCount > 0) ?? detail.variants?.[0];

        if (!variant) {
          toast({
            title: 'Out of stock',
            description: `${productName ?? detail.name} is unavailable right now.`,
            variant: 'destructive',
          });
          return;
        }

        await addCartItem.mutateAsync({
          sessionId,
          data: { productVariantId: variant.id, quantity: 1 },
        });
        await queryClient.invalidateQueries({ queryKey: ['cart', sessionId] });

        toast({
          title: 'Added to bag',
          description: `${detail.name} is in your bag.`,
        });
      } catch {
        toast({
          title: "Couldn't add to bag",
          description: 'Please try again in a moment.',
          variant: 'destructive',
        });
      } finally {
        setPendingId(null);
      }
    },
    [addCartItem, queryClient, toast],
  );

  return { quickAdd, pendingId };
}
