
export interface DissectedFile {
  path: string;
  content: string;
  language?: string;
}

export interface ProjectStructure {
  name: string;
  files: DissectedFile[];
  framework?: string;
  dependencies: string[];
}

export interface FileTreeItem {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeItem[];
}
