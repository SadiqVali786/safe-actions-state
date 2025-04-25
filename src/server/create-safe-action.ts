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
 * @param schema - The Zod schema to validate the input arguments to the server action.
 * @param allowedRoles - The allowed roles of the user to access the specific server action.
 * @param isPrivate - Whether the server action is private or not.
 * @returns It returns safe action function that validates and handles authentication checks & RBAC
 * (role-based access control) checks automatically out of the box.
 */

export type SessionObject = { authenticated: boolean; role?: string };

import type { z } from "zod";
import { cookies } from "next/headers";
import { generateErrorMessage } from "zod-error";
import type { ActionState, FieldErrors } from "../types";

type PublicAction = { isPrivate: false };
type PrivateAction = { isPrivate: true };
type RoleBasedAction = { isPrivate: true; allowedRoles: string[] };
type ActionType = PublicAction | PrivateAction | RoleBasedAction;

type ActionWithInputs<TInput, TOutput> = {
  withInputs: true;
  handler: (validatedData: TInput) => Promise<ActionState<TInput, TOutput>>;
  schema: z.Schema<TInput>;
};
type ActionWithoutInputs<TOutput> = {
  withInputs: false;
  handler: () => Promise<ActionState<undefined, TOutput>>;
};
type Action<TInput, TOutput> =
  | ActionWithInputs<TInput, TOutput>
  | ActionWithoutInputs<TOutput>;

type SafeActionProps<TInput, TOutput> = {
  action: Action<TInput, TOutput>;
  actionType: ActionType;
};

export const createSafeAction = <TInput, TOutput>({
  action,
  actionType,
}: SafeActionProps<TInput, TOutput>) => {
  return async (data: TInput): Promise<ActionState<TInput, TOutput>> => {
    if (actionType.isPrivate) {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/${process.env.SAFE_ACTIONS_STATE_ROUTE}`,
        { headers: { Cookie: (await cookies()).toString() } }
      );

      const session = (await response.json()) as SessionObject;
      if (!session.authenticated) return { error: "Un-authenticated" };

      if (
        "allowedRoles" in actionType &&
        actionType.allowedRoles &&
        actionType.allowedRoles.length > 0
      ) {
        if (!session.role) return { error: "No role found in session" };
        if (!actionType.allowedRoles.includes(session.role))
          return { error: "Un-authorized" };
      }
    }

    if (!action.withInputs) return await action.handler();

    const validationResult = action.schema!.safeParse(data);
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

    return await action.handler(validationResult.data);
  };
};

// export type SessionObject = { authenticated: boolean; role?: string };

// import type { z } from "zod";
// import { cookies } from "next/headers";
// import { generateErrorMessage } from "zod-error";
// import type { ActionState, FieldErrors } from "../types";

// export const createSafeAction = <TInput, TOutput>(
//   handler: (validatedData: TInput) => Promise<ActionState<TInput, TOutput>>,
//   schema: TInput extends undefined ? undefined : z.Schema<TInput>,
//   isPrivate: boolean = true,
//   allowedRoles?: string[]
// ) => {
//   return async (data: TInput): Promise<ActionState<TInput, TOutput>> => {
//     if (isPrivate) {
//       const response = await fetch(
//         `${process.env.NEXT_PUBLIC_BASE_URL}/api/${process.env.SAFE_ACTIONS_STATE_ROUTE}`,
//         { headers: { Cookie: (await cookies()).toString() } }
//       );

//       const session = (await response.json()) as SessionObject;
//       if (!session.authenticated) {
//         return { error: "Un-authenticated" };
//       }
//       if (allowedRoles && allowedRoles.length > 0) {
//         if (!session.role) {
//           return { error: "No role found in session" };
//         }
//         if (!allowedRoles?.includes(session.role)) {
//           return { error: "Un-authorized" };
//         }
//       }
//     }

//     if (!schema && !data) return await handler(undefined as TInput);

//     const validationResult = schema!.safeParse(data);
//     if (!validationResult.success) {
//       return {
//         fieldErrors: validationResult.error.flatten()
//           .fieldErrors as FieldErrors<TInput>,
//         error: generateErrorMessage(validationResult.error.issues, {
//           maxErrors: 1,
//           delimiter: { component: ": " },
//           message: { enabled: true, label: "" },
//           // path: { enabled: false }, TODO:
//           code: { enabled: false },
//         }),
//       };
//     }

//     return await handler(validationResult.data);
//   };
// };
