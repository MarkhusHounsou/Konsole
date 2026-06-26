export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export async function readResponseTextLimited(
  response: Response,
  maxChars: number
): Promise<string> {
  if (!response.body) {
    return (await response.text()).slice(0, maxChars);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = "";

  try {
    while (result.length < maxChars) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  return result.slice(0, maxChars);
}
