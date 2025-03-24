/**
 * This function is used to retry an async function.
 * @param fn - The function to retry.
 * @param retries - The number of retries.
 * @param signal - The signal to abort the function.
 * @returns The result of the function.
 */

export const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  signal?: AbortSignal
): Promise<T> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    if (signal?.aborted) throw new Error("Request aborted");
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries - 1) throw error;
      // reattempt after 1 second if the action fails
      else new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error("Max retries reached");
};
