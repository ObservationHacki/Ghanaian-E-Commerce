export const STATUS_LABELS: Record<string, string> = {
  order_received: 'Order received',
  payment_confirmed: 'Payment confirmed',
  payment_on_delivery: 'Pay on delivery',
  processing: 'Processing',
  ready_for_dispatch: 'Ready for dispatch',
  out_for_delivery: 'Out for delivery',
  // Legacy aliases used in older UI copy
  dispatch: 'Ready for dispatch',
  delivering: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/** Only three tones, so status never turns the UI into a rainbow. */
export const STATUS_TONE: Record<string, string> = {
  order_received: 'bg-surface-sunken text-ink-muted',
  payment_confirmed: 'bg-accent-soft text-accent-ink',
  payment_on_delivery: 'bg-surface-sunken text-ink-muted',
  processing: 'bg-surface-sunken text-ink-muted',
  ready_for_dispatch: 'bg-surface-sunken text-ink-muted',
  out_for_delivery: 'bg-accent-soft text-accent-ink',
  dispatch: 'bg-surface-sunken text-ink-muted',
  delivering: 'bg-accent-soft text-accent-ink',
  delivered: 'bg-accent text-accent-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
};

/** Happy-path timeline shown on the order detail page. */
export const STATUS_FLOW = [
  'order_received',
  'payment_confirmed',
  'processing',
  'ready_for_dispatch',
  'out_for_delivery',
  'delivered',
];

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

export function statusTone(status: string) {
  return STATUS_TONE[status] ?? 'bg-surface-sunken text-ink-muted';
}
