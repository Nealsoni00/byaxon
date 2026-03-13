export interface SubdomainConfig {
  subdomain: string;
  type: 'redirect' | 'markdown' | 'html';
  content: string; // URL for redirect, markdown/html content for others
  title?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubdomainsData {
  subdomains: SubdomainConfig[];
}
