export async function requestTrackBlob(
  body: Record<string, string>,
  retriesLeft = 2,
): Promise<Blob> {
  const res = await fetch("/api/music", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429 && retriesLeft > 0) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return requestTrackBlob(body, retriesLeft - 1);
  }
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: "Something went wrong" }));
    throw new Error(errorBody.error ?? "Something went wrong");
  }
  return res.blob();
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
