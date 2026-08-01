import { useMutation, type UseMutationOptions, type UseMutationResult } from "@tanstack/react-query";
import { customFetch, type ErrorType, type BodyType } from "./custom-fetch";
import type { AdminOrderDetail, Order } from "./generated/api.schemas";

export interface MomoReferenceInput {
  momoReference: string;
  turnstileToken?: string;
}

export interface MomoReferenceResponse {
  order: Order;
  duplicateReference: boolean;
}

export interface VerifyMomoPaymentResponse {
  order: AdminOrderDetail;
  duplicateReference: boolean;
  warning?: string | null;
}

export const submitMomoReference = async (
  id: number,
  momoReferenceInput: MomoReferenceInput,
  options?: RequestInit,
): Promise<MomoReferenceResponse> => {
  return customFetch<MomoReferenceResponse>(`/api/orders/${id}/momo-reference`, {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(momoReferenceInput),
  });
};

export const useSubmitMomoReference = <TError = ErrorType<unknown>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof submitMomoReference>>,
    TError,
    { id: number; data: BodyType<MomoReferenceInput> },
    TContext
  >;
}): UseMutationResult<
  Awaited<ReturnType<typeof submitMomoReference>>,
  TError,
  { id: number; data: BodyType<MomoReferenceInput> },
  TContext
> => {
  return useMutation({
    mutationKey: ["submitMomoReference"],
    mutationFn: ({ id, data }) => submitMomoReference(id, data),
    ...options?.mutation,
  });
};

export const verifyAdminOrderPayment = async (
  id: number,
  options?: RequestInit,
): Promise<VerifyMomoPaymentResponse> => {
  return customFetch<VerifyMomoPaymentResponse>(
    `/api/admin/orders/${id}/verify-payment`,
    {
      ...options,
      method: "POST",
    },
  );
};

export const useVerifyAdminOrderPayment = <
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof verifyAdminOrderPayment>>,
    TError,
    { id: number },
    TContext
  >;
}): UseMutationResult<
  Awaited<ReturnType<typeof verifyAdminOrderPayment>>,
  TError,
  { id: number },
  TContext
> => {
  return useMutation({
    mutationKey: ["verifyAdminOrderPayment"],
    mutationFn: ({ id }) => verifyAdminOrderPayment(id),
    ...options?.mutation,
  });
};
