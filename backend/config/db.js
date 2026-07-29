import dns from 'dns';
import mongoose from 'mongoose';

/**
 * Make sure `mongodb+srv://` URIs can actually be resolved.
 *
 * Node looks up SRV/TXT records with c-ares (dns.resolveSrv), which keeps its own server list
 * instead of using the OS resolver. On some Windows setups c-ares fails to read the
 * DHCP-assigned DNS servers and falls back to 127.0.0.1, where nothing is listening — the
 * lookup then fails with "querySrv ECONNREFUSED" even though `nslookup` works fine.
 * Plain socket connections are unaffected (they use getaddrinfo), so this only ever breaks
 * the +srv form.
 *
 * Set DNS_SERVERS in .env to pick resolvers explicitly; otherwise we only step in when the
 * configured resolver is demonstrably unusable.
 */
function ensureSrvResolver(uri) {
  if (!uri.startsWith('mongodb+srv://')) return;

  const explicit = (process.env.DNS_SERVERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (explicit.length > 0) {
    dns.setServers(explicit);
    console.log(`\x1b[32m✓\x1b[0m DNS servers set from DNS_SERVERS: ${explicit.join(', ')}`);
    return;
  }

  const current = dns.getServers();
  const unusable = current.length === 0 || current.every((s) => s === '127.0.0.1' || s === '::1');
  if (unusable) {
    const fallback = ['8.8.8.8', '1.1.1.1'];
    dns.setServers(fallback);
    console.warn(
      `\x1b[33m[WARNING]\x1b[0m Node's DNS resolver was ${JSON.stringify(current)}, which cannot ` +
      `resolve the SRV record this connection string needs. Falling back to ${fallback.join(', ')}. ` +
      `Set DNS_SERVERS in .env to use your own resolvers instead.`
    );
  }
}

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  try {
    ensureSrvResolver(uri);
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    if (err.message.includes('querySrv') || err.message.includes('ENOTFOUND')) {
      console.error(
        'Hint: DNS lookup for the cluster failed. Set DNS_SERVERS=8.8.8.8,1.1.1.1 in .env, or use the\n' +
        '      standard (non-SRV) connection string from Atlas: Connect > Drivers > "Node.js 2.2.12 or later".'
      );
    }
    if (/auth/i.test(err.message)) {
      console.error(
        'Hint: the cluster was reached but rejected the credentials. Check the username/password in\n' +
        '      MONGODB_URI against Atlas > Database Access, and confirm that user exists on THIS cluster.\n' +
        '      Passwords with special characters must be URL-encoded.'
      );
    }
    process.exit(1);
  }
};

export default connectDB;
