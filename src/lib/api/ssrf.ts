import dns from 'dns';
import net from 'net';

/**
 * Guards outbound webhook URLs against SSRF. A customer-supplied URL is fetched from our
 * server, so without this an endpoint pointing at http://169.254.169.254/ or an internal
 * service would let anyone with admin access probe the private network.
 *
 * Rules: only http/https, no embedded credentials, no localhost-style names, and the host
 * (or every address it resolves to) must be a public address. The check runs when an
 * endpoint is saved AND again right before each delivery, because DNS can change after save.
 */

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string };
export type HostResolver = (host: string) => Promise<string[]>;

const defaultResolver: HostResolver = async (host) => {
  const rows = await dns.promises.lookup(host, { all: true });
  return rows.map((r) => r.address);
};

function isPrivateV4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && ip.startsWith('192.0.0.')) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast and reserved
  );
}

export function isPrivateAddress(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateV4(ip);
  if (version === 6) {
    const s = ip.toLowerCase();
    const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateV4(mapped[1]);
    // The URL parser rewrites ::ffff:127.0.0.1 as ::ffff:7f00:1, so read the hex form too.
    const hex = s.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const hi = parseInt(hex[1], 16);
      const lo = parseInt(hex[2], 16);
      return isPrivateV4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
    if (s === '::' || s === '::1') return true;
    return /^f[cd]/.test(s) || /^fe[89ab]/.test(s) || s.startsWith('ff');
  }
  return true; // not an address we understand: refuse
}

export async function checkWebhookUrl(raw: string, resolve: HostResolver = defaultResolver): Promise<UrlCheck> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: 'That does not look like a web address.' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'The address must start with http:// or https://' };
  }
  if (url.username || url.password) {
    return { ok: false, reason: 'The address must not contain a username or password.' };
  }
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return { ok: false, reason: 'Addresses on this machine or a private network are not allowed.' };
  }
  const blocked = { ok: false as const, reason: 'Addresses on this machine or a private network are not allowed.' };
  if (net.isIP(host)) return isPrivateAddress(host) ? blocked : { ok: true, url };
  try {
    const addrs = await resolve(host);
    if (addrs.length === 0) return { ok: false, reason: 'We could not find that website address.' };
    if (addrs.some(isPrivateAddress)) return blocked;
  } catch {
    return { ok: false, reason: 'We could not find that website address.' };
  }
  return { ok: true, url };
}
