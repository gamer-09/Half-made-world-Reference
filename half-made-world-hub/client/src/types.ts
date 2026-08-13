export interface Field {
  label: string;
  value: string;
}

export interface Entry {
  id: string;
  category: string;
  name: string;
  subtitle: string;
  description: string;
  fields: Field[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryInfo {
  name: string;
  count: number;
}

export interface EntryInput {
  category: string;
  name: string;
  subtitle: string;
  description: string;
  fields: Field[];
  tags: string[];
}

export type FormMode = 'add' | 'edit';

export interface RecentEntry {
  id: string;
  name: string;
  category: string;
  subtitle: string;
}

export interface ConnectionInfo {
  kind: 'story' | 'relationship';
  typeLabel: string;
  color: string;
  otherName: string;
}

export interface Relationship {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
  description: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RelationshipInput {
  source: string;
  target: string;
  type: string;
  label: string;
  description: string;
  color?: string;
}

export interface StoryLink {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
  description: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoryLinkInput {
  source: string;
  target: string;
  type: string;
  label: string;
  description: string;
  color?: string;
}
