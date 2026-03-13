export interface SubdomainConfig {
  subdomain: string;
  type: 'redirect' | 'markdown' | 'html' | 'iframe' | 'custom';
  content: string; // URL for redirect/iframe, markdown/html content for others, description for custom
  title?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubdomainsData {
  subdomains: SubdomainConfig[];
}
