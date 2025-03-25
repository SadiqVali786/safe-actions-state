/**
 * ########################################################################
 * ########################## SERVER SIDE ACTION ##########################
 * ########################################################################
 * This file contains the createSafeAction function, that is used to
 * 1. Create safe actions
 * 2. It handles authentication checks,
 * 3. RBAC(role-based access control) checks,
 * 4. Validates input data against a Zod schema
 * 5. Executes the handler function which usually contains just DB interaction code written by you.
 * 6. In this process it handles all the validation errors or any error raised appropriately.
 *
 * @param handler - The handler function usually just contains DB interaction logic written by you.
 * @param handler.validatedData - The validated data from the zod schema.
 * @param handler.signal - The signal to abort the server action.
 * @param schema - The Zod schema to validate the input arguments to the server action.
 * @param allowedRoles - The allowed roles of the user to access the specific server action.
 * @param retries - The number of retries to attempt if the server action fails. Default is 3.
 * @returns It return the safe action function that validates and handles RBAC(role-based access control)
 * checks and retries server actions upon failure automatically out of the box.
 */

export type SessionObject = { authenticated: boolean; role?: string };

import type { z } from "zod";
import { cookies } from "next/headers";
import { generateErrorMessage } from "zod-error";
import type { ActionState, FieldErrors } from "../types";
import { withRetry } from "./with-retry";

export const createSafeAction = <TInput, TOutput>(
  handler: (
    validatedData?: TInput
  ) => Promise<ActionState<TInput, TOutput> | void>,
  schema?: z.Schema<TInput>,
  allowedRoles?: string[],
  retries: number = 3
) => {
  return async (
    data?: TInput,
    options?: { signal?: AbortSignal }
  ): Promise<ActionState<TInput, TOutput> | void> => {
    // ########################################################
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/safe-actions-state`,
      { headers: { Cookie: (await cookies()).toString() } }
    );

    const session = (await response.json()) as SessionObject;
    if (!session.authenticated) return { error: "Un-authenticated" };
    if (!session.role) return { error: "No role found in session" };
    if (
      allowedRoles &&
      allowedRoles.length > 0 &&
      !allowedRoles?.includes(session.role)
    )
      return { error: "Un-authorized" };
    // ########################################################

    if (!schema && !!data)
      return { error: "Schema is required when data is provided" };
    if (!!schema && !data)
      return { error: "Data is required when schema is provided" };
    if (!schema && !data)
      return await withRetry(
        () => handler(undefined),
        retries,
        options?.signal
      );

    // if (!!schema && !!data) {} // continue
    const validationResult = schema!.safeParse(data);
    if (!validationResult.success) {
      return {
        fieldErrors: validationResult.error.flatten()
          .fieldErrors as FieldErrors<TInput>,
        error: generateErrorMessage(validationResult.error.issues, {
          maxErrors: 1,
          delimiter: { component: ": " },
          message: { enabled: true, label: "" },
          // path: { enabled: false }, TODO:
          code: { enabled: false },
        }),
      };
    }

    return await withRetry(
      async () => await handler(validationResult.data),
      retries,
      options?.signal
    );
  };
};
