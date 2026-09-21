export function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

export function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}
