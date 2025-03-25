/**
 * ########################################################################
 * ########################### CLIENT SIDE ACTION #########################
 * ########################################################################
 * 1. You can use this hook to execute any server action and handle its state in a client component.
 * 2. Use abortAction method exposed by the hook to abort the action and retries.
 * 3. Handles RBAC(role-based access control) out of the box.
 * 4. Handles the toast messages, to show the toast message, if the action is in progress, or if
 * it succeeded, or if it failed for live visual feedback to the user.
 * 5. Handles the retry logic, if the action fails, it will retry the action automatically, out of the box.
 *
 * @param serverAction - The action created by createSafeAction function.
 * @param serverAction.data - Input arguements to the server action.
 * @param options - The options for the client action.
 * @param options.onStart - The function to be called, when the server action starts.
 * @param options.onSuccess - The function to be called, when the server action succeeds.
 * @param options.onError - The function to be called, when the server action fails.
 * @param options.onComplete - The function to be called, when the server action completes.
 * @param options.toastMessages - The messages to display in the toast, when server action is in pending, success states.
 * For error state the actual error information will be displayed in the toast.
 * @returns safeAction - The function to execute the server action.
 * @returns abortAction - The function to abort the server action.
 * @returns error - The error that occurred during the complete server action life cycle.
 * @returns data - The data returned by the server action.
 * @returns isPending - The state of the server action.
 * @returns fieldErrors - The field errors that occurred during zod validation.
 */

import toast from "react-hot-toast";
import { useState, useCallback, useRef } from "react";
import type { ActionState, FieldErrors } from "../types";
import { withRetry } from "./with-retry";

export type SafeActionType<TInput, TOutput> = (
  data?: TInput
) => Promise<ActionState<TInput, TOutput>>;

export type UseActionOptions<TOutput> = {
  retries?: number;
  onStart?: () => void;
  onSuccess?: (data?: TOutput) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
  toastMessages?: { loading: string; success: string };
};

export const useSafeAction = <TInput, TOutput>(
  serverAction: SafeActionType<TInput, TOutput>,
  options: UseActionOptions<TOutput> = {}
) => {
  const [fieldErrors, setFieldErrors] = useState<
    FieldErrors<TInput> | undefined
  >(undefined);
  const toastId = useRef<string | null>(null);
  const abortController = useRef(new AbortController());
  const [isPending, setIsPending] = useState<boolean>(false);
  const [data, setData] = useState<TOutput | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  const safeAction = useCallback(
    async (input?: TInput) => {
      options.onStart?.();
      setIsPending(true);
      toastId.current = toast.loading(
        options?.toastMessages?.loading || "Processing request...",
        { duration: Infinity }
      );

      try {
        const result = await withRetry(
          async () => await serverAction(input),
          options.retries,
          abortController.current.signal
        );

        setFieldErrors(result?.fieldErrors);
        if (result?.error) {
          setError(result?.error);
          toast.error(result.error, { id: toastId.current!, duration: 5000 });
          options.onError?.(result.error);
        } else if (result?.data) {
          setData(result?.data);
          options.onSuccess?.(result?.data);
          toast.success(
            options?.toastMessages?.success || "Request successful",
            { id: toastId.current!, duration: 5000 }
          );
        } else {
          options.onSuccess?.();
          toast.success(
            options?.toastMessages?.success || "Request successful",
            { id: toastId.current!, duration: 5000 }
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";
        setError(errorMessage);
        toast.error(errorMessage, { id: toastId.current!, duration: 5000 });
        options.onError?.(errorMessage);
      } finally {
        setIsPending(false);
        options.onComplete?.();
      }
    },
    [serverAction, options]
  );

  const abortAction = () => abortController.current.abort();

  return {
    safeAction,
    abortAction,
    error,
    data,
    isPending,
    fieldErrors,
    setFieldErrors,
  };
};
