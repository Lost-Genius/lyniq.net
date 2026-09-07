CREATE SCHEMA IF NOT EXISTS newsroom;
DO $$ BEGIN CREATE TYPE newsroom.user_role AS ENUM ('admin','user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE newsroom.newsroom_role AS ENUM ('owner','editor','writer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE newsroom.article_status AS ENUM ('draft','review','scheduled','published'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE newsroom.article_section AS ENUM ('Local','Caribbean','World','Business','Tech','Culture','Opinion'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS newsroom.users(id serial PRIMARY KEY,email text UNIQUE NOT NULL,display_name text NOT NULL,avatar_url text,role newsroom.user_role NOT NULL DEFAULT 'user',created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS newsroom.user_passwords(id serial PRIMARY KEY,user_id integer UNIQUE NOT NULL REFERENCES newsroom.users(id),password_hash text NOT NULL,created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS newsroom.sessions(id text PRIMARY KEY,user_id integer NOT NULL REFERENCES newsroom.users(id),created_at timestamptz DEFAULT now(),last_accessed timestamptz DEFAULT now(),expires_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS newsroom_session_user_idx ON newsroom.sessions(user_id);
CREATE TABLE IF NOT EXISTS newsroom.login_attempts(id serial PRIMARY KEY,email text NOT NULL,attempted_at timestamptz DEFAULT now(),success boolean DEFAULT false);
CREATE INDEX IF NOT EXISTS newsroom_attempt_email_idx ON newsroom.login_attempts(email,attempted_at);
CREATE TABLE IF NOT EXISTS newsroom.team_members(user_id integer PRIMARY KEY REFERENCES newsroom.users(id),role newsroom.newsroom_role NOT NULL);
CREATE TABLE IF NOT EXISTS newsroom.invitations(id serial PRIMARY KEY,token_hash text UNIQUE NOT NULL,email text,role newsroom.newsroom_role NOT NULL,expires_at timestamptz NOT NULL,used_at timestamptz);
CREATE TABLE IF NOT EXISTS newsroom.sources(id serial PRIMARY KEY,name text UNIQUE NOT NULL,website text NOT NULL,feed_url text,section newsroom.article_section NOT NULL,enabled boolean NOT NULL DEFAULT false,rights_note text NOT NULL,checked_at timestamptz,last_success_at timestamptz,last_error text);
CREATE TABLE IF NOT EXISTS newsroom.articles(id serial PRIMARY KEY,slug text UNIQUE NOT NULL,title text NOT NULL,excerpt text NOT NULL DEFAULT '',body text NOT NULL DEFAULT '',section newsroom.article_section NOT NULL,status newsroom.article_status NOT NULL DEFAULT 'draft',source_id integer REFERENCES newsroom.sources(id),source_url text UNIQUE,author_id integer REFERENCES newsroom.users(id),byline text NOT NULL,featured boolean NOT NULL DEFAULT false,published_at timestamptz,updated_at timestamptz NOT NULL DEFAULT now(),created_at timestamptz NOT NULL DEFAULT now(),version integer NOT NULL DEFAULT 1);
CREATE INDEX IF NOT EXISTS newsroom_article_public_idx ON newsroom.articles(status,published_at DESC);
CREATE INDEX IF NOT EXISTS newsroom_article_section_idx ON newsroom.articles(section,status,published_at DESC);
CREATE TABLE IF NOT EXISTS newsroom.audit_log(id serial PRIMARY KEY,user_id integer REFERENCES newsroom.users(id),action text NOT NULL,article_id integer,created_at timestamptz NOT NULL DEFAULT now());

