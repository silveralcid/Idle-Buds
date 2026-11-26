/** Destructive test tools accept only this explicit, local, disposable database. */
export function assertTestDatabase(databaseUrl: string): URL {
  let url: URL
  try { url = new URL(databaseUrl) }
  catch { throw new Error('Tests/reset require a PostgreSQL URL for loopback idle_buds_test') }
  // pg supports connection options in the query string, including host/database
  // overrides. Reject them rather than validating a host different from pg's.
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
    || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    || url.pathname !== '/idle_buds_test' || url.search || url.hash) {
    throw new Error('Tests/reset require a loopback PostgreSQL URL named exactly idle_buds_test with no query or fragment')
  }
  return url
}
