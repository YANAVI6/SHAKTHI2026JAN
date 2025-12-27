let cachedBaseDomain: string | null = null;

export const extractBaseDomain = (hostname: string): string => {
  if (cachedBaseDomain) {
    return cachedBaseDomain;
  }

  const hostnameWithoutPort = hostname.split(':')[0];

  // Removed localhost detection for production environment

  const parts = hostnameWithoutPort.split('.');
  if (parts.length >= 2) {
    cachedBaseDomain = parts.slice(-2).join('.');
    return cachedBaseDomain;
  }

  cachedBaseDomain = hostnameWithoutPort;
  return cachedBaseDomain;
};

export const getCurrentBaseDomain = (): string => {
  if (typeof window !== 'undefined') {
    return extractBaseDomain(window.location.hostname);
  }
  return import.meta.env.VITE_APP_BASE_DOMAIN || 'yourapp.com';
};

export const getDomainConfig = () => {
  const environment = import.meta.env.VITE_APP_ENVIRONMENT || 'development';
  const baseDomain = getCurrentBaseDomain();
  const currentProtocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
  const currentHost = typeof window !== 'undefined' ? window.location.host : '';

  return {
    environment,
    baseDomain,
    currentProtocol,
    currentHost,
    getFullSlugUrl: (slug: string) => {
      return `${currentProtocol}//${currentHost}/${slug}`;
    },
    getLoginUrl: (slug: string) => {
      return `${currentProtocol}//${currentHost}/${slug}/login`;
    },
    getDisplayDomain: (slug?: string) => {
      if (slug) {
        return `${currentHost}/${slug}`;
      }
      return baseDomain;
    }
  };
};

export const RESERVED_SLUGS = [
  'www',
  'admin',
  'superadmin',
  'api',
  'app',
  'mail',
  'smtp',
  'ftp',
  'webmail',
  'cpanel',
  'whm',
  'blog',
  'forum',
  'shop',
  'store',
  'dashboard',
  'portal',
  'support',
  'help',
  'docs',
  'status',
  'dev',
  'staging',
  'test',
  'demo',
  'sandbox',
  'ns1',
  'ns2',
  'dns',
  'cdn',
  'assets',
  'static',
  'media',
  'files',
  'images'
];

export const SLUG_REGEX = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/;
