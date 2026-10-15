/** Safe diagnostics: classify expected Postgres failures without printing error text,
 * URLs, hostnames, credentials, or other provider-specific fields. */
const categories = new Map([
  ['ENOTFOUND', ['DNS_NOT_FOUND', 'The database hostname could not be resolved. Check the connection URL hostname.']],
  ['EAI_AGAIN', ['DNS_TEMPORARY', 'DNS lookup timed out or temporarily failed. Retry or check networking.']],
  ['ECONNREFUSED', ['CONNECTION_REFUSED', 'Database host refused the connection. Check hostname, port and network access.']],
  ['ECONNRESET', ['CONNECTION_RESET', 'The database closed the connection. Check TLS and network settings.']],
  ['ETIMEDOUT', ['TIMEOUT', 'Database connection timed out. Check firewall rules, IP allowlists and server availability.']],
  ['EHOSTUNREACH', ['HOST_UNREACHABLE', 'The database host was unreachable from the GitHub runner.']],
  ['ENETUNREACH', ['NETWORK_UNREACHABLE', 'The database network was unreachable from the GitHub runner.']],
  ['28P01', ['AUTHENTICATION_FAILED', 'Database credentials were rejected. Check the role and password in BLANK_PG_URL.']],
  ['28000', ['ACCESS_DENIED', 'Database access was rejected. Check allowed IPs, role and TLS policy.']],
  ['3D000', ['DATABASE_NOT_FOUND', 'The database name in BLANK_PG_URL does not exist.']],
  ['42501', ['PERMISSION_DENIED', 'The database role lacks the required permissions.']],
  ['53300', ['CONNECTION_LIMIT', 'The database connection limit was reached.']],
  ['57P03', ['SERVER_STARTING', 'The database is not yet accepting connections.']],
  ['08001', ['CONNECTION_FAILED', 'The PostgreSQL server could not establish a connection.']],
  ['08006', ['CONNECTION_FAILED', 'The PostgreSQL connection failed.']],
  ['SELF_SIGNED_CERT_IN_CHAIN', ['TLS_CERTIFICATE', 'TLS certificate verification failed.']],
  ['DEPTH_ZERO_SELF_SIGNED_CERT', ['TLS_CERTIFICATE', 'TLS certificate verification failed.']],
  ['UNABLE_TO_VERIFY_LEAF_SIGNATURE', ['TLS_CERTIFICATE', 'TLS certificate verification failed.']],
  ['CERT_HAS_EXPIRED', ['TLS_CERTIFICATE', 'TLS certificate expired.']],
  ['ERR_TLS_CERT_ALTNAME_INVALID', ['TLS_HOSTNAME', 'TLS certificate hostname mismatch.']],
]);
export function safeDatabaseFailure(error) {
  // Only examine known, fixed error identifiers. Never print error.message or detail.
  if (error?.message === 'BLANK_PG_URL is not configured') {
    return {kind:'SECRET_MISSING',hint:'Add BLANK_PG_URL under repository Settings → Secrets and variables → Actions.'};
  }
  if (error?.message === 'BLANK_PG_URL must be a PostgreSQL connection URL') {
    return {kind:'INVALID_URL',hint:'BLANK_PG_URL must be a complete postgres:// or postgresql:// URL with a hostname.'};
  }
  const known=categories.get(error?.code);
  if (known) return {kind:known[0],hint:known[1]};
  return {kind:'UNKNOWN_CONNECTION_ERROR',hint:'Check the connection URL, TLS settings, network and database availability. No secret details are printed.'};
}
