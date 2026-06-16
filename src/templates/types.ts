export type FieldType = 'text' | 'textarea' | 'rich-text' | 'number' | 'container';

export type TemplateCategory = 'structure' | 'content' | 'reference' | 'custom';

export interface TemplateField {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  defaultValue?: string;
}

export interface Template {
  id: string;
  name: string;
  icon: string;
  description?: string;
  category: TemplateCategory;
  fields: TemplateField[];
  render: (data: Record<string, string>) => string;
  isCustom?: boolean;
}

export interface TemplateInstance {
  id: string;
  templateId: string;
  data: Record<string, string>;
}

export interface StoredCustomTemplate extends Omit<Template, 'render'> {
  templateStr: string;
}
