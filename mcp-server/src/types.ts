export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  folderId: string;
  tags: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Tag {
  id: string;
  name: string;
}

export interface TagCategory {
  id: string;
  name: string;
  tags: string[];
}

export interface FolderWithPrompts extends Folder {
  prompts: Prompt[];
  children: FolderWithPrompts[];
}

export interface FolderTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  children: FolderTreeNode[];
  promptCount: number;
}

export interface Notebook {
  id: string;
  name: string;
  type: 'prompts' | 'notebook' | 'book';
  description?: string | null;
  icon?: string | null;
  iconColor?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Note {
  id: string;
  notebookId: string;
  title: string;
  content: string;
  type: 'text' | 'spreadsheet' | 'prompt' | 'book';
  template?: string | null;
  position?: number | null;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SpreadsheetData {
  columns: string[];
  rows: string[][];
}

// ============ BOOK / CHAPTER STRUCTURE (stored in notes.content as JSON) ============

export interface ChapterVersion {
  id: string;
  name: string;
  content: string;
  savedAt: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  versions?: ChapterVersion[];
}

export interface BookSection {
  id: string;
  title: string;
  chapters: Chapter[];
}

export interface BookContent {
  sections: BookSection[];
  activeSectionId?: string;
  activeChapterId?: string;
  autoNumberChapters?: boolean;
}

export interface ChapterVersionSummary {
  id: string;
  name: string;
  savedAt: string;
  contentLength: number;
}
