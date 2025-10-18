export type HelpCategory = 'world-builder' | 'character-creation' | 'combat' | 'gameplay' | 'relationships';

export interface HelpFAQ {
  id: string;
  category: HelpCategory;
  question: string;
  answer: string;
  tags: string[];
}

export interface HelpCategoryInfo {
  id: HelpCategory;
  name: string;
  description: string;
  icon: string;
  faqCount: number;
}

export interface HelpChatState {
  selectedCategory: HelpCategory | null;
  selectedFAQ: HelpFAQ | null;
  searchQuery: string;
  isOpen: boolean;
}

export type HelpButtonVariant = 'fixed' | 'inline';
