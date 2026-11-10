const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type ApiOptions = RequestInit & {
  params?: Record<string, string>;
};

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { params, ...requestOptions } = options;

  const url = new URL(`/api${path}`, API_URL);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    ...requestOptions,
    headers: {
      "Content-Type": "application/json",
      ...requestOptions.headers,
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error || `API request failed with status ${response.status}`
    );
  }

  return data as T;
}