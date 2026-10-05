/**
 * This type represents a loading, error, or ready result.
 * Ready results include the loaded data.
 */
export type LoadState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly data: T };
