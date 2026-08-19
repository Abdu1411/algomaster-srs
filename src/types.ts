export type CardType = 
  | 'Concept' 
  | 'Complexity' 
  | 'Pattern' 
  | 'Cloze' 
  | 'Comparison' 
  | 'Trace' 
  | 'Invariant' 
  | 'Debugging' 
  | 'Implementation';

export interface Card {
  id: string;
  type: CardType;
  front: string;
  back: string;
  codeSnippet?: string;
  
  // SRS data
  nextReview: number;
  interval: number;
  ease: number;
  reps: number;
}

export interface Folder {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

export interface Deck {
  id: string;
  title: string;
  folderId?: string;
  cards: Card[];
  createdAt: number;
}

export interface Lesson {
  id: string;
  title: string;
  topic: string;
  sourceUrl?: string;
  content: string;
  folderId?: string;
  createdAt: number;
}
