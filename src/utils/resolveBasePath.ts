function resolveBasePath(url: string): string {
  return `${import.meta.env.BASE_URL}/${url}`;
}

export { resolveBasePath };
