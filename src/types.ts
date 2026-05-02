export interface Article {
  title: string;
  link: string;
  publishedAt: Date;
  source: string;
  summary?: string;
}

export interface Source {
  name: string;
  url: string;
}
