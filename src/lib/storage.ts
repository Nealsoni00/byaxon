import { put, list, del } from '@vercel/blob';
import { SubdomainConfig, SubdomainsData } from '@/types';

const CONFIG_PATH = 'config/subdomains.json';

export async function getSubdomains(): Promise<SubdomainConfig[]> {
  try {
    const { blobs } = await list({ prefix: CONFIG_PATH });
    if (blobs.length === 0) {
      return [];
    }

    // Add cache-busting to avoid stale data
    const url = new URL(blobs[0].url);
    url.searchParams.set('t', Date.now().toString());

    const response = await fetch(url.toString(), {
      cache: 'no-store',
    });
    const data: SubdomainsData = await response.json();
    return data.subdomains || [];
  } catch (error) {
    console.error('Error reading subdomains:', error);
    return [];
  }
}

export async function saveSubdomains(subdomains: SubdomainConfig[]): Promise<void> {
  const data: SubdomainsData = { subdomains };

  // Delete existing config if any
  try {
    const { blobs } = await list({ prefix: CONFIG_PATH });
    for (const blob of blobs) {
      await del(blob.url);
    }
  } catch {
    // Ignore delete errors
  }

  // Save new config
  await put(CONFIG_PATH, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json',
  });
}

export async function getSubdomain(subdomain: string): Promise<SubdomainConfig | null> {
  const subdomains = await getSubdomains();
  return subdomains.find(s => s.subdomain === subdomain) || null;
}

export async function createSubdomain(config: SubdomainConfig): Promise<SubdomainConfig> {
  const subdomains = await getSubdomains();

  if (subdomains.some(s => s.subdomain === config.subdomain)) {
    throw new Error('Subdomain already exists');
  }

  subdomains.push(config);
  await saveSubdomains(subdomains);
  return config;
}

export async function updateSubdomain(subdomain: string, updates: Partial<SubdomainConfig>): Promise<SubdomainConfig | null> {
  const subdomains = await getSubdomains();
  const index = subdomains.findIndex(s => s.subdomain === subdomain);

  if (index === -1) {
    return null;
  }

  subdomains[index] = {
    ...subdomains[index],
    ...updates,
    subdomain, // Prevent changing subdomain name
    updatedAt: new Date().toISOString(),
  };

  await saveSubdomains(subdomains);
  return subdomains[index];
}

export async function deleteSubdomain(subdomain: string): Promise<boolean> {
  const subdomains = await getSubdomains();
  const index = subdomains.findIndex(s => s.subdomain === subdomain);

  if (index === -1) {
    return false;
  }

  subdomains.splice(index, 1);
  await saveSubdomains(subdomains);
  return true;
}

// Image upload
export async function uploadImage(file: File, folder: string = 'images'): Promise<string> {
  const filename = `${folder}/${Date.now()}-${file.name}`;
  const blob = await put(filename, file, {
    access: 'public',
    contentType: file.type,
  });
  return blob.url;
}

export async function deleteImage(url: string): Promise<void> {
  await del(url);
}

export async function listImages(): Promise<{ url: string; pathname: string; uploadedAt: Date }[]> {
  const { blobs } = await list({ prefix: 'images/' });
  return blobs.map(b => ({
    url: b.url,
    pathname: b.pathname,
    uploadedAt: b.uploadedAt,
  }));
}
