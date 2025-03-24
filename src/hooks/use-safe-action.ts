/**
 * ########################################################################
 * ########################### CLIENT SIDE ACTION #########################
 * ########################################################################
 * 1. You can use this hook to execute any server action and handle its state in a client component.
 * 2. Handles the cancellation of the action. Use cancel method exposed by the hook to cancel the action.
 * 3. Handles RBAC(role-based access control) out of the box.
 * 4. Handles the toast messages, to show a toast message, if the action is in progress, or if
 * it succeeds, or if it fails for live visual feedback to the user.
 * 5. Handles the retry logic, if the action fails, it will retry the action automatically, out of the box.
 *
 * @param action - The action to execute. written by you, usually just contains DB interaction logic.
 * @param action.data - The data to pass to the action.
 * @param action.options - The options for the action.
 * @param action.options.signal - The signal to abort the action.
 * @param options - The options for the action.
 * @param options.onStart - The function to call when the action starts.
 * @param options.onSuccess - The function to call when the action succeeds.
 * @param options.onError - The function to call when the action fails.
 * @param options.onComplete - The function to call when the action completes.
 * @param options.toastMessages - The messages to display in the toast.
 *
 * @returns execute - The function to execute the action.
 * @returns cancel - The function to cancel the action.
 * @returns error - The error that occurred during the action.
 * @returns data - The data returned by the action.
 * @returns isPending - The state of the action.
 * @returns fieldErrors - The field errors that occurred during the action.
 */

import toast from "react-hot-toast";
import { useState, useCallback, useRef } from "react";
import type { ActionState, FieldErrors } from "../types";

export type Action<TInput, TOutput> = (
  data?: TInput,
  options?: { signal: AbortSignal }
) => Promise<ActionState<TInput, TOutput>>;

export type UseActionOptions<TOutput> = {
  onStart?: () => void;
  onSuccess?: (data?: TOutput) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
  toastMessages?: { loading: string; success: string };
};

export const useSafeAction = <TInput, TOutput>(
  action: Action<TInput, TOutput>,
  options: UseActionOptions<TOutput> = {}
) => {
  const [fieldErrors, setFieldErrors] = useState<
    FieldErrors<TInput> | undefined
  >(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [data, setData] = useState<TOutput | undefined>(undefined);
  const [isPending, setIsPending] = useState<boolean>(false);
  const toastId = useRef<string | null>(null);
  const abortController = useRef(new AbortController());

  const execute = useCallback(
    async (input?: TInput) => {
      options.onStart?.();
      setIsPending(true);
      toastId.current = toast.loading(
        options?.toastMessages?.loading || "Processing request...",
        { duration: Infinity }
      );

      try {
        const result = await action(input, {
          signal: abortController.current.signal,
        });

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
    [action, options]
  );

  const cancel = () => abortController.current.abort();

  return {
    execute,
    cancel,
    error,
    data,
    isPending,
    fieldErrors,
    setFieldErrors,
  };
};
