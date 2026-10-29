-- Учебный перенос SQLite-примера в PostgreSQL. Выполнять только в отдельной БД.
CREATE SCHEMA IF NOT EXISTS training;
CREATE TABLE IF NOT EXISTS training.inbox (
 source text NOT NULL, event_id text NOT NULL,
 processed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(source,event_id));
CREATE TABLE IF NOT EXISTS training.sale_state (
 source text NOT NULL, entity_key text NOT NULL, version bigint NOT NULL,
 document_id text NOT NULL, line_no integer NOT NULL CHECK(line_no>0),
 org_id text NOT NULL, sale_date date NOT NULL,
 amount_kopecks bigint NOT NULL, posted boolean NOT NULL, deleted boolean NOT NULL,
 PRIMARY KEY(source,entity_key));
CREATE TABLE IF NOT EXISTS training.checkpoint (
 source text PRIMARY KEY, cursor bigint NOT NULL);
CREATE OR REPLACE VIEW training.mart_daily AS
 SELECT org_id,sale_date,SUM(amount_kopecks) AS revenue_kopecks,COUNT(*) AS lines
 FROM training.sale_state WHERE posted AND NOT deleted GROUP BY org_id,sale_date;
-- Задания: SQLAlchemy-адаптер, source_version условие в ON CONFLICT,
-- SCD2 измерений, fact_sales со ссылками, публикация и независимая сверка.
