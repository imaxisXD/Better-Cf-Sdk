export interface RegistryFile {
  path: string;
  content: string;
  executable?: boolean;
}

export interface RegistryItem {
  id: string;
  description: string;
  files: RegistryFile[];
  dependencies?: string[];
  devDependencies?: string[];
}

export interface RegistryManifest {
  items: RegistryItem[];
}

export interface RegistryCacheRecord {
  url: string;
  fetchedAt: number;
  items: RegistryItem[];
}

export interface ResolvedRegistry {
  items: RegistryItem[];
  source: 'local' | 'cache' | 'remote';
}
