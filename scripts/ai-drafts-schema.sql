ALTER TABLE newsroom.articles ADD COLUMN IF NOT EXISTS ai_metadata jsonb;
CREATE TABLE IF NOT EXISTS newsroom.ai_draft_runs (
  period text NOT NULL, category text NOT NULL CHECK (category IN ('politics','entertainment','technology')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts BETWEEN 1 AND 2),
  article_id integer REFERENCES newsroom.articles(id), topic text, source_urls jsonb NOT NULL DEFAULT '[]',
  error text, started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
  PRIMARY KEY (period, category)
);
ALTER TABLE newsroom.ai_draft_runs ADD COLUMN IF NOT EXISTS research_packet jsonb;
ALTER TABLE newsroom.articles ADD COLUMN IF NOT EXISTS research_metadata jsonb;
