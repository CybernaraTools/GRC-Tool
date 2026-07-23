--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO supabase_admin;

--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA extensions;


ALTER SCHEMA extensions OWNER TO postgres;

--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql;


ALTER SCHEMA graphql OWNER TO supabase_admin;

--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql_public;


ALTER SCHEMA graphql_public OWNER TO supabase_admin;

--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: pgbouncer
--

CREATE SCHEMA pgbouncer;


ALTER SCHEMA pgbouncer OWNER TO pgbouncer;

--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA realtime;


ALTER SCHEMA realtime OWNER TO supabase_admin;

--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA storage;


ALTER SCHEMA storage OWNER TO supabase_admin;

--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA supabase_migrations;


ALTER SCHEMA supabase_migrations OWNER TO postgres;

--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA vault;


ALTER SCHEMA vault OWNER TO supabase_admin;

--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE auth.aal_level OWNER TO supabase_auth_admin;

--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


ALTER TYPE auth.code_challenge_method OWNER TO supabase_auth_admin;

--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE auth.factor_status OWNER TO supabase_auth_admin;

--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE auth.oauth_authorization_status OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE auth.oauth_client_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE auth.oauth_registration_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


ALTER TYPE auth.oauth_response_type OWNER TO supabase_auth_admin;

--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE auth.one_time_token_type OWNER TO supabase_auth_admin;

--
-- Name: ai_generation_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ai_generation_status AS ENUM (
    'awaiting_review',
    'fallback_used',
    'approved',
    'rejected'
);


ALTER TYPE public.ai_generation_status OWNER TO postgres;

--
-- Name: ai_review_state; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ai_review_state AS ENUM (
    'pending_review',
    'approved',
    'rejected'
);


ALTER TYPE public.ai_review_state OWNER TO postgres;

--
-- Name: assessment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.assessment_status AS ENUM (
    'not_started',
    'in_progress',
    'submitted',
    'needs_changes',
    'approved',
    'closed'
);


ALTER TYPE public.assessment_status OWNER TO postgres;

--
-- Name: catalog_owner_scope; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.catalog_owner_scope AS ENUM (
    'global',
    'tenant'
);


ALTER TYPE public.catalog_owner_scope OWNER TO postgres;

--
-- Name: catalog_subscription_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.catalog_subscription_status AS ENUM (
    'active',
    'paused',
    'revoked'
);


ALTER TYPE public.catalog_subscription_status OWNER TO postgres;

--
-- Name: content_pack_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.content_pack_status AS ENUM (
    'quarantined',
    'staged',
    'validated',
    'review_pending',
    'published',
    'rejected'
);


ALTER TYPE public.content_pack_status OWNER TO postgres;

--
-- Name: cybernara_classification; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.cybernara_classification AS ENUM (
    'public',
    'internal',
    'confidential',
    'restricted'
);


ALTER TYPE public.cybernara_classification OWNER TO postgres;

--
-- Name: evidence_state; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.evidence_state AS ENUM (
    'pending',
    'quarantined',
    'committed',
    'rejected'
);


ALTER TYPE public.evidence_state OWNER TO postgres;

--
-- Name: mapping_classification; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mapping_classification AS ENUM (
    'mapped',
    'partial',
    'conflicting',
    'unique'
);


ALTER TYPE public.mapping_classification OWNER TO postgres;

--
-- Name: mapping_conflict_resolution_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mapping_conflict_resolution_status AS ENUM (
    'open',
    'resolved',
    'wont_fix'
);


ALTER TYPE public.mapping_conflict_resolution_status OWNER TO postgres;

--
-- Name: mapping_review_decision; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mapping_review_decision AS ENUM (
    'approved',
    'rejected',
    'needs_changes'
);


ALTER TYPE public.mapping_review_decision OWNER TO postgres;

--
-- Name: outbox_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.outbox_status AS ENUM (
    'pending',
    'processing',
    'processed',
    'dead_letter'
);


ALTER TYPE public.outbox_status OWNER TO postgres;

--
-- Name: action; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


ALTER TYPE realtime.action OWNER TO supabase_admin;

--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in',
    'like',
    'ilike',
    'is',
    'match',
    'imatch',
    'isdistinct'
);


ALTER TYPE realtime.equality_op OWNER TO supabase_admin;

--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text,
	negate boolean
);


ALTER TYPE realtime.user_defined_filter OWNER TO supabase_admin;

--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


ALTER TYPE realtime.wal_column OWNER TO supabase_admin;

--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


ALTER TYPE realtime.wal_rls OWNER TO supabase_admin;

--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE storage.buckettype OWNER TO supabase_storage_admin;

--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION auth.jwt() OWNER TO supabase_auth_admin;

--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_cron_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
begin
    if not exists (
        select 1
        from pg_event_trigger_ddl_commands() ev
        join pg_catalog.pg_extension e on ev.objid = e.oid
        where e.extname = 'pg_graphql'
    ) then
        return;
    end if;

    drop function if exists graphql_public.graphql;
    create or replace function graphql_public.graphql(
        "operationName" text default null,
        query text default null,
        variables jsonb default null,
        extensions jsonb default null
    )
        returns jsonb
        language sql
    as $$
        select graphql.resolve(
            query := query,
            variables := coalesce(variables, '{}'),
            "operationName" := "operationName",
            extensions := extensions
        );
    $$;

    -- Attach the wrapper to the extension so DROP EXTENSION cascades to it,
    -- which in turn triggers set_graphql_placeholder to reinstall the "not enabled" stub.
    alter extension pg_graphql add function graphql_public.graphql(text, text, jsonb, jsonb);

    grant usage on schema graphql to postgres, anon, authenticated, service_role;
    grant execute on function graphql.resolve to postgres, anon, authenticated, service_role;
    grant usage on schema graphql to postgres with grant option;
    grant usage on schema graphql_public to postgres with grant option;
end;
$_$;


ALTER FUNCTION extensions.grant_pg_graphql_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_net_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_ddl_watch() OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_drop_watch() OWNER TO supabase_admin;

--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


ALTER FUNCTION extensions.set_graphql_placeholder() OWNER TO supabase_admin;

--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: graphql(text, text, jsonb, jsonb); Type: FUNCTION; Schema: graphql_public; Owner: supabase_admin
--

CREATE FUNCTION graphql_public.graphql("operationName" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;


ALTER FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) OWNER TO supabase_admin;

--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: supabase_admin
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


ALTER FUNCTION pgbouncer.get_auth(p_usename text) OWNER TO supabase_admin;

--
-- Name: app_current_principal(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_current_principal() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select nullif(current_setting('app.principal_id', true), '')::uuid
$$;


ALTER FUNCTION public.app_current_principal() OWNER TO postgres;

--
-- Name: app_current_tenant(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_current_tenant() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select nullif(current_setting('app.tenant_id', true), '')::uuid
$$;


ALTER FUNCTION public.app_current_tenant() OWNER TO postgres;

--
-- Name: delete_universal_task_on_legacy_delete(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_universal_task_on_legacy_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  delete from universal_tasks
  where target_id = old.id;
  return old;
end;
$$;


ALTER FUNCTION public.delete_universal_task_on_legacy_delete() OWNER TO postgres;

--
-- Name: fn_after_control_mappings(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_after_control_mappings() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  insert into mapping_reviews (tenant_id, version, control_mapping_id, reviewer_id, decision, rationale, reviewed_at, classification, created_by, updated_by)
  values (NEW.tenant_id, 1, NEW.id, NEW.updated_by, 'approved', coalesce(NEW.rationale, 'Legacy mapping backfill'), NEW.updated_at, NEW.classification, NEW.created_by, NEW.updated_by)
  on conflict do nothing;
  return NEW;
end;
$$;


ALTER FUNCTION public.fn_after_control_mappings() OWNER TO postgres;

--
-- Name: fn_backfill_control_mappings(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_backfill_control_mappings() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_mapping_version_id uuid;
begin
  if NEW.mapping_version_id is null then
    insert into mapping_versions (tenant_id, version, version_key, status, published_at, owner_scope, classification, created_by, updated_by)
    values (NEW.tenant_id, 1, 'v1', 'published', now(), NEW.owner_scope, NEW.classification, NEW.created_by, NEW.updated_by)
    on conflict (tenant_id, version_key) do update
      set updated_at = now()
    returning id into v_mapping_version_id;

    NEW.mapping_version_id := v_mapping_version_id;
  end if;
  return NEW;
end;
$$;


ALTER FUNCTION public.fn_backfill_control_mappings() OWNER TO postgres;

--
-- Name: fn_backfill_framework_content_packs(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_backfill_framework_content_packs() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_framework_id uuid;
  v_framework_version_id uuid;
begin
  if NEW.framework_version_id is null then
    -- 1. Get or create framework
    insert into frameworks (tenant_id, version, framework_key, name, description, owner_scope, classification, created_by, updated_by)
    values (NEW.tenant_id, 1, NEW.framework_key, NEW.framework_key, 'Auto-created framework', NEW.owner_scope, NEW.classification, NEW.created_by, NEW.updated_by)
    on conflict (tenant_id, framework_key) do update
      set updated_at = now()
    returning id into v_framework_id;

    -- 2. Get or create framework_version
    insert into framework_versions (tenant_id, version, framework_id, version_key, status, published_at, owner_scope, classification, created_by, updated_by)
    values (NEW.tenant_id, 1, v_framework_id, NEW.pack_version, NEW.status, NEW.published_at, NEW.owner_scope, NEW.classification, NEW.created_by, NEW.updated_by)
    on conflict (tenant_id, framework_id, version_key) do update
      set updated_at = now()
    returning id into v_framework_version_id;

    NEW.framework_version_id := v_framework_version_id;
  end if;
  return NEW;
end;
$$;


ALTER FUNCTION public.fn_backfill_framework_content_packs() OWNER TO postgres;

--
-- Name: fn_backfill_framework_requirements(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_backfill_framework_requirements() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_framework_version_id uuid;
  v_owner_scope catalog_owner_scope;
  v_control_set_id uuid;
  v_control_id uuid;
  v_control_subcontrol_id uuid;
begin
  if NEW.control_id_ref is null then
    -- 1. Get parent pack info
    select framework_version_id, owner_scope
    into v_framework_version_id, v_owner_scope
    from framework_content_packs
    where id = NEW.framework_pack_id;

    if v_framework_version_id is null then
      -- Parent pack not found or doesn't have framework_version_id yet
      return NEW;
    end if;

    -- 2. Get or create control_set
    insert into control_sets (tenant_id, version, framework_version_id, set_key, name, owner_scope, classification, created_by, updated_by)
    values (NEW.tenant_id, 1, v_framework_version_id, 'default', 'Default Control Set', v_owner_scope, NEW.classification, NEW.created_by, NEW.updated_by)
    on conflict (tenant_id, framework_version_id, set_key) do update
      set updated_at = now()
    returning id into v_control_set_id;

    -- 3. Get or create control
    insert into controls (tenant_id, version, control_set_id, control_key, title, requirement_text, citation, source_workbook, source_sheet, source_row_number, owner_scope, classification, created_by, updated_by)
    values (NEW.tenant_id, 1, v_control_set_id, NEW.control_id, NEW.control_title, NEW.requirement_text, NEW.citation, NEW.source_workbook, NEW.source_sheet, NEW.source_row_number, v_owner_scope, NEW.classification, NEW.created_by, NEW.updated_by)
    on conflict (tenant_id, control_set_id, control_key) do update
      set updated_at = now()
    returning id into v_control_id;

    NEW.control_id_ref := v_control_id;

    -- 4. If subcontrol exists, get or create control_subcontrols
    if NEW.sub_control_id is not null then
      insert into control_subcontrols (tenant_id, version, control_id, subcontrol_key, title, requirement_text, citation, source_workbook, source_sheet, source_row_number, owner_scope, classification, created_by, updated_by)
      values (NEW.tenant_id, 1, v_control_id, NEW.sub_control_id, coalesce(NEW.sub_control_title, NEW.sub_control_id), NEW.requirement_text, NEW.citation, NEW.source_workbook, NEW.source_sheet, NEW.source_row_number, v_owner_scope, NEW.classification, NEW.created_by, NEW.updated_by)
      on conflict (tenant_id, control_id, subcontrol_key) do update
        set updated_at = now()
      returning id into v_control_subcontrol_id;

      NEW.control_subcontrol_id := v_control_subcontrol_id;
    end if;
  end if;
  return NEW;
end;
$$;


ALTER FUNCTION public.fn_backfill_framework_requirements() OWNER TO postgres;

--
-- Name: fn_block_legacy_writes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_block_legacy_writes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception 'Writes to legacy table % are blocked. Use the new normalized paths instead.', TG_TABLE_NAME;
end;
$$;


ALTER FUNCTION public.fn_block_legacy_writes() OWNER TO postgres;

--
-- Name: fn_guard_legacy_write(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_guard_legacy_write() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_allowed text;
begin
  -- Migration/backfill transactions explicitly set this to bypass the guard.
  -- Normal application code never sets it.
  v_allowed := current_setting('app.allow_legacy_write', true);
  if v_allowed is distinct from '1' then
    raise exception
      'Direct INSERTs to legacy table "%" are deprecated. '
      'Use the canonical API. '
      'If you are running a migration or backfill, set: SET LOCAL app.allow_legacy_write = ''1'';',
      TG_TABLE_NAME
      using errcode = '42000';
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.fn_guard_legacy_write() OWNER TO postgres;

--
-- Name: handle_universal_task_completion(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_universal_task_completion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.status = 'completed' and (old.status is null or old.status <> 'completed') then
    new.completed_at := now();
    new.completed_by := new.updated_by;
  elsif new.status <> 'completed' then
    new.completed_at := null;
    new.completed_by := null;
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.handle_universal_task_completion() OWNER TO postgres;

--
-- Name: prevent_access_review_decision_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_access_review_decision_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception 'access_review_decisions is append-only';
end;
$$;


ALTER FUNCTION public.prevent_access_review_decision_mutation() OWNER TO postgres;

--
-- Name: prevent_ai_publication_event_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_ai_publication_event_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception 'ai_publication_events is append-only';
end;
$$;


ALTER FUNCTION public.prevent_ai_publication_event_mutation() OWNER TO postgres;

--
-- Name: prevent_approved_question_version_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_approved_question_version_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if old.approved_at is not null then
    raise exception 'question_versions: an approved question version is immutable';
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.prevent_approved_question_version_mutation() OWNER TO postgres;

--
-- Name: prevent_assessment_history_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_assessment_history_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;


ALTER FUNCTION public.prevent_assessment_history_mutation() OWNER TO postgres;

--
-- Name: prevent_audit_chain_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_audit_chain_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;


ALTER FUNCTION public.prevent_audit_chain_mutation() OWNER TO postgres;

--
-- Name: prevent_audit_event_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_audit_event_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception 'audit_events is append-only';
end;
$$;


ALTER FUNCTION public.prevent_audit_event_mutation() OWNER TO postgres;

--
-- Name: prevent_evidence_graph_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_evidence_graph_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;


ALTER FUNCTION public.prevent_evidence_graph_mutation() OWNER TO postgres;

--
-- Name: prevent_export_manifest_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_export_manifest_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception 'export_manifests is append-only';
end;
$$;


ALTER FUNCTION public.prevent_export_manifest_mutation() OWNER TO postgres;

--
-- Name: prevent_policy_attestation_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_policy_attestation_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception 'policy_attestations is append-only';
end;
$$;


ALTER FUNCTION public.prevent_policy_attestation_mutation() OWNER TO postgres;

--
-- Name: prevent_privacy_ledger_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_privacy_ledger_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;


ALTER FUNCTION public.prevent_privacy_ledger_mutation() OWNER TO postgres;

--
-- Name: prevent_review_decision_self_review(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_review_decision_self_review() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  submitter uuid;
begin
  select submitted_by into submitter from answer_revisions where id = new.answer_revision_id;
  if submitter = new.reviewer_id then
    raise exception 'review_decisions: reviewer must not be the same principal as the answer submitter';
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.prevent_review_decision_self_review() OWNER TO postgres;

--
-- Name: prevent_risk_acceptance_review_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_risk_acceptance_review_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception 'risk_acceptance_reviews is append-only';
end;
$$;


ALTER FUNCTION public.prevent_risk_acceptance_review_mutation() OWNER TO postgres;

--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION public.rls_auto_enable() OWNER TO postgres;

--
-- Name: sync_remediation_task_to_universal(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_remediation_task_to_universal() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  insert into universal_tasks (
    tenant_id, title, description, status, priority, due_at, owner_id, target_type, target_id, classification, created_by, updated_by
  )
  values (
    new.tenant_id,
    'Remediation: Finding ' || new.finding_id,
    'Remediate finding ' || new.finding_id,
    case new.status
      when 'open' then 'pending'
      when 'in_progress' then 'in_progress'
      when 'verified' then 'completed'
      when 'risk_accepted' then 'completed'
      else 'pending'
    end,
    'medium',
    new.due_at,
    new.owner_id,
    'remediation_task',
    new.id,
    new.classification,
    new.created_by,
    new.updated_by
  )
  on conflict (tenant_id, target_type, target_id) do update set
    status = excluded.status,
    due_at = excluded.due_at,
    owner_id = excluded.owner_id,
    updated_by = excluded.updated_by,
    updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.sync_remediation_task_to_universal() OWNER TO postgres;

--
-- Name: sync_rights_request_task_to_universal(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_rights_request_task_to_universal() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  insert into universal_tasks (
    tenant_id, title, description, status, priority, due_at, owner_id, target_type, target_id, classification, created_by, updated_by
  )
  values (
    new.tenant_id,
    'Privacy Request: ' || new.task_type || ' for ' || new.system_id,
    'Fulfill rights request ' || new.rights_request_id,
    case new.status
      when 'pending' then 'pending'
      when 'in_progress' then 'in_progress'
      when 'completed' then 'completed'
      when 'blocked' then 'pending'
      else 'pending'
    end,
    'high',
    new.created_at + interval '30 days',
    new.owner_id,
    'rights_request_task',
    new.id,
    new.classification,
    new.created_by,
    new.updated_by
  )
  on conflict (tenant_id, target_type, target_id) do update set
    status = excluded.status,
    owner_id = excluded.owner_id,
    updated_by = excluded.updated_by,
    updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.sync_rights_request_task_to_universal() OWNER TO postgres;

--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
    -- Regclass of the table e.g. public.notes
    entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

    -- I, U, D, T: insert, update ...
    action realtime.action = (
        case wal ->> 'action'
            when 'I' then 'INSERT'
            when 'U' then 'UPDATE'
            when 'D' then 'DELETE'
            else 'ERROR'
        end
    );

    -- Is row level security enabled for the table
    is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

    subscriptions realtime.subscription[] = array_agg(subs)
        from
            realtime.subscription subs
        where
            subs.entity = entity_
            -- Filter by action early - only get subscriptions interested in this action
            -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
            and (subs.action_filter = '*' or subs.action_filter = action::text);

    -- Subscription vars
    working_role regrole;
    working_selected_columns text[];
    claimed_role regrole;
    claims jsonb;

    subscription_id uuid;
    subscription_has_access bool;
    visible_to_subscription_ids uuid[] = '{}';

    -- structured info for wal's columns
    columns realtime.wal_column[];
    -- previous identity values for update/delete
    old_columns realtime.wal_column[];

    error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

    -- Primary jsonb output for record
    output jsonb;

    -- Loop record for iterating unique roles (outer loop)
    role_record record;
    -- Loop record for iterating unique selected_columns within a role (inner loop)
    cols_record record;
    -- Subscription ids visible at the role level (before fanning out by selected_columns)
    visible_role_sub_ids uuid[] = '{}';

begin
    perform set_config('role', null, true);

    columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'columns') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    old_columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'identity') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    for role_record in
        select claims_role
        from (select distinct claims_role from unnest(subscriptions)) t
        order by claims_role::text
    loop
        working_role := role_record.claims_role;

        -- Update `is_selectable` for columns and old_columns (once per role)
        columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(columns) c;

        old_columns =
                array_agg(
                    (
                        c.name,
                        c.type_name,
                        c.type_oid,
                        c.value,
                        c.is_pkey,
                        pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                    )::realtime.wal_column
                )
                from
                    unnest(old_columns) c;

        if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
            -- Fan out 400 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 400: Bad Request, no primary key']
                )::realtime.wal_rls;
            end loop;

        -- The claims role does not have SELECT permission to the primary key of entity
        elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
            -- Fan out 401 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 401: Unauthorized']
                )::realtime.wal_rls;
            end loop;

        else
            -- Create the prepared statement (once per role)
            if is_rls_enabled and action <> 'DELETE' then
                if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                    deallocate walrus_rls_stmt;
                end if;
                execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
            end if;

            -- Collect all visible subscription IDs for this role (filter check + RLS check)
            visible_role_sub_ids = '{}';

            for subscription_id, claims in (
                    select
                        subs.subscription_id,
                        subs.claims
                    from
                        unnest(subscriptions) subs
                    where
                        subs.entity = entity_
                        and subs.claims_role = working_role
                        and (
                            realtime.is_visible_through_filters(columns, subs.filters)
                            or (
                              action = 'DELETE'
                              and realtime.is_visible_through_filters(old_columns, subs.filters)
                            )
                        )
            ) loop

                if not is_rls_enabled or action = 'DELETE' then
                    visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                else
                    -- Check if RLS allows the role to see the record
                    perform
                        -- Trim leading and trailing quotes from working_role because set_config
                        -- doesn't recognize the role as valid if they are included
                        set_config('role', trim(both '"' from working_role::text), true),
                        set_config('request.jwt.claims', claims::text, true);

                    execute 'execute walrus_rls_stmt' into subscription_has_access;

                    if subscription_has_access then
                        visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                    end if;
                end if;
            end loop;

            perform set_config('role', null, true);

            -- Inner loop: per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;

                output = jsonb_build_object(
                    'schema', wal ->> 'schema',
                    'table', wal ->> 'table',
                    'type', action,
                    'commit_timestamp', to_char(
                        ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                    ),
                    'columns', (
                        select
                            jsonb_agg(
                                jsonb_build_object(
                                    'name', pa.attname,
                                    'type', pt.typname
                                )
                                order by pa.attnum asc
                            )
                        from
                            pg_attribute pa
                            join pg_type pt
                                on pa.atttypid = pt.oid
                            left join (
                                select unnest(conkey) as pkey_attnum
                                from pg_constraint
                                where conrelid = entity_ and contype = 'p'
                            ) pk on pk.pkey_attnum = pa.attnum
                        where
                            attrelid = entity_
                            and attnum > 0
                            and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
                            and (working_selected_columns is null or pa.attname = any(working_selected_columns) or pk.pkey_attnum is not null)
                    )
                )
                -- Add "record" key for insert and update
                || case
                    when action in ('INSERT', 'UPDATE') then
                        jsonb_build_object(
                            'record',
                            (
                                select
                                    jsonb_object_agg(
                                        -- if unchanged toast, get column name and value from old record
                                        coalesce((c).name, (oc).name),
                                        case
                                            when (c).name is null then (oc).value
                                            else (c).value
                                        end
                                    )
                                from
                                    unnest(columns) c
                                    full outer join unnest(old_columns) oc
                                        on (c).name = (oc).name
                                where
                                    coalesce((c).is_selectable, (oc).is_selectable)
                                    and (working_selected_columns is null or coalesce((c).name, (oc).name) = any(working_selected_columns) or coalesce((c).is_pkey, (oc).is_pkey))
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            )
                        )
                    else '{}'::jsonb
                end
                -- Add "old_record" key for update and delete
                || case
                    when action = 'UPDATE' then
                        jsonb_build_object(
                                'old_record',
                                (
                                    select jsonb_object_agg((c).name, (c).value)
                                    from unnest(old_columns) c
                                    where
                                        (c).is_selectable
                                        and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                        and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                )
                            )
                    when action = 'DELETE' then
                        jsonb_build_object(
                            'old_record',
                            (
                                select jsonb_object_agg((c).name, (c).value)
                                from unnest(old_columns) c
                                where
                                    (c).is_selectable
                                    and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                    and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                            )
                        )
                    else '{}'::jsonb
                end;

                -- Filter visible_role_sub_ids to those matching the current selected_columns group
                visible_to_subscription_ids = coalesce(
                    (
                        select array_agg(s.subscription_id)
                        from unnest(subscriptions) s
                        where s.claims_role = working_role
                          and (s.selected_columns is not distinct from working_selected_columns)
                          and s.subscription_id = any(visible_role_sub_ids)
                    ),
                    '{}'::uuid[]
                );

                return next (
                    output,
                    is_rls_enabled,
                    visible_to_subscription_ids,
                    case
                        when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                        else '{}'
                    end
                )::realtime.wal_rls;
            end loop;

        end if;
    end loop;

    perform set_config('role', null, true);
end;
$$;


ALTER FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


ALTER FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) OWNER TO supabase_admin;

--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


ALTER FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) OWNER TO supabase_admin;

--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


ALTER FUNCTION realtime."cast"(val text, type_ regtype) OWNER TO supabase_admin;

--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
/*
Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
*/
declare
    op_symbol text = (
        case
            when op = 'eq' then '='
            when op = 'neq' then '!='
            when op = 'lt' then '<'
            when op = 'lte' then '<='
            when op = 'gt' then '>'
            when op = 'gte' then '>='
            when op = 'in' then '= any'
            else 'UNKNOWN OP'
        end
    );
    res boolean;
begin
    execute format(
        'select %L::'|| type_::text || ' ' || op_symbol
        || ' ( %L::'
        || (
            case
                when op = 'in' then type_::text || '[]'
                else type_::text end
        )
        || ')', val_1, val_2) into res;
    return res;
end;
$$;


ALTER FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) OWNER TO supabase_admin;

--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
declare
    op_symbol text;
    res boolean;
begin
    -- IS DISTINCT FROM / IS NOT DISTINCT FROM: infix, both sides typed literals
    if op = 'isdistinct' then
        execute format(
            'select %L::%s %s %L::%s',
            val_1,
            type_::text,
            case when negate then 'IS NOT DISTINCT FROM' else 'IS DISTINCT FROM' end,
            val_2,
            type_::text
        ) into res;
        return res;
    end if;

    -- IS requires a keyword RHS (NULL, TRUE, FALSE, UNKNOWN), not a typed literal
    if op = 'is' then
        if val_2 not in ('null', 'true', 'false', 'unknown') then
            raise exception 'invalid value for is filter: must be null, true, false, or unknown';
        end if;
        execute format(
            'select %L::%s %s %s',
            val_1,
            type_::text,
            case when negate then 'IS NOT' else 'IS' end,
            upper(val_2)
        ) into res;
        return res;
    end if;

    op_symbol = case
        when op = 'eq'    then '='
        when op = 'neq'   then '!='
        when op = 'lt'    then '<'
        when op = 'lte'   then '<='
        when op = 'gt'    then '>'
        when op = 'gte'   then '>='
        when op = 'in'    then '= any'
        when op = 'like'   then 'LIKE'
        when op = 'ilike'  then 'ILIKE'
        when op = 'match'  then '~'
        when op = 'imatch' then '~*'
        else null
    end;

    if op_symbol is null then
        raise exception 'unsupported equality operator: %', op::text;
    end if;

    execute format(
        'select %L::%s %s (%L::%s)',
        val_1,
        type_::text,
        op_symbol,
        val_2,
        case when op = 'in' then type_::text || '[]' else type_::text end
    ) into res;

    return case when negate then not res else res end;
end;
$$;


ALTER FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) OWNER TO supabase_admin;

--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
    select
        filters is null
        or array_length(filters, 1) is null
        or coalesce(
            count(col.name) = count(1)
            and sum(
                realtime.check_equality_op(
                    op:=f.op,
                    type_:=coalesce(col.type_oid::regtype, col.type_name::regtype),
                    val_1:=col.value #>> '{}',
                    val_2:=f.value,
                    negate:=coalesce(f.negate, false)
                )::int
            ) filter (where col.name is not null) = count(col.name),
            false
        )
    from
        unnest(filters) f
        left join unnest(columns) col
            on f.column_name = col.name;
$$;


ALTER FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) OWNER TO supabase_admin;

--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS TABLE(wal jsonb, is_rls_enabled boolean, subscription_ids uuid[], errors text[], slot_changes_count bigint)
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
  WITH pub AS (
    SELECT
      concat_ws(
        ',',
        CASE WHEN bool_or(pubinsert) THEN 'insert' ELSE NULL END,
        CASE WHEN bool_or(pubupdate) THEN 'update' ELSE NULL END,
        CASE WHEN bool_or(pubdelete) THEN 'delete' ELSE NULL END
      ) AS w2j_actions,
      coalesce(
        string_agg(
          realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
          ','
        ) filter (WHERE ppt.tablename IS NOT NULL),
        ''
      ) AS w2j_add_tables
    FROM pg_publication pp
    LEFT JOIN pg_publication_tables ppt ON pp.pubname = ppt.pubname
    WHERE pp.pubname = publication
    GROUP BY pp.pubname
    LIMIT 1
  ),
  -- MATERIALIZED ensures pg_logical_slot_get_changes is called exactly once
  w2j AS MATERIALIZED (
    SELECT x.*, pub.w2j_add_tables
    FROM pub,
         pg_logical_slot_get_changes(
           slot_name, null, max_changes,
           'include-pk', 'true',
           'include-transaction', 'false',
           'include-timestamp', 'true',
           'include-type-oids', 'true',
           'format-version', '2',
           'actions', pub.w2j_actions,
           'add-tables', pub.w2j_add_tables
         ) x
  ),
  slot_count AS (
    SELECT count(*)::bigint AS cnt
    FROM w2j
    WHERE w2j.w2j_add_tables <> ''
  ),
  rls_filtered AS (
    SELECT xyz.wal, xyz.is_rls_enabled, xyz.subscription_ids, xyz.errors
    FROM w2j,
         realtime.apply_rls(
           wal := w2j.data::jsonb,
           max_record_bytes := max_record_bytes
         ) xyz(wal, is_rls_enabled, subscription_ids, errors)
    WHERE w2j.w2j_add_tables <> ''
      AND xyz.subscription_ids[1] IS NOT NULL
  )
  SELECT rf.wal, rf.is_rls_enabled, rf.subscription_ids, rf.errors, sc.cnt
  FROM rls_filtered rf, slot_count sc

  UNION ALL

  SELECT null, null, null, null, sc.cnt
  FROM slot_count sc
  WHERE NOT EXISTS (SELECT 1 FROM rls_filtered)
$$;


ALTER FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  SELECT
    realtime.wal2json_escape_identifier(nsp.nspname::text)
    || '.'
    || realtime.wal2json_escape_identifier(pc.relname::text)
  FROM pg_class pc
  JOIN pg_namespace nsp ON pc.relnamespace = nsp.oid
  WHERE pc.oid = entity
$$;


ALTER FUNCTION realtime.quote_wal2json(entity regclass) OWNER TO supabase_admin;

--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) OWNER TO supabase_admin;

--
-- Name: send_binary(bytea, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.send_binary(payload bytea, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, binary_payload, event, topic, private, extension)
    VALUES (generated_id, payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION realtime.send_binary(payload bytea, event text, topic text, private boolean) OWNER TO supabase_admin;

--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
    col_names text[] = coalesce(
            array_agg(a.attname order by a.attnum),
            '{}'::text[]
        )
        from
            pg_catalog.pg_attribute a
        where
            a.attrelid = new.entity
            and a.attnum > 0
            and not a.attisdropped
            and pg_catalog.has_column_privilege(
                (new.claims ->> 'role'),
                a.attrelid,
                a.attnum,
                'SELECT'
            );
    filter realtime.user_defined_filter;
    col_type regtype;
    in_val jsonb;
    selected_col text;
begin
    for filter in select * from unnest(new.filters) loop
        if not filter.column_name = any(col_names) then
            raise exception 'invalid column for filter %', filter.column_name;
        end if;

        col_type = (
            select atttypid::regtype
            from pg_catalog.pg_attribute
            where attrelid = new.entity
                  and attname = filter.column_name
        );
        if col_type is null then
            raise exception 'failed to lookup type for column %', filter.column_name;
        end if;

        if filter.op = 'in'::realtime.equality_op then
            in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
            if coalesce(jsonb_array_length(in_val), 0) > 100 then
                raise exception 'too many values for `in` filter. Maximum 100';
            end if;
        elsif filter.op = 'is'::realtime.equality_op then
            -- `is` requires a keyword RHS rather than a typed literal
            if filter.value not in ('null', 'true', 'false', 'unknown') then
                raise exception 'invalid value for is filter: must be null, true, false, or unknown';
            end if;
            -- IS NULL works for any type, but IS TRUE/FALSE/UNKNOWN require a boolean
            -- operand. Reject the non-null keywords on non-boolean columns here so they
            -- don't abort apply_rls at WAL time.
            if filter.value <> 'null' and col_type <> 'boolean'::regtype then
                raise exception 'is % filter requires a boolean column, got %', filter.value, col_type::text;
            end if;
        elsif filter.op in ('like'::realtime.equality_op, 'ilike'::realtime.equality_op) then
            -- like/ilike apply the text pattern operator (~~); reject column types that
            -- have no such operator instead of failing at WAL time
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = '~~' and oprleft = col_type
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
        elsif filter.op in ('match'::realtime.equality_op, 'imatch'::realtime.equality_op) then
            -- match/imatch apply the regex operators ~ / ~*; reject column types that have
            -- no such operator (e.g. integer) instead of failing at WAL time, mirroring the
            -- like/ilike guard above.
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = case when filter.op = 'imatch'::realtime.equality_op then '~*' else '~' end
                  and oprleft = col_type
                  and oprright = col_type
                  and oprresult = 'boolean'::regtype
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
            -- validate the regex eagerly so a bad pattern is rejected here, not inside
            -- apply_rls where it would abort the WAL stream for the entity
            begin
                perform '' ~ filter.value;
            exception when others then
                raise exception 'invalid regular expression for % filter: %', filter.op::text, sqlerrm;
            end;
        else
            -- eq/neq/lt/lte/gt/gte: value must be coercable to the type
            perform realtime.cast(filter.value, col_type);
        end if;
    end loop;

    if new.selected_columns is not null then
        for selected_col in select * from unnest(new.selected_columns) loop
            if not selected_col = any(col_names) then
                raise exception 'invalid column for select %', selected_col;
            end if;
        end loop;
    end if;

    -- Apply consistent order to filters so the unique constraint can't be tricked by a
    -- different filter order. negate is part of the sort key.
    new.filters = coalesce(
        array_agg(f order by f.column_name, f.op, f.value, f.negate),
        '{}'
    ) from unnest(new.filters) f;

    new.selected_columns = (
        select array_agg(c order by c)
        from unnest(new.selected_columns) c
    );

    return new;
end;
$$;


ALTER FUNCTION realtime.subscription_check_filters() OWNER TO supabase_admin;

--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


ALTER FUNCTION realtime.to_regrole(role_name text) OWNER TO supabase_admin;

--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


ALTER FUNCTION realtime.topic() OWNER TO supabase_realtime_admin;

--
-- Name: wal2json_escape_identifier(text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.wal2json_escape_identifier(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  -- Prefix `\`, `,`, `.`, and any whitespace with `\`
  SELECT regexp_replace(name, '([\\,.[:space:]])', '\\\1', 'g')
$$;


ALTER FUNCTION realtime.wal2json_escape_identifier(name text) OWNER TO supabase_admin;

--
-- Name: allow_any_operation(text[]); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.allow_any_operation(expected_operations text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


ALTER FUNCTION storage.allow_any_operation(expected_operations text[]) OWNER TO supabase_storage_admin;

--
-- Name: allow_only_operation(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.allow_only_operation(expected_operation text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


ALTER FUNCTION storage.allow_only_operation(expected_operation text) OWNER TO supabase_storage_admin;

--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) OWNER TO supabase_storage_admin;

--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION storage.enforce_bucket_name_length() OWNER TO supabase_storage_admin;

--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION storage.extension(name text) OWNER TO supabase_storage_admin;

--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION storage.filename(name text) OWNER TO supabase_storage_admin;

--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION storage.foldername(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


ALTER FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) OWNER TO supabase_storage_admin;

--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION storage.get_size_by_bucket() OWNER TO supabase_storage_admin;

--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text) OWNER TO supabase_storage_admin;

--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text) OWNER TO supabase_storage_admin;

--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION storage.operation() OWNER TO supabase_storage_admin;

--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION storage.protect_delete() OWNER TO supabase_storage_admin;

--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


ALTER FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


ALTER FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION storage.update_updated_at_column() OWNER TO supabase_storage_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE auth.audit_log_entries OWNER TO supabase_auth_admin;

--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_claims_allowlist text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


ALTER TABLE auth.custom_oauth_providers OWNER TO supabase_auth_admin;

--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


ALTER TABLE auth.flow_state OWNER TO supabase_auth_admin;

--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE auth.identities OWNER TO supabase_auth_admin;

--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE auth.instances OWNER TO supabase_auth_admin;

--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE auth.mfa_amr_claims OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


ALTER TABLE auth.mfa_challenges OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


ALTER TABLE auth.mfa_factors OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


ALTER TABLE auth.oauth_authorizations OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE auth.oauth_client_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


ALTER TABLE auth.oauth_clients OWNER TO supabase_auth_admin;

--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


ALTER TABLE auth.oauth_consents OWNER TO supabase_auth_admin;

--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


ALTER TABLE auth.one_time_tokens OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;

--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;

--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


ALTER TABLE auth.users OWNER TO supabase_auth_admin;

--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


ALTER TABLE auth.webauthn_challenges OWNER TO supabase_auth_admin;

--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


ALTER TABLE auth.webauthn_credentials OWNER TO supabase_auth_admin;

--
-- Name: access_review_decisions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.access_review_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    review_item_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    decision text NOT NULL,
    rationale text,
    decided_at timestamp with time zone DEFAULT now() NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid GENERATED ALWAYS AS (reviewer_id) STORED,
    created_at timestamp with time zone GENERATED ALWAYS AS (decided_at) STORED,
    CONSTRAINT access_review_decisions_decision_check CHECK ((decision = ANY (ARRAY['approved'::text, 'revoked'::text, 'flagged'::text])))
);

ALTER TABLE ONLY public.access_review_decisions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.access_review_decisions OWNER TO postgres;

--
-- Name: access_review_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.access_review_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    access_review_id uuid NOT NULL,
    principal_ref text NOT NULL,
    resource_ref text NOT NULL,
    entitlement_ref text NOT NULL,
    risk_level text DEFAULT 'low'::text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT access_review_items_risk_level_check CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);

ALTER TABLE ONLY public.access_review_items FORCE ROW LEVEL SECURITY;


ALTER TABLE public.access_review_items OWNER TO postgres;

--
-- Name: access_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.access_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    population_source text NOT NULL,
    certifier_id uuid NOT NULL,
    decisions jsonb DEFAULT '[]'::jsonb NOT NULL,
    remediation_task_ids text[] DEFAULT '{}'::text[] NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.access_reviews FORCE ROW LEVEL SECURITY;


ALTER TABLE public.access_reviews OWNER TO postgres;

--
-- Name: ai_evaluation_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_evaluation_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    score numeric NOT NULL,
    passed boolean NOT NULL,
    adversarial_passed boolean NOT NULL,
    tenant_isolation_passed boolean NOT NULL,
    drift_within_threshold boolean NOT NULL,
    evaluation_report jsonb DEFAULT '{}'::jsonb NOT NULL,
    approved_by uuid NOT NULL,
    approved_at timestamp with time zone NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    suite_id uuid,
    CONSTRAINT ai_evaluation_runs_target_type_check CHECK ((target_type = ANY (ARRAY['prompt'::text, 'model'::text, 'retrieval_policy'::text])))
);

ALTER TABLE ONLY public.ai_evaluation_runs FORCE ROW LEVEL SECURITY;


ALTER TABLE public.ai_evaluation_runs OWNER TO postgres;

--
-- Name: ai_generation_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_generation_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    use_case text NOT NULL,
    status public.ai_generation_status NOT NULL,
    actor_id uuid NOT NULL,
    prompt_version_id uuid NOT NULL,
    model_deployment_id uuid NOT NULL,
    retrieval_index_id uuid NOT NULL,
    generation_parameters jsonb NOT NULL,
    input_fingerprint text NOT NULL,
    output_fingerprint text NOT NULL,
    failure_reason text,
    provenance jsonb DEFAULT '{}'::jsonb NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.ai_generation_runs FORCE ROW LEVEL SECURITY;


ALTER TABLE public.ai_generation_runs OWNER TO postgres;

--
-- Name: ai_model_deployments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_model_deployments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    provider text NOT NULL,
    model_name text NOT NULL,
    deployment_version text NOT NULL,
    region text NOT NULL,
    risk_tier text NOT NULL,
    no_training boolean NOT NULL,
    egress_allow_list text[] DEFAULT '{}'::text[] NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    kill_switch boolean DEFAULT false NOT NULL,
    evaluation_id uuid,
    approved_by uuid,
    approved_at timestamp with time zone,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_model_deployments_risk_tier_check CHECK ((risk_tier = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT ai_model_deployments_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'approved'::text, 'retired'::text])))
);

ALTER TABLE ONLY public.ai_model_deployments FORCE ROW LEVEL SECURITY;


ALTER TABLE public.ai_model_deployments OWNER TO postgres;

--
-- Name: ai_output_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_output_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    generation_run_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    decision text NOT NULL,
    rationale text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_output_reviews_decision_check CHECK ((decision = ANY (ARRAY['approved'::text, 'rejected'::text, 'needs_changes'::text])))
);

ALTER TABLE ONLY public.ai_output_reviews FORCE ROW LEVEL SECURITY;


ALTER TABLE public.ai_output_reviews OWNER TO postgres;

--
-- Name: ai_prompt_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_prompt_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    prompt_key text NOT NULL,
    prompt_version text NOT NULL,
    template_sha256 text NOT NULL,
    parameters_schema jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    evaluation_id uuid,
    approved_by uuid,
    approved_at timestamp with time zone,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_prompt_versions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'approved'::text, 'retired'::text])))
);

ALTER TABLE ONLY public.ai_prompt_versions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.ai_prompt_versions OWNER TO postgres;

--
-- Name: ai_publication_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_publication_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    generation_run_id uuid,
    approved_version_id uuid NOT NULL,
    approver_id uuid NOT NULL,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid GENERATED ALWAYS AS (approver_id) STORED,
    created_at timestamp with time zone GENERATED ALWAYS AS (published_at) STORED,
    CONSTRAINT ai_publication_events_target_type_check CHECK ((target_type = ANY (ARRAY['ai_question_version'::text, 'prompt_version'::text, 'model_deployment'::text])))
);

ALTER TABLE ONLY public.ai_publication_events FORCE ROW LEVEL SECURITY;


ALTER TABLE public.ai_publication_events OWNER TO postgres;

--
-- Name: ai_question_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_question_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    generation_run_id uuid NOT NULL,
    question_version text NOT NULL,
    question_text text NOT NULL,
    response_type text NOT NULL,
    evidence_expectations jsonb DEFAULT '[]'::jsonb NOT NULL,
    citations jsonb DEFAULT '[]'::jsonb NOT NULL,
    confidence numeric NOT NULL,
    state public.ai_review_state DEFAULT 'pending_review'::public.ai_review_state NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_question_versions_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT ai_question_versions_response_type_check CHECK ((response_type = ANY (ARRAY['boolean'::text, 'text'::text, 'maturity'::text, 'multi_select'::text])))
);

ALTER TABLE ONLY public.ai_question_versions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.ai_question_versions OWNER TO postgres;

--
-- Name: ai_retrieval_indexes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_retrieval_indexes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    index_key text NOT NULL,
    index_version text NOT NULL,
    source_pack_versions jsonb DEFAULT '[]'::jsonb NOT NULL,
    acl_tenant_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_retrieval_indexes_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'approved'::text, 'retired'::text])))
);

ALTER TABLE ONLY public.ai_retrieval_indexes FORCE ROW LEVEL SECURITY;


ALTER TABLE public.ai_retrieval_indexes OWNER TO postgres;

--
-- Name: answer_revisions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.answer_revisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    assessment_item_id uuid NOT NULL,
    revision integer NOT NULL,
    response_json jsonb NOT NULL,
    submitted_by uuid NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    supersedes_id uuid,
    created_by uuid GENERATED ALWAYS AS (submitted_by) STORED,
    created_at timestamp with time zone GENERATED ALWAYS AS (submitted_at) STORED,
    CONSTRAINT answer_revisions_revision_check CHECK ((revision > 0))
);

ALTER TABLE ONLY public.answer_revisions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.answer_revisions OWNER TO postgres;

--
-- Name: applicability_decisions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.applicability_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    control_instance_id uuid NOT NULL,
    decision text NOT NULL,
    rationale text NOT NULL,
    decided_by uuid NOT NULL,
    approved_by uuid,
    decided_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid GENERATED ALWAYS AS (decided_by) STORED,
    created_at timestamp with time zone GENERATED ALWAYS AS (decided_at) STORED,
    CONSTRAINT applicability_decisions_check CHECK (((approved_by IS NULL) OR (approved_by <> decided_by))),
    CONSTRAINT applicability_decisions_decision_check CHECK ((decision = ANY (ARRAY['applicable'::text, 'not_applicable'::text]))),
    CONSTRAINT applicability_decisions_rationale_check CHECK ((length(TRIM(BOTH FROM rationale)) > 0))
);

ALTER TABLE ONLY public.applicability_decisions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.applicability_decisions OWNER TO postgres;

--
-- Name: assessment_frameworks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assessment_frameworks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    assessment_id uuid NOT NULL,
    framework_key text NOT NULL,
    framework_version text NOT NULL,
    mapping_version text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.assessment_frameworks FORCE ROW LEVEL SECURITY;


ALTER TABLE public.assessment_frameworks OWNER TO postgres;

--
-- Name: assessment_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assessment_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    assessment_id uuid NOT NULL,
    framework_key text NOT NULL,
    framework_version text NOT NULL,
    mapping_version text NOT NULL,
    control_id text NOT NULL,
    harmonized_control_id text NOT NULL,
    question_version text NOT NULL,
    status public.assessment_status DEFAULT 'not_started'::public.assessment_status NOT NULL,
    owner_id uuid NOT NULL,
    answer_text text,
    applicability jsonb,
    evidence_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    control_instance_id uuid NOT NULL,
    sequence_no integer,
    required boolean DEFAULT true NOT NULL,
    question_version_id uuid NOT NULL
);

ALTER TABLE ONLY public.assessment_items FORCE ROW LEVEL SECURITY;


ALTER TABLE public.assessment_items OWNER TO postgres;

--
-- Name: COLUMN assessment_items.answer_text; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_items.answer_text IS 'DEPRECATED (G-01 Cutover): superseded by answer_revisions (latest revision = current). Still dual-written by insertItem/updateItem for rollback safety; no longer read as primary — see itemsSelectWithNormalizedFallback() in postgres-assessment.repository.ts. Column removal deferred to a future Contract-stage migration once a real deployment has run Cutover through a monitoring window; not dropped here for lack of that window in this environment.';


--
-- Name: COLUMN assessment_items.applicability; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_items.applicability IS 'DEPRECATED (G-01 Cutover): superseded by applicability_decisions (latest decision by decided_at = current), scoped via control_instance_id. Still dual-written by insertItem/updateItem for rollback safety; no longer read as primary. Column removal deferred — see the comment on assessment_items.answer_text for the full reasoning, which applies identically here.';


--
-- Name: COLUMN assessment_items.evidence_ids; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_items.evidence_ids IS 'DEPRECATED (G-01 Cutover): superseded by answer_revisions.response_json->''evidenceIds'' (latest revision = current). Still dual-written by insertItem/updateItem for rollback safety; no longer read as primary. Column removal deferred — see the comment on assessment_items.answer_text for the full reasoning, which applies identically here.';


--
-- Name: assessment_scopes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assessment_scopes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    workspace_id uuid,
    name text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    scope_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    approved_by uuid NOT NULL,
    approved_at timestamp with time zone DEFAULT now() NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT assessment_scopes_check CHECK ((period_end >= period_start)),
    CONSTRAINT assessment_scopes_name_check CHECK ((length(TRIM(BOTH FROM name)) > 0))
);

ALTER TABLE ONLY public.assessment_scopes FORCE ROW LEVEL SECURITY;


ALTER TABLE public.assessment_scopes OWNER TO postgres;

--
-- Name: assessment_signoffs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assessment_signoffs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    assessment_id uuid NOT NULL,
    scope_type text NOT NULL,
    scope_id uuid NOT NULL,
    signer_id uuid NOT NULL,
    decision text NOT NULL,
    signed_at timestamp with time zone DEFAULT now() NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT assessment_signoffs_decision_check CHECK ((decision = ANY (ARRAY['approved'::text, 'rejected'::text]))),
    CONSTRAINT assessment_signoffs_scope_type_check CHECK ((scope_type = ANY (ARRAY['section'::text, 'final'::text])))
);

ALTER TABLE ONLY public.assessment_signoffs FORCE ROW LEVEL SECURITY;


ALTER TABLE public.assessment_signoffs OWNER TO postgres;

--
-- Name: assessment_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assessment_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    assessment_id uuid NOT NULL,
    snapshot_type text NOT NULL,
    sequence integer NOT NULL,
    content_hash text NOT NULL,
    snapshot_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT assessment_snapshots_sequence_check CHECK ((sequence > 0)),
    CONSTRAINT assessment_snapshots_snapshot_type_check CHECK ((length(TRIM(BOTH FROM snapshot_type)) > 0))
);

ALTER TABLE ONLY public.assessment_snapshots FORCE ROW LEVEL SECURITY;


ALTER TABLE public.assessment_snapshots OWNER TO postgres;

--
-- Name: assessments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    scope_name text NOT NULL,
    status public.assessment_status DEFAULT 'not_started'::public.assessment_status NOT NULL,
    control_snapshot_version text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    scope_id uuid
);

ALTER TABLE ONLY public.assessments FORCE ROW LEVEL SECURITY;


ALTER TABLE public.assessments OWNER TO postgres;

--
-- Name: assurance_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assurance_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    source_type text NOT NULL,
    source_id uuid NOT NULL,
    severity text NOT NULL,
    owner_id uuid NOT NULL,
    sla_due_at timestamp with time zone NOT NULL,
    status text DEFAULT 'triaged'::text NOT NULL,
    reason text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT assurance_alerts_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT assurance_alerts_source_type_check CHECK ((source_type = ANY (ARRAY['control_test'::text, 'connector_health'::text, 'evidence_freshness'::text]))),
    CONSTRAINT assurance_alerts_status_check CHECK ((status = ANY (ARRAY['open'::text, 'triaged'::text, 'resolved'::text])))
);

ALTER TABLE ONLY public.assurance_alerts FORCE ROW LEVEL SECURITY;


ALTER TABLE public.assurance_alerts OWNER TO postgres;

--
-- Name: audit_checkpoints; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_checkpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    chain_partition uuid NOT NULL,
    start_sequence bigint NOT NULL,
    end_sequence bigint NOT NULL,
    root_hash text NOT NULL,
    signature text NOT NULL,
    signed_at timestamp with time zone DEFAULT now() NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_checkpoints_check CHECK ((start_sequence <= end_sequence))
);

ALTER TABLE ONLY public.audit_checkpoints FORCE ROW LEVEL SECURITY;


ALTER TABLE public.audit_checkpoints OWNER TO postgres;

--
-- Name: audit_engagements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_engagements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    name text NOT NULL,
    status text NOT NULL,
    request_list_ids text[] DEFAULT '{}'::text[] NOT NULL,
    evidence_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    finding_ids text[] DEFAULT '{}'::text[] NOT NULL,
    management_responses jsonb DEFAULT '[]'::jsonb NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_engagements_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'fieldwork'::text, 'management_response'::text, 'closed'::text])))
);

ALTER TABLE ONLY public.audit_engagements FORCE ROW LEVEL SECURITY;


ALTER TABLE public.audit_engagements OWNER TO postgres;

--
-- Name: audit_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    sequence bigint NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    event_type text NOT NULL,
    actor_id uuid NOT NULL,
    target_type text NOT NULL,
    target_id text NOT NULL,
    trace_id text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    body jsonb NOT NULL,
    previous_hash text NOT NULL,
    event_hash text NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid GENERATED ALWAYS AS (actor_id) STORED,
    created_at timestamp with time zone GENERATED ALWAYS AS (occurred_at) STORED,
    chain_partition uuid GENERATED ALWAYS AS (tenant_id) STORED
);

ALTER TABLE ONLY public.audit_events FORCE ROW LEVEL SECURITY;


ALTER TABLE public.audit_events OWNER TO postgres;

--
-- Name: audit_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    audit_engagement_id uuid NOT NULL,
    control_id text,
    requested_from text NOT NULL,
    due_at timestamp with time zone NOT NULL,
    status text DEFAULT 'requested'::text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_requests_status_check CHECK ((status = ANY (ARRAY['requested'::text, 'submitted'::text, 'accepted'::text, 'rejected'::text])))
);

ALTER TABLE ONLY public.audit_requests FORCE ROW LEVEL SECURITY;


ALTER TABLE public.audit_requests OWNER TO postgres;

--
-- Name: audit_tests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    audit_engagement_id uuid NOT NULL,
    control_instance_id uuid,
    procedure text NOT NULL,
    sample_ref text,
    conclusion text DEFAULT 'not_tested'::text NOT NULL,
    reviewer_id uuid,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_tests_conclusion_check CHECK ((conclusion = ANY (ARRAY['effective'::text, 'ineffective'::text, 'not_tested'::text])))
);

ALTER TABLE ONLY public.audit_tests FORCE ROW LEVEL SECURITY;


ALTER TABLE public.audit_tests OWNER TO postgres;

--
-- Name: audit_verifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    checkpoint_id uuid NOT NULL,
    verified_at timestamp with time zone DEFAULT now() NOT NULL,
    result text NOT NULL,
    mismatch_sequence bigint,
    verifier_version text NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_verifications_check CHECK (((result = 'fail'::text) OR (mismatch_sequence IS NULL))),
    CONSTRAINT audit_verifications_result_check CHECK ((result = ANY (ARRAY['pass'::text, 'fail'::text])))
);

ALTER TABLE ONLY public.audit_verifications FORCE ROW LEVEL SECURITY;


ALTER TABLE public.audit_verifications OWNER TO postgres;

--
-- Name: authorization_decision_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.authorization_decision_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    actor_id uuid NOT NULL,
    resource_type text NOT NULL,
    resource_id text NOT NULL,
    action text NOT NULL,
    decision text NOT NULL,
    reason text NOT NULL,
    trace_id text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT authorization_decision_logs_decision_check CHECK ((decision = ANY (ARRAY['allow'::text, 'deny'::text])))
);

ALTER TABLE ONLY public.authorization_decision_logs FORCE ROW LEVEL SECURITY;


ALTER TABLE public.authorization_decision_logs OWNER TO postgres;

--
-- Name: automated_control_tests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.automated_control_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    connector_id uuid NOT NULL,
    control_ref text NOT NULL,
    query text NOT NULL,
    population jsonb NOT NULL,
    sample jsonb NOT NULL,
    result jsonb NOT NULL,
    source_timestamp timestamp with time zone NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.automated_control_tests FORCE ROW LEVEL SECURITY;


ALTER TABLE public.automated_control_tests OWNER TO postgres;

--
-- Name: automated_test_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.automated_test_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    automated_test_id uuid NOT NULL,
    connector_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    status text DEFAULT 'running'::text NOT NULL,
    result_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_watermark text,
    idempotency_key text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT automated_test_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'succeeded'::text, 'failed'::text])))
);

ALTER TABLE ONLY public.automated_test_runs FORCE ROW LEVEL SECURITY;


ALTER TABLE public.automated_test_runs OWNER TO postgres;

--
-- Name: automated_tests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.automated_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    control_id uuid NOT NULL,
    connector_type text NOT NULL,
    query_template text NOT NULL,
    schedule text NOT NULL,
    severity text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT automated_tests_connector_type_check CHECK ((length(TRIM(BOTH FROM connector_type)) > 0)),
    CONSTRAINT automated_tests_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);

ALTER TABLE ONLY public.automated_tests FORCE ROW LEVEL SECURITY;


ALTER TABLE public.automated_tests OWNER TO postgres;

--
-- Name: backup_restore_tests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.backup_restore_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    rpo_minutes integer NOT NULL,
    rto_hours numeric NOT NULL,
    backup_credential_ref text NOT NULL,
    restored_at timestamp with time zone NOT NULL,
    passed boolean NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.backup_restore_tests FORCE ROW LEVEL SECURITY;


ALTER TABLE public.backup_restore_tests OWNER TO postgres;

--
-- Name: connector_objects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.connector_objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    connector_id uuid NOT NULL,
    object_type text NOT NULL,
    external_id text NOT NULL,
    source_hash text NOT NULL,
    provenance jsonb NOT NULL,
    delivery_status text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT connector_objects_delivery_status_check CHECK ((delivery_status = ANY (ARRAY['pending'::text, 'delivered'::text, 'failed'::text, 'dead_lettered'::text])))
);

ALTER TABLE ONLY public.connector_objects FORCE ROW LEVEL SECURITY;


ALTER TABLE public.connector_objects OWNER TO postgres;

--
-- Name: connector_sync_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.connector_sync_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    connector_id uuid NOT NULL,
    status text NOT NULL,
    cursor_before text,
    cursor_after text,
    started_at timestamp with time zone NOT NULL,
    finished_at timestamp with time zone,
    object_counts jsonb DEFAULT '{}'::jsonb NOT NULL,
    error text,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT connector_sync_runs_status_check CHECK ((status = ANY (ARRAY['started'::text, 'succeeded'::text, 'failed'::text])))
);

ALTER TABLE ONLY public.connector_sync_runs FORCE ROW LEVEL SECURITY;


ALTER TABLE public.connector_sync_runs OWNER TO postgres;

--
-- Name: connectors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.connectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    connector_key text NOT NULL,
    provider text NOT NULL,
    kind text NOT NULL,
    scopes jsonb DEFAULT '[]'::jsonb NOT NULL,
    secret_ref text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    health text DEFAULT 'healthy'::text NOT NULL,
    sync_cursor text,
    last_seen_at timestamp with time zone,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT connectors_health_check CHECK ((health = ANY (ARRAY['healthy'::text, 'degraded'::text, 'failing'::text]))),
    CONSTRAINT connectors_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'disabled'::text])))
);

ALTER TABLE ONLY public.connectors FORCE ROW LEVEL SECURITY;


ALTER TABLE public.connectors OWNER TO postgres;

--
-- Name: consent_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consent_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    subject_token text NOT NULL,
    consent_purpose_id uuid NOT NULL,
    event_type text NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    source text NOT NULL,
    proof_hash text NOT NULL,
    idempotency_key text NOT NULL,
    recorded_by uuid NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid GENERATED ALWAYS AS (recorded_by) STORED,
    created_at timestamp with time zone GENERATED ALWAYS AS (recorded_at) STORED,
    CONSTRAINT consent_events_event_type_check CHECK ((event_type = ANY (ARRAY['granted'::text, 'withdrawn'::text, 'updated'::text])))
);

ALTER TABLE ONLY public.consent_events FORCE ROW LEVEL SECURITY;


ALTER TABLE public.consent_events OWNER TO postgres;

--
-- Name: consent_purposes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consent_purposes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    purpose_id uuid NOT NULL,
    notice_version_id uuid NOT NULL,
    channel text NOT NULL,
    region text NOT NULL,
    active_from timestamp with time zone DEFAULT now() NOT NULL,
    active_to timestamp with time zone,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.consent_purposes FORCE ROW LEVEL SECURITY;


ALTER TABLE public.consent_purposes OWNER TO postgres;

--
-- Name: consent_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consent_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    subject_id text NOT NULL,
    purpose text NOT NULL,
    notice_version text NOT NULL,
    region text NOT NULL,
    status text NOT NULL,
    history jsonb DEFAULT '[]'::jsonb NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT consent_records_status_check CHECK ((status = ANY (ARRAY['active'::text, 'withdrawn'::text])))
);

ALTER TABLE ONLY public.consent_records FORCE ROW LEVEL SECURITY;


ALTER TABLE public.consent_records OWNER TO postgres;

--
-- Name: content_rejected_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.content_rejected_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    source_workbook text NOT NULL,
    source_sheet text NOT NULL,
    source_row_number integer NOT NULL,
    reason text NOT NULL,
    remediation_status text DEFAULT 'open'::text NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.content_rejected_records FORCE ROW LEVEL SECURITY;


ALTER TABLE public.content_rejected_records OWNER TO postgres;

--
-- Name: content_source_packages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.content_source_packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    source_file_name text NOT NULL,
    source_sha256 text NOT NULL,
    storage_uri text,
    status public.content_pack_status DEFAULT 'quarantined'::public.content_pack_status NOT NULL,
    diagnostic_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.content_source_packages FORCE ROW LEVEL SECURITY;


ALTER TABLE public.content_source_packages OWNER TO postgres;

--
-- Name: control_instances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.control_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    assessment_id uuid NOT NULL,
    control_id text NOT NULL,
    framework_key text NOT NULL,
    framework_version text NOT NULL,
    mapping_version text NOT NULL,
    owner_id uuid NOT NULL,
    applicability_status text DEFAULT 'pending'::text NOT NULL,
    status public.assessment_status DEFAULT 'not_started'::public.assessment_status NOT NULL,
    score numeric,
    maturity text,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT control_instances_applicability_status_check CHECK ((applicability_status = ANY (ARRAY['pending'::text, 'applicable'::text, 'not_applicable'::text])))
);

ALTER TABLE ONLY public.control_instances FORCE ROW LEVEL SECURITY;


ALTER TABLE public.control_instances OWNER TO postgres;

--
-- Name: control_mappings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.control_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    framework_key text NOT NULL,
    source_control_id text NOT NULL,
    harmonized_control_id text NOT NULL,
    mapping_classification public.mapping_classification NOT NULL,
    coverage text,
    confidence text,
    rationale text,
    reviewer text,
    source_workbook text NOT NULL,
    source_sheet text NOT NULL,
    source_row_number integer NOT NULL,
    status public.content_pack_status DEFAULT 'staged'::public.content_pack_status NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    owner_scope public.catalog_owner_scope DEFAULT 'tenant'::public.catalog_owner_scope NOT NULL,
    mapping_version_id uuid,
    CONSTRAINT chk_mapping_version_id_not_null CHECK ((mapping_version_id IS NOT NULL))
);

ALTER TABLE ONLY public.control_mappings FORCE ROW LEVEL SECURITY;


ALTER TABLE public.control_mappings OWNER TO postgres;

--
-- Name: control_sets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.control_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    framework_version_id uuid NOT NULL,
    set_key text NOT NULL,
    name text NOT NULL,
    owner_scope public.catalog_owner_scope DEFAULT 'tenant'::public.catalog_owner_scope NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.control_sets FORCE ROW LEVEL SECURITY;


ALTER TABLE public.control_sets OWNER TO postgres;

--
-- Name: control_subcontrols; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.control_subcontrols (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    control_id uuid NOT NULL,
    subcontrol_key text NOT NULL,
    title text NOT NULL,
    requirement_text text,
    citation text,
    source_workbook text,
    source_sheet text,
    source_row_number integer,
    owner_scope public.catalog_owner_scope DEFAULT 'tenant'::public.catalog_owner_scope NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.control_subcontrols FORCE ROW LEVEL SECURITY;


ALTER TABLE public.control_subcontrols OWNER TO postgres;

--
-- Name: control_test_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.control_test_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    control_instance_id uuid NOT NULL,
    test_procedure_id uuid NOT NULL,
    run_id uuid DEFAULT gen_random_uuid() NOT NULL,
    population text,
    sample_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    result text NOT NULL,
    tested_by uuid NOT NULL,
    tested_at timestamp with time zone DEFAULT now() NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT control_test_results_result_check CHECK ((result = ANY (ARRAY['pass'::text, 'fail'::text, 'not_tested'::text])))
);

ALTER TABLE ONLY public.control_test_results FORCE ROW LEVEL SECURITY;


ALTER TABLE public.control_test_results OWNER TO postgres;

--
-- Name: controls; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.controls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    control_set_id uuid NOT NULL,
    control_key text NOT NULL,
    title text NOT NULL,
    category text,
    requirement_text text,
    citation text,
    source_workbook text,
    source_sheet text,
    source_row_number integer,
    owner_scope public.catalog_owner_scope DEFAULT 'tenant'::public.catalog_owner_scope NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.controls FORCE ROW LEVEL SECURITY;


ALTER TABLE public.controls OWNER TO postgres;

--
-- Name: custom_field_definitions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_field_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    object_definition_id uuid NOT NULL,
    field_key text NOT NULL,
    data_type text NOT NULL,
    required boolean DEFAULT false NOT NULL,
    validation_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_field_definitions_data_type_check CHECK ((data_type = ANY (ARRAY['text'::text, 'number'::text, 'boolean'::text, 'date'::text, 'datetime'::text, 'uuid'::text, 'json'::text, 'enum'::text])))
);

ALTER TABLE ONLY public.custom_field_definitions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.custom_field_definitions OWNER TO postgres;

--
-- Name: custom_object_definitions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_object_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    object_key text NOT NULL,
    fields jsonb DEFAULT '[]'::jsonb NOT NULL,
    workflow_states text[] DEFAULT '{}'::text[] NOT NULL,
    permission_role_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    upgrade_safe boolean DEFAULT true NOT NULL,
    connector_sdk_enabled boolean DEFAULT false NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    validation_schema jsonb,
    CONSTRAINT custom_object_definitions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'deprecated'::text])))
);

ALTER TABLE ONLY public.custom_object_definitions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.custom_object_definitions OWNER TO postgres;

--
-- Name: custom_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    object_definition_id uuid NOT NULL,
    record_key text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_records_status_check CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text])))
);

ALTER TABLE ONLY public.custom_records FORCE ROW LEVEL SECURITY;


ALTER TABLE public.custom_records OWNER TO postgres;

--
-- Name: custom_values; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    record_id uuid NOT NULL,
    field_definition_id uuid NOT NULL,
    value_json jsonb,
    search_text text,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.custom_values FORCE ROW LEVEL SECURITY;


ALTER TABLE public.custom_values OWNER TO postgres;

--
-- Name: data_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    category_key text NOT NULL,
    name text NOT NULL,
    sensitivity text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT data_categories_sensitivity_check CHECK ((sensitivity = ANY (ARRAY['low'::text, 'moderate'::text, 'high'::text, 'special_category'::text])))
);

ALTER TABLE ONLY public.data_categories FORCE ROW LEVEL SECURITY;


ALTER TABLE public.data_categories OWNER TO postgres;

--
-- Name: data_discovery_findings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_discovery_findings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    scan_id uuid NOT NULL,
    locator_hash text NOT NULL,
    data_category_id uuid NOT NULL,
    confidence numeric NOT NULL,
    sample_prohibited boolean DEFAULT false NOT NULL,
    review_status text DEFAULT 'pending'::text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT data_discovery_findings_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT data_discovery_findings_review_status_check CHECK ((review_status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rejected'::text])))
);

ALTER TABLE ONLY public.data_discovery_findings FORCE ROW LEVEL SECURITY;


ALTER TABLE public.data_discovery_findings OWNER TO postgres;

--
-- Name: data_discovery_scans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_discovery_scans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    system_id uuid NOT NULL,
    connector_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    status text DEFAULT 'running'::text NOT NULL,
    classifier_version text NOT NULL,
    idempotency_key text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT data_discovery_scans_status_check CHECK ((status = ANY (ARRAY['running'::text, 'succeeded'::text, 'failed'::text])))
);

ALTER TABLE ONLY public.data_discovery_scans FORCE ROW LEVEL SECURITY;


ALTER TABLE public.data_discovery_scans OWNER TO postgres;

--
-- Name: data_inventory_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_inventory_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    system_name text NOT NULL,
    data_elements jsonb DEFAULT '[]'::jsonb NOT NULL,
    owner_id uuid NOT NULL,
    locations text[] DEFAULT '{}'::text[] NOT NULL,
    lineage jsonb DEFAULT '[]'::jsonb NOT NULL,
    processing_activity_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    control_ids text[] DEFAULT '{}'::text[] NOT NULL,
    vendor_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    evidence_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    system_id uuid,
    data_category_id uuid,
    location text,
    format text,
    source text,
    steward_id uuid
);

ALTER TABLE ONLY public.data_inventory_records FORCE ROW LEVEL SECURITY;


ALTER TABLE public.data_inventory_records OWNER TO postgres;

--
-- Name: data_subject_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_subject_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    subject_key text NOT NULL,
    name text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.data_subject_categories FORCE ROW LEVEL SECURITY;


ALTER TABLE public.data_subject_categories OWNER TO postgres;

--
-- Name: deletion_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deletion_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    deletion_job_id uuid NOT NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    disposition text NOT NULL,
    key_destroyed boolean DEFAULT false NOT NULL,
    proof_hash text,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deletion_items_disposition_check CHECK ((disposition = ANY (ARRAY['deleted'::text, 'anonymized'::text, 'blocked_by_hold'::text, 'not_found'::text]))),
    CONSTRAINT deletion_items_target_type_check CHECK ((target_type = ANY (ARRAY['data_inventory_record'::text, 'evidence_object'::text, 'evidence_version'::text, 'rights_request'::text, 'consent_event'::text])))
);

ALTER TABLE ONLY public.deletion_items FORCE ROW LEVEL SECURITY;


ALTER TABLE public.deletion_items OWNER TO postgres;

--
-- Name: deletion_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deletion_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    deletion_trigger text NOT NULL,
    requested_by uuid NOT NULL,
    status text DEFAULT 'requested'::text NOT NULL,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deletion_jobs_status_check CHECK ((status = ANY (ARRAY['requested'::text, 'running'::text, 'completed'::text, 'failed'::text])))
);

ALTER TABLE ONLY public.deletion_jobs FORCE ROW LEVEL SECURITY;


ALTER TABLE public.deletion_jobs OWNER TO postgres;

--
-- Name: dpia_assessments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dpia_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    processing_activity_id uuid NOT NULL,
    risk_level text NOT NULL,
    residual_risk_score integer NOT NULL,
    approvals jsonb DEFAULT '[]'::jsonb NOT NULL,
    findings text[] DEFAULT '{}'::text[] NOT NULL,
    review_obligation_ids text[] DEFAULT '{}'::text[] NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dpia_assessments_residual_risk_score_check CHECK (((residual_risk_score >= 0) AND (residual_risk_score <= 100))),
    CONSTRAINT dpia_assessments_risk_level_check CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))
);

ALTER TABLE ONLY public.dpia_assessments FORCE ROW LEVEL SECURITY;


ALTER TABLE public.dpia_assessments OWNER TO postgres;

--
-- Name: dpia_risks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dpia_risks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    dpia_id uuid NOT NULL,
    description text NOT NULL,
    likelihood text NOT NULL,
    impact text NOT NULL,
    treatment text,
    residual_score integer NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dpia_risks_impact_check CHECK ((impact = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT dpia_risks_likelihood_check CHECK ((likelihood = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT dpia_risks_residual_score_check CHECK (((residual_score >= 0) AND (residual_score <= 100)))
);

ALTER TABLE ONLY public.dpia_risks FORCE ROW LEVEL SECURITY;


ALTER TABLE public.dpia_risks OWNER TO postgres;

--
-- Name: dpias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dpias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    processing_activity_id uuid NOT NULL,
    trigger_reason text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    owner_id uuid NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dpias_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'in_review'::text, 'approved'::text, 'rejected'::text])))
);

ALTER TABLE ONLY public.dpias FORCE ROW LEVEL SECURITY;


ALTER TABLE public.dpias OWNER TO postgres;

--
-- Name: encryption_key_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.encryption_key_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    kms_key_ref text NOT NULL,
    algorithm text NOT NULL,
    rotation_due_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    audit_event_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.encryption_key_records FORCE ROW LEVEL SECURITY;


ALTER TABLE public.encryption_key_records OWNER TO postgres;

--
-- Name: evaluation_cases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluation_cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    suite_id uuid NOT NULL,
    case_key text NOT NULL,
    input_fixture_uri text NOT NULL,
    expected_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.evaluation_cases FORCE ROW LEVEL SECURITY;


ALTER TABLE public.evaluation_cases OWNER TO postgres;

--
-- Name: evaluation_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluation_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    evaluation_run_id uuid NOT NULL,
    case_id uuid NOT NULL,
    metric text NOT NULL,
    score numeric NOT NULL,
    threshold numeric NOT NULL,
    passed boolean NOT NULL,
    artifact_uri text,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.evaluation_results FORCE ROW LEVEL SECURITY;


ALTER TABLE public.evaluation_results OWNER TO postgres;

--
-- Name: evaluation_suites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluation_suites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    use_case text NOT NULL,
    suite_key text NOT NULL,
    suite_version text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    threshold_policy jsonb DEFAULT '{}'::jsonb NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT evaluation_suites_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'retired'::text])))
);

ALTER TABLE ONLY public.evaluation_suites FORCE ROW LEVEL SECURITY;


ALTER TABLE public.evaluation_suites OWNER TO postgres;

--
-- Name: evidence_custody_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evidence_custody_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    evidence_version_id uuid NOT NULL,
    event_type text NOT NULL,
    actor_id uuid NOT NULL,
    location_ref text NOT NULL,
    event_hash text NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid GENERATED ALWAYS AS (actor_id) STORED,
    created_at timestamp with time zone GENERATED ALWAYS AS (occurred_at) STORED,
    CONSTRAINT evidence_custody_events_event_type_check CHECK ((event_type = ANY (ARRAY['created'::text, 'transferred'::text, 'accessed'::text, 'exported'::text, 'disposed'::text])))
);

ALTER TABLE ONLY public.evidence_custody_events FORCE ROW LEVEL SECURITY;


ALTER TABLE public.evidence_custody_events OWNER TO postgres;

--
-- Name: evidence_expiry_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evidence_expiry_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    evidence_id uuid NOT NULL,
    previous_state text NOT NULL,
    new_state text NOT NULL,
    reason text NOT NULL,
    actor_id uuid NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid GENERATED ALWAYS AS (actor_id) STORED,
    created_at timestamp with time zone GENERATED ALWAYS AS (occurred_at) STORED,
    CONSTRAINT evidence_expiry_events_reason_check CHECK ((length(TRIM(BOTH FROM reason)) > 0))
);

ALTER TABLE ONLY public.evidence_expiry_events FORCE ROW LEVEL SECURITY;


ALTER TABLE public.evidence_expiry_events OWNER TO postgres;

--
-- Name: evidence_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evidence_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    evidence_version_id uuid NOT NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    purpose text NOT NULL,
    scope_match boolean DEFAULT false NOT NULL,
    period_match boolean DEFAULT false NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT evidence_links_purpose_check CHECK ((length(TRIM(BOTH FROM purpose)) > 0)),
    CONSTRAINT evidence_links_target_type_check CHECK ((target_type = ANY (ARRAY['control_instance'::text, 'assessment_item'::text, 'automated_test_run'::text])))
);

ALTER TABLE ONLY public.evidence_links FORCE ROW LEVEL SECURITY;


ALTER TABLE public.evidence_links OWNER TO postgres;

--
-- Name: evidence_objects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evidence_objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    owner_id uuid NOT NULL,
    file_name text NOT NULL,
    storage_uri text,
    state public.evidence_state DEFAULT 'pending'::public.evidence_state NOT NULL,
    sha256 text,
    period_start date NOT NULL,
    period_end date NOT NULL,
    scope_tags text[] DEFAULT '{}'::text[] NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    title text,
    source_type text,
    retention_until timestamp with time zone
);

ALTER TABLE ONLY public.evidence_objects FORCE ROW LEVEL SECURITY;


ALTER TABLE public.evidence_objects OWNER TO postgres;

--
-- Name: evidence_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evidence_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    assessment_id uuid NOT NULL,
    control_instance_id uuid NOT NULL,
    requested_from text NOT NULL,
    due_at timestamp with time zone NOT NULL,
    status text DEFAULT 'requested'::text NOT NULL,
    instructions text,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT evidence_requests_status_check CHECK ((status = ANY (ARRAY['requested'::text, 'submitted'::text, 'accepted'::text, 'rejected'::text])))
);

ALTER TABLE ONLY public.evidence_requests FORCE ROW LEVEL SECURITY;


ALTER TABLE public.evidence_requests OWNER TO postgres;

--
-- Name: evidence_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evidence_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    evidence_version_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    decision text NOT NULL,
    rationale text NOT NULL,
    reviewed_at timestamp with time zone DEFAULT now() NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT evidence_reviews_decision_check CHECK ((decision = ANY (ARRAY['sufficient'::text, 'insufficient'::text, 'needs_more_context'::text]))),
    CONSTRAINT evidence_reviews_rationale_check CHECK ((length(TRIM(BOTH FROM rationale)) > 0))
);

ALTER TABLE ONLY public.evidence_reviews FORCE ROW LEVEL SECURITY;


ALTER TABLE public.evidence_reviews OWNER TO postgres;

--
-- Name: evidence_samples; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evidence_samples (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    test_result_id uuid NOT NULL,
    population_ref text NOT NULL,
    method text NOT NULL,
    sample_size integer NOT NULL,
    sample_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    seed text,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT evidence_samples_method_check CHECK ((method = ANY (ARRAY['random'::text, 'stratified'::text, 'judgmental'::text, 'full_population'::text]))),
    CONSTRAINT evidence_samples_sample_size_check CHECK ((sample_size >= 0))
);

ALTER TABLE ONLY public.evidence_samples FORCE ROW LEVEL SECURITY;


ALTER TABLE public.evidence_samples OWNER TO postgres;

--
-- Name: evidence_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evidence_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    evidence_id uuid NOT NULL,
    evidence_version_no integer NOT NULL,
    object_uri text NOT NULL,
    sha256 text NOT NULL,
    size_bytes bigint NOT NULL,
    mime_type text NOT NULL,
    observed_at timestamp with time zone NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    uploaded_by uuid NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid GENERATED ALWAYS AS (uploaded_by) STORED,
    created_at timestamp with time zone GENERATED ALWAYS AS (uploaded_at) STORED,
    CONSTRAINT evidence_versions_check CHECK ((period_end >= period_start)),
    CONSTRAINT evidence_versions_evidence_version_no_check CHECK ((evidence_version_no > 0)),
    CONSTRAINT evidence_versions_sha256_check CHECK ((length(TRIM(BOTH FROM sha256)) = 64)),
    CONSTRAINT evidence_versions_size_bytes_check CHECK ((size_bytes >= 0))
);

ALTER TABLE ONLY public.evidence_versions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.evidence_versions OWNER TO postgres;

--
-- Name: export_manifests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.export_manifests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    snapshot_id text NOT NULL,
    template_version text NOT NULL,
    artifact_hashes text[] NOT NULL,
    manifest_hash text NOT NULL,
    signing_key_ref text NOT NULL,
    signature text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    report_export_id uuid,
    signing_key_id uuid,
    manifest_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    signed_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.export_manifests FORCE ROW LEVEL SECURITY;


ALTER TABLE public.export_manifests OWNER TO postgres;

--
-- Name: findings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.findings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    assessment_item_id uuid,
    severity text NOT NULL,
    description text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    test_result_id uuid,
    CONSTRAINT findings_has_source CHECK (((assessment_item_id IS NOT NULL) OR (test_result_id IS NOT NULL))),
    CONSTRAINT findings_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);

ALTER TABLE ONLY public.findings FORCE ROW LEVEL SECURITY;


ALTER TABLE public.findings OWNER TO postgres;

--
-- Name: framework_content_packs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.framework_content_packs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    framework_key text NOT NULL,
    pack_version text NOT NULL,
    source_package_id uuid NOT NULL,
    source_sha256 text NOT NULL,
    signature text NOT NULL,
    status public.content_pack_status DEFAULT 'staged'::public.content_pack_status NOT NULL,
    published_at timestamp with time zone,
    supersedes_pack_id uuid,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    owner_scope public.catalog_owner_scope DEFAULT 'tenant'::public.catalog_owner_scope NOT NULL,
    framework_version_id uuid,
    CONSTRAINT chk_framework_version_id_not_null CHECK ((framework_version_id IS NOT NULL))
);

ALTER TABLE ONLY public.framework_content_packs FORCE ROW LEVEL SECURITY;


ALTER TABLE public.framework_content_packs OWNER TO postgres;

--
-- Name: framework_diff_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.framework_diff_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    diff_id uuid NOT NULL,
    change_type text NOT NULL,
    control_key text NOT NULL,
    old_value jsonb,
    new_value jsonb,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    CONSTRAINT framework_diff_items_change_type_check CHECK ((change_type = ANY (ARRAY['added'::text, 'removed'::text, 'modified'::text])))
);

ALTER TABLE ONLY public.framework_diff_items FORCE ROW LEVEL SECURITY;


ALTER TABLE public.framework_diff_items OWNER TO postgres;

--
-- Name: framework_diffs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.framework_diffs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    framework_id uuid NOT NULL,
    from_version_id uuid NOT NULL,
    to_version_id uuid NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL
);

ALTER TABLE ONLY public.framework_diffs FORCE ROW LEVEL SECURITY;


ALTER TABLE public.framework_diffs OWNER TO postgres;

--
-- Name: framework_requirements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.framework_requirements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    framework_pack_id uuid NOT NULL,
    framework_key text NOT NULL,
    control_id text NOT NULL,
    control_title text NOT NULL,
    sub_control_id text,
    sub_control_title text,
    requirement_text text NOT NULL,
    citation text,
    category text,
    source_workbook text NOT NULL,
    source_sheet text NOT NULL,
    source_row_number integer NOT NULL,
    source_sha256 text NOT NULL,
    raw_record jsonb NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    control_id_ref uuid,
    control_subcontrol_id uuid,
    CONSTRAINT chk_control_id_ref_not_null CHECK ((control_id_ref IS NOT NULL))
);

ALTER TABLE ONLY public.framework_requirements FORCE ROW LEVEL SECURITY;


ALTER TABLE public.framework_requirements OWNER TO postgres;

--
-- Name: framework_update_impacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.framework_update_impacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    diff_item_id uuid NOT NULL,
    assessment_id uuid NOT NULL,
    control_instance_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    resolution_rationale text,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    CONSTRAINT framework_update_impacts_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reassessed'::text, 'accepted'::text, 'ignored'::text])))
);

ALTER TABLE ONLY public.framework_update_impacts FORCE ROW LEVEL SECURITY;


ALTER TABLE public.framework_update_impacts OWNER TO postgres;

--
-- Name: framework_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.framework_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    framework_id uuid NOT NULL,
    version_key text NOT NULL,
    status public.content_pack_status DEFAULT 'staged'::public.content_pack_status NOT NULL,
    published_at timestamp with time zone,
    owner_scope public.catalog_owner_scope DEFAULT 'tenant'::public.catalog_owner_scope NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.framework_versions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.framework_versions OWNER TO postgres;

--
-- Name: frameworks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.frameworks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    framework_key text NOT NULL,
    name text NOT NULL,
    description text,
    owner_scope public.catalog_owner_scope DEFAULT 'tenant'::public.catalog_owner_scope NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.frameworks FORCE ROW LEVEL SECURITY;


ALTER TABLE public.frameworks OWNER TO postgres;

--
-- Name: generation_citations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.generation_citations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    generation_run_id uuid NOT NULL,
    output_path text NOT NULL,
    knowledge_chunk_id uuid NOT NULL,
    locator text,
    entailment_score numeric,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT generation_citations_entailment_score_check CHECK (((entailment_score >= (0)::numeric) AND (entailment_score <= (1)::numeric)))
);

ALTER TABLE ONLY public.generation_citations FORCE ROW LEVEL SECURITY;


ALTER TABLE public.generation_citations OWNER TO postgres;

--
-- Name: grc_workspaces; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grc_workspaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    business_unit text NOT NULL,
    parent_workspace_id uuid,
    inherited_control_ids text[] DEFAULT '{}'::text[] NOT NULL,
    delegated_admin_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.grc_workspaces FORCE ROW LEVEL SECURITY;


ALTER TABLE public.grc_workspaces OWNER TO postgres;

--
-- Name: harmonized_controls; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.harmonized_controls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    harmonized_id text NOT NULL,
    domain text NOT NULL,
    control_name text NOT NULL,
    control_description text NOT NULL,
    source_workbook text NOT NULL,
    source_sheet text NOT NULL,
    source_row_number integer NOT NULL,
    status public.content_pack_status DEFAULT 'staged'::public.content_pack_status NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    owner_scope public.catalog_owner_scope DEFAULT 'tenant'::public.catalog_owner_scope NOT NULL
);

ALTER TABLE ONLY public.harmonized_controls FORCE ROW LEVEL SECURITY;


ALTER TABLE public.harmonized_controls OWNER TO postgres;

--
-- Name: identity_role_grants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.identity_role_grants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    expires_at timestamp with time zone,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.identity_role_grants FORCE ROW LEVEL SECURITY;


ALTER TABLE public.identity_role_grants OWNER TO postgres;

--
-- Name: identity_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.identity_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    role_key text NOT NULL,
    display_name text NOT NULL,
    description text,
    classification public.cybernara_classification DEFAULT 'internal'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.identity_roles FORCE ROW LEVEL SECURITY;


ALTER TABLE public.identity_roles OWNER TO postgres;

--
-- Name: identity_service_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.identity_service_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    name text NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    disabled_at timestamp with time zone,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.identity_service_accounts FORCE ROW LEVEL SECURITY;


ALTER TABLE public.identity_service_accounts OWNER TO postgres;

--
-- Name: identity_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.identity_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    user_id uuid NOT NULL,
    supabase_session_id text NOT NULL,
    issued_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.identity_sessions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.identity_sessions OWNER TO postgres;

--
-- Name: identity_tenants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.identity_tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT identity_tenants_check CHECK ((tenant_id = id)),
    CONSTRAINT identity_tenants_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'archived'::text])))
);

ALTER TABLE ONLY public.identity_tenants FORCE ROW LEVEL SECURITY;


ALTER TABLE public.identity_tenants OWNER TO postgres;

--
-- Name: identity_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.identity_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    supabase_user_id uuid NOT NULL,
    email text NOT NULL,
    display_name text,
    status text DEFAULT 'active'::text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT identity_users_status_check CHECK ((status = ANY (ARRAY['active'::text, 'invited'::text, 'disabled'::text])))
);

ALTER TABLE ONLY public.identity_users FORCE ROW LEVEL SECURITY;


ALTER TABLE public.identity_users OWNER TO postgres;

--
-- Name: identity_workspace_delegations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.identity_workspace_delegations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    workspace_id uuid NOT NULL,
    principal_user_id uuid NOT NULL,
    delegated_by uuid NOT NULL,
    reason text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.identity_workspace_delegations FORCE ROW LEVEL SECURITY;


ALTER TABLE public.identity_workspace_delegations OWNER TO postgres;

--
-- Name: incident_assessments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incident_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    incident_id uuid NOT NULL,
    jurisdiction text NOT NULL,
    reportable boolean NOT NULL,
    rationale text NOT NULL,
    assessor_id uuid NOT NULL,
    decided_at timestamp with time zone DEFAULT now() NOT NULL,
    assessment_version_no integer DEFAULT 1 NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT incident_assessments_assessment_version_no_check CHECK ((assessment_version_no > 0))
);

ALTER TABLE ONLY public.incident_assessments FORCE ROW LEVEL SECURITY;


ALTER TABLE public.incident_assessments OWNER TO postgres;

--
-- Name: incident_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incident_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    incident_id uuid NOT NULL,
    recipient_type text NOT NULL,
    jurisdiction text NOT NULL,
    due_at timestamp with time zone NOT NULL,
    sent_at timestamp with time zone,
    artifact_id uuid,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT incident_notifications_recipient_type_check CHECK ((recipient_type = ANY (ARRAY['regulator'::text, 'data_subject'::text, 'partner'::text])))
);

ALTER TABLE ONLY public.incident_notifications FORCE ROW LEVEL SECURITY;


ALTER TABLE public.incident_notifications OWNER TO postgres;

--
-- Name: knowledge_chunks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knowledge_chunks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    retrieval_index_id uuid NOT NULL,
    source_type text NOT NULL,
    source_id text NOT NULL,
    source_version text NOT NULL,
    content_hash text NOT NULL,
    acl_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    text_uri text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.knowledge_chunks FORCE ROW LEVEL SECURITY;


ALTER TABLE public.knowledge_chunks OWNER TO postgres;

--
-- Name: lawful_bases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lawful_bases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    jurisdiction text NOT NULL,
    basis_key text NOT NULL,
    name text NOT NULL,
    citation text,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.lawful_bases FORCE ROW LEVEL SECURITY;


ALTER TABLE public.lawful_bases OWNER TO postgres;

--
-- Name: legal_hold_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.legal_hold_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    legal_hold_id uuid NOT NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT legal_hold_items_target_type_check CHECK ((target_type = ANY (ARRAY['data_inventory_record'::text, 'evidence_object'::text, 'evidence_version'::text, 'rights_request'::text, 'consent_event'::text])))
);

ALTER TABLE ONLY public.legal_hold_items FORCE ROW LEVEL SECURITY;


ALTER TABLE public.legal_hold_items OWNER TO postgres;

--
-- Name: legal_holds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.legal_holds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    hold_key text NOT NULL,
    reason text NOT NULL,
    issued_by uuid NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    released_at timestamp with time zone,
    scope_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.legal_holds FORCE ROW LEVEL SECURITY;


ALTER TABLE public.legal_holds OWNER TO postgres;

--
-- Name: malware_scan_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.malware_scan_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    evidence_version_id uuid NOT NULL,
    engine text NOT NULL,
    signature_version text NOT NULL,
    status text NOT NULL,
    details_hash text,
    scanned_at timestamp with time zone DEFAULT now() NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT malware_scan_results_status_check CHECK ((status = ANY (ARRAY['clean'::text, 'infected'::text, 'error'::text])))
);

ALTER TABLE ONLY public.malware_scan_results FORCE ROW LEVEL SECURITY;


ALTER TABLE public.malware_scan_results OWNER TO postgres;

--
-- Name: mapping_conflicts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mapping_conflicts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    control_mapping_id uuid NOT NULL,
    conflicting_mapping_id uuid,
    description text NOT NULL,
    resolution_status public.mapping_conflict_resolution_status DEFAULT 'open'::public.mapping_conflict_resolution_status NOT NULL,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mapping_conflicts_check CHECK (((resolution_status = 'open'::public.mapping_conflict_resolution_status) OR ((resolved_by IS NOT NULL) AND (resolved_at IS NOT NULL))))
);

ALTER TABLE ONLY public.mapping_conflicts FORCE ROW LEVEL SECURITY;


ALTER TABLE public.mapping_conflicts OWNER TO postgres;

--
-- Name: mapping_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mapping_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    control_mapping_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    decision public.mapping_review_decision NOT NULL,
    rationale text NOT NULL,
    reviewed_at timestamp with time zone DEFAULT now() NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.mapping_reviews FORCE ROW LEVEL SECURITY;


ALTER TABLE public.mapping_reviews OWNER TO postgres;

--
-- Name: mapping_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mapping_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    version_key text NOT NULL,
    status public.content_pack_status DEFAULT 'staged'::public.content_pack_status NOT NULL,
    published_at timestamp with time zone,
    owner_scope public.catalog_owner_scope DEFAULT 'tenant'::public.catalog_owner_scope NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.mapping_versions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.mapping_versions OWNER TO postgres;

--
-- Name: outbox_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.outbox_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    event_type text NOT NULL,
    aggregate_type text NOT NULL,
    aggregate_id text NOT NULL,
    schema_version integer DEFAULT 1 NOT NULL,
    payload jsonb NOT NULL,
    idempotency_key text NOT NULL,
    status public.outbox_status DEFAULT 'pending'::public.outbox_status NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    available_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    classification public.cybernara_classification DEFAULT 'internal'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.outbox_events FORCE ROW LEVEL SECURITY;


ALTER TABLE public.outbox_events OWNER TO postgres;

--
-- Name: policies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    policy_key text NOT NULL,
    title text NOT NULL,
    owner_id uuid NOT NULL,
    category text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT policies_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'retired'::text])))
);

ALTER TABLE ONLY public.policies FORCE ROW LEVEL SECURITY;


ALTER TABLE public.policies OWNER TO postgres;

--
-- Name: policy_attestations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.policy_attestations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    policy_version_id uuid NOT NULL,
    user_id uuid NOT NULL,
    decision text NOT NULL,
    attested_at timestamp with time zone DEFAULT now() NOT NULL,
    evidence_hash text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid GENERATED ALWAYS AS (user_id) STORED,
    created_at timestamp with time zone GENERATED ALWAYS AS (attested_at) STORED,
    CONSTRAINT policy_attestations_decision_check CHECK ((decision = ANY (ARRAY['attested'::text, 'declined'::text])))
);

ALTER TABLE ONLY public.policy_attestations FORCE ROW LEVEL SECURITY;


ALTER TABLE public.policy_attestations OWNER TO postgres;

--
-- Name: policy_control_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.policy_control_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    policy_version_id uuid NOT NULL,
    control_id text NOT NULL,
    coverage text DEFAULT 'full'::text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT policy_control_links_coverage_check CHECK ((coverage = ANY (ARRAY['full'::text, 'partial'::text, 'not_covered'::text])))
);

ALTER TABLE ONLY public.policy_control_links FORCE ROW LEVEL SECURITY;


ALTER TABLE public.policy_control_links OWNER TO postgres;

--
-- Name: policy_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.policy_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    template_key text NOT NULL,
    title text NOT NULL,
    policy_version text NOT NULL,
    status text NOT NULL,
    approver_id uuid,
    published_at timestamp with time zone,
    attestation_evidence_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    exceptions jsonb DEFAULT '[]'::jsonb NOT NULL,
    content_hash text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    policy_id uuid,
    CONSTRAINT policy_versions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'in_review'::text, 'approved'::text, 'published'::text, 'retired'::text])))
);

ALTER TABLE ONLY public.policy_versions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.policy_versions OWNER TO postgres;

--
-- Name: privacy_incidents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.privacy_incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    severity text NOT NULL,
    impacted_processing_activity_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    evidence_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    report_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    discovered_at timestamp with time zone NOT NULL,
    regulator_notification_due_at timestamp with time zone NOT NULL,
    data_subject_notification_due_at timestamp with time zone NOT NULL,
    timeline jsonb DEFAULT '[]'::jsonb NOT NULL,
    actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT privacy_incidents_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);

ALTER TABLE ONLY public.privacy_incidents FORCE ROW LEVEL SECURITY;


ALTER TABLE public.privacy_incidents OWNER TO postgres;

--
-- Name: privacy_notice_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.privacy_notice_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    privacy_notice_id uuid NOT NULL,
    notice_version_no integer NOT NULL,
    content_uri text NOT NULL,
    sha256 text NOT NULL,
    jurisdictions text[] DEFAULT '{}'::text[] NOT NULL,
    effective_from timestamp with time zone NOT NULL,
    effective_to timestamp with time zone,
    approved_by uuid NOT NULL,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid GENERATED ALWAYS AS (approved_by) STORED,
    created_at timestamp with time zone GENERATED ALWAYS AS (published_at) STORED,
    CONSTRAINT privacy_notice_versions_notice_version_no_check CHECK ((notice_version_no > 0)),
    CONSTRAINT privacy_notice_versions_sha256_check CHECK ((length(TRIM(BOTH FROM sha256)) = 64))
);

ALTER TABLE ONLY public.privacy_notice_versions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.privacy_notice_versions OWNER TO postgres;

--
-- Name: privacy_notices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.privacy_notices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    notice_key text NOT NULL,
    audience text NOT NULL,
    owner_id uuid NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT privacy_notices_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'retired'::text])))
);

ALTER TABLE ONLY public.privacy_notices FORCE ROW LEVEL SECURITY;


ALTER TABLE public.privacy_notices OWNER TO postgres;

--
-- Name: privacy_rights_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.privacy_rights_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    subject_id text NOT NULL,
    request_type text NOT NULL,
    status text NOT NULL,
    identity_verified boolean DEFAULT false NOT NULL,
    opened_at timestamp with time zone NOT NULL,
    deadline_at timestamp with time zone NOT NULL,
    search_tasks jsonb DEFAULT '[]'::jsonb NOT NULL,
    exceptions jsonb DEFAULT '[]'::jsonb NOT NULL,
    communications jsonb DEFAULT '[]'::jsonb NOT NULL,
    completion_evidence_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT privacy_rights_requests_request_type_check CHECK ((request_type = ANY (ARRAY['access'::text, 'delete'::text, 'correct'::text, 'export'::text, 'restrict'::text]))),
    CONSTRAINT privacy_rights_requests_status_check CHECK ((status = ANY (ARRAY['open'::text, 'verified'::text, 'searching'::text, 'exception_applied'::text, 'completed'::text])))
);

ALTER TABLE ONLY public.privacy_rights_requests FORCE ROW LEVEL SECURITY;


ALTER TABLE public.privacy_rights_requests OWNER TO postgres;

--
-- Name: processing_activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.processing_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    purpose text NOT NULL,
    lawful_basis text NOT NULL,
    data_subject_categories text[] DEFAULT '{}'::text[] NOT NULL,
    recipients text[] DEFAULT '{}'::text[] NOT NULL,
    transfers text[] DEFAULT '{}'::text[] NOT NULL,
    retention_months integer NOT NULL,
    jurisdiction text NOT NULL,
    inventory_record_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    report_version text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    workspace_id uuid,
    name text,
    controller_processor_role text,
    status text,
    CONSTRAINT processing_activities_controller_processor_role_check CHECK (((controller_processor_role IS NULL) OR (controller_processor_role = ANY (ARRAY['controller'::text, 'processor'::text, 'joint_controller'::text])))),
    CONSTRAINT processing_activities_retention_months_check CHECK ((retention_months > 0)),
    CONSTRAINT processing_activities_status_check CHECK (((status IS NULL) OR (status = ANY (ARRAY['draft'::text, 'active'::text, 'retired'::text]))))
);

ALTER TABLE ONLY public.processing_activities FORCE ROW LEVEL SECURITY;


ALTER TABLE public.processing_activities OWNER TO postgres;

--
-- Name: processing_inventory_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.processing_inventory_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    processing_activity_id uuid NOT NULL,
    inventory_record_id uuid NOT NULL,
    role text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT processing_inventory_links_role_check CHECK ((role = ANY (ARRAY['source'::text, 'destination'::text, 'processor'::text])))
);

ALTER TABLE ONLY public.processing_inventory_links FORCE ROW LEVEL SECURITY;


ALTER TABLE public.processing_inventory_links OWNER TO postgres;

--
-- Name: processing_purposes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.processing_purposes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    processing_activity_id uuid NOT NULL,
    purpose_id uuid NOT NULL,
    lawful_basis_id uuid NOT NULL,
    effective_from timestamp with time zone DEFAULT now() NOT NULL,
    effective_to timestamp with time zone,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.processing_purposes FORCE ROW LEVEL SECURITY;


ALTER TABLE public.processing_purposes OWNER TO postgres;

--
-- Name: processing_recipients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.processing_recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    processing_activity_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    purpose_id uuid NOT NULL,
    data_categories uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.processing_recipients FORCE ROW LEVEL SECURITY;


ALTER TABLE public.processing_recipients OWNER TO postgres;

--
-- Name: product_assurance_evidence; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_assurance_evidence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    framework text NOT NULL,
    control_ref text NOT NULL,
    evidence_id uuid NOT NULL,
    exception_reason text,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.product_assurance_evidence FORCE ROW LEVEL SECURITY;


ALTER TABLE public.product_assurance_evidence OWNER TO postgres;

--
-- Name: purposes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purposes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    purpose_key text NOT NULL,
    name text NOT NULL,
    description text,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.purposes FORCE ROW LEVEL SECURITY;


ALTER TABLE public.purposes OWNER TO postgres;

--
-- Name: question_sets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.question_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    control_id text NOT NULL,
    question_set_key text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    source_type text DEFAULT 'curated'::text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT question_sets_source_type_check CHECK ((source_type = ANY (ARRAY['curated'::text, 'ai_generated'::text]))),
    CONSTRAINT question_sets_status_check CHECK ((status = ANY (ARRAY['active'::text, 'deprecated'::text])))
);

ALTER TABLE ONLY public.question_sets FORCE ROW LEVEL SECURITY;


ALTER TABLE public.question_sets OWNER TO postgres;

--
-- Name: question_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.question_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    question_set_id uuid NOT NULL,
    question_version integer NOT NULL,
    payload_json jsonb NOT NULL,
    source_ai_question_version_id uuid,
    approved_by uuid,
    approved_at timestamp with time zone,
    checksum text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT question_versions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'approved'::text, 'deprecated'::text])))
);

ALTER TABLE ONLY public.question_versions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.question_versions OWNER TO postgres;

--
-- Name: rate_limit_policies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rate_limit_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    policy_key text NOT NULL,
    limit_count integer NOT NULL,
    window_seconds integer NOT NULL,
    timeout_ms integer NOT NULL,
    classification public.cybernara_classification DEFAULT 'internal'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rate_limit_policies_limit_count_check CHECK ((limit_count > 0)),
    CONSTRAINT rate_limit_policies_timeout_ms_check CHECK ((timeout_ms > 0)),
    CONSTRAINT rate_limit_policies_window_seconds_check CHECK ((window_seconds > 0))
);

ALTER TABLE ONLY public.rate_limit_policies FORCE ROW LEVEL SECURITY;


ALTER TABLE public.rate_limit_policies OWNER TO postgres;

--
-- Name: recipients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    name text NOT NULL,
    recipient_type text NOT NULL,
    country text NOT NULL,
    vendor_id uuid,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recipients_recipient_type_check CHECK ((recipient_type = ANY (ARRAY['controller'::text, 'processor'::text, 'sub_processor'::text])))
);

ALTER TABLE ONLY public.recipients FORCE ROW LEVEL SECURITY;


ALTER TABLE public.recipients OWNER TO postgres;

--
-- Name: remediation_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.remediation_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    finding_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    due_at timestamp with time zone NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    treatment_id uuid,
    priority text,
    verified_at timestamp with time zone,
    CONSTRAINT remediation_tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT remediation_tasks_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'verified'::text, 'risk_accepted'::text])))
);

ALTER TABLE ONLY public.remediation_tasks FORCE ROW LEVEL SECURITY;


ALTER TABLE public.remediation_tasks OWNER TO postgres;

--
-- Name: report_exports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_exports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    assessment_id uuid NOT NULL,
    snapshot_id text NOT NULL,
    template_version text NOT NULL,
    format text NOT NULL,
    idempotency_key text NOT NULL,
    sha256 text NOT NULL,
    storage_uri text,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    assessment_snapshot_id uuid,
    report_template_id uuid,
    artifact_bytes bytea,
    signature text,
    completed_at timestamp with time zone,
    CONSTRAINT report_exports_format_check CHECK ((format = ANY (ARRAY['pdf'::text, 'xlsx'::text])))
);

ALTER TABLE ONLY public.report_exports FORCE ROW LEVEL SECURITY;


ALTER TABLE public.report_exports OWNER TO postgres;

--
-- Name: report_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    template_key text NOT NULL,
    template_version text NOT NULL,
    format text NOT NULL,
    renderer_version text NOT NULL,
    checksum text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT report_templates_format_check CHECK ((format = ANY (ARRAY['pdf'::text, 'xlsx'::text]))),
    CONSTRAINT report_templates_status_check CHECK ((status = ANY (ARRAY['active'::text, 'deprecated'::text])))
);

ALTER TABLE ONLY public.report_templates FORCE ROW LEVEL SECURITY;


ALTER TABLE public.report_templates OWNER TO postgres;

--
-- Name: requirement_instances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.requirement_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    assessment_id uuid NOT NULL,
    requirement_id uuid NOT NULL,
    applicability_status text DEFAULT 'pending'::text NOT NULL,
    coverage_status text DEFAULT 'uncovered'::text NOT NULL,
    owner_id uuid NOT NULL,
    status public.assessment_status DEFAULT 'not_started'::public.assessment_status NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT requirement_instances_applicability_status_check CHECK ((applicability_status = ANY (ARRAY['pending'::text, 'applicable'::text, 'not_applicable'::text]))),
    CONSTRAINT requirement_instances_coverage_status_check CHECK ((coverage_status = ANY (ARRAY['uncovered'::text, 'partially_covered'::text, 'covered'::text])))
);

ALTER TABLE ONLY public.requirement_instances FORCE ROW LEVEL SECURITY;


ALTER TABLE public.requirement_instances OWNER TO postgres;

--
-- Name: retention_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.retention_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    retention_rule_id uuid NOT NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    effective_from timestamp with time zone DEFAULT now() NOT NULL,
    effective_to timestamp with time zone,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT retention_assignments_target_type_check CHECK ((target_type = ANY (ARRAY['data_inventory_record'::text, 'evidence_object'::text, 'evidence_version'::text, 'rights_request'::text, 'consent_event'::text])))
);

ALTER TABLE ONLY public.retention_assignments FORCE ROW LEVEL SECURITY;


ALTER TABLE public.retention_assignments OWNER TO postgres;

--
-- Name: retention_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.retention_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    data_category_id uuid NOT NULL,
    jurisdiction text NOT NULL,
    retention_trigger text NOT NULL,
    duration_days integer NOT NULL,
    disposition text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT retention_rules_disposition_check CHECK ((disposition = ANY (ARRAY['delete'::text, 'anonymize'::text, 'archive'::text]))),
    CONSTRAINT retention_rules_duration_days_check CHECK ((duration_days > 0))
);

ALTER TABLE ONLY public.retention_rules FORCE ROW LEVEL SECURITY;


ALTER TABLE public.retention_rules OWNER TO postgres;

--
-- Name: retention_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.retention_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    data_category text NOT NULL,
    jurisdiction text NOT NULL,
    residency text NOT NULL,
    transfer_mechanism text NOT NULL,
    retention_months integer NOT NULL,
    legal_hold boolean DEFAULT false NOT NULL,
    disposal_evidence_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT retention_schedules_retention_months_check CHECK ((retention_months > 0))
);

ALTER TABLE ONLY public.retention_schedules FORCE ROW LEVEL SECURITY;


ALTER TABLE public.retention_schedules OWNER TO postgres;

--
-- Name: retrieval_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.retrieval_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    query_hash text NOT NULL,
    filters_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    retrieval_index_id uuid NOT NULL,
    top_k integer NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT retrieval_runs_top_k_check CHECK (((top_k > 0) AND (top_k <= 50)))
);

ALTER TABLE ONLY public.retrieval_runs FORCE ROW LEVEL SECURITY;


ALTER TABLE public.retrieval_runs OWNER TO postgres;

--
-- Name: retrieved_chunks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.retrieved_chunks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    retrieval_run_id uuid NOT NULL,
    knowledge_chunk_id uuid NOT NULL,
    rank integer NOT NULL,
    score numeric NOT NULL,
    acl_decision text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT retrieved_chunks_acl_decision_check CHECK ((acl_decision = ANY (ARRAY['allowed'::text, 'denied'::text]))),
    CONSTRAINT retrieved_chunks_rank_check CHECK ((rank > 0))
);

ALTER TABLE ONLY public.retrieved_chunks FORCE ROW LEVEL SECURITY;


ALTER TABLE public.retrieved_chunks OWNER TO postgres;

--
-- Name: review_decisions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.review_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    assessment_item_id uuid NOT NULL,
    answer_revision_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    decision text NOT NULL,
    rationale text,
    decided_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid GENERATED ALWAYS AS (reviewer_id) STORED,
    created_at timestamp with time zone GENERATED ALWAYS AS (decided_at) STORED,
    CONSTRAINT review_decisions_decision_check CHECK ((decision = ANY (ARRAY['approved'::text, 'needs_changes'::text])))
);

ALTER TABLE ONLY public.review_decisions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.review_decisions OWNER TO postgres;

--
-- Name: rights_request_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rights_request_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    rights_request_id uuid NOT NULL,
    system_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    task_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    result_ref text,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rights_request_tasks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'blocked'::text]))),
    CONSTRAINT rights_request_tasks_task_type_check CHECK ((task_type = ANY (ARRAY['search'::text, 'decision'::text, 'fulfillment'::text])))
);

ALTER TABLE ONLY public.rights_request_tasks FORCE ROW LEVEL SECURITY;


ALTER TABLE public.rights_request_tasks OWNER TO postgres;

--
-- Name: risk_acceptance_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.risk_acceptance_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    risk_acceptance_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    decision text NOT NULL,
    reason text NOT NULL,
    reviewed_at timestamp with time zone DEFAULT now() NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid GENERATED ALWAYS AS (reviewer_id) STORED,
    created_at timestamp with time zone GENERATED ALWAYS AS (reviewed_at) STORED,
    CONSTRAINT risk_acceptance_reviews_decision_check CHECK ((decision = ANY (ARRAY['reaffirmed'::text, 'revoked'::text, 'escalated'::text]))),
    CONSTRAINT risk_acceptance_reviews_reason_check CHECK ((length(TRIM(BOTH FROM reason)) > 0))
);

ALTER TABLE ONLY public.risk_acceptance_reviews FORCE ROW LEVEL SECURITY;


ALTER TABLE public.risk_acceptance_reviews OWNER TO postgres;

--
-- Name: risk_acceptances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.risk_acceptances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    remediation_task_id uuid NOT NULL,
    finding_id uuid NOT NULL,
    rationale text NOT NULL,
    approver_id uuid NOT NULL,
    approved_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    next_review_due_at timestamp with time zone NOT NULL,
    compensating_controls text,
    superseded_at timestamp with time zone,
    superseded_by_id uuid,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    risk_id uuid,
    CONSTRAINT risk_acceptances_check CHECK ((expires_at > approved_at)),
    CONSTRAINT risk_acceptances_check1 CHECK ((next_review_due_at > approved_at)),
    CONSTRAINT risk_acceptances_rationale_check CHECK ((length(TRIM(BOTH FROM rationale)) > 0))
);

ALTER TABLE ONLY public.risk_acceptances FORCE ROW LEVEL SECURITY;


ALTER TABLE public.risk_acceptances OWNER TO postgres;

--
-- Name: risk_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.risk_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    risk_id uuid NOT NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    relationship text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT risk_links_relationship_check CHECK ((relationship = ANY (ARRAY['related_to'::text, 'caused_by'::text, 'mitigated_by'::text, 'threatens'::text]))),
    CONSTRAINT risk_links_target_type_check CHECK ((target_type = ANY (ARRAY['finding'::text, 'control_instance'::text, 'vendor'::text, 'evidence_object'::text, 'assessment'::text, 'requirement_instance'::text])))
);

ALTER TABLE ONLY public.risk_links FORCE ROW LEVEL SECURITY;


ALTER TABLE public.risk_links OWNER TO postgres;

--
-- Name: risk_models; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.risk_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    model_key text NOT NULL,
    model_version text NOT NULL,
    scales_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    formula text NOT NULL,
    thresholds jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT risk_models_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'retired'::text])))
);

ALTER TABLE ONLY public.risk_models FORCE ROW LEVEL SECURITY;


ALTER TABLE public.risk_models OWNER TO postgres;

--
-- Name: risk_treatments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.risk_treatments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    risk_id uuid NOT NULL,
    strategy text NOT NULL,
    plan text NOT NULL,
    owner_id uuid NOT NULL,
    due_at timestamp with time zone NOT NULL,
    status text DEFAULT 'planned'::text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT risk_treatments_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT risk_treatments_strategy_check CHECK ((strategy = ANY (ARRAY['accept'::text, 'mitigate'::text, 'transfer'::text, 'avoid'::text])))
);

ALTER TABLE ONLY public.risk_treatments FORCE ROW LEVEL SECURITY;


ALTER TABLE public.risk_treatments OWNER TO postgres;

--
-- Name: risks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.risks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    workspace_id uuid,
    risk_model_id uuid,
    risk_key text NOT NULL,
    title text NOT NULL,
    category text NOT NULL,
    inherent_score numeric NOT NULL,
    residual_score numeric NOT NULL,
    owner_id uuid NOT NULL,
    status text DEFAULT 'identified'::text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT risks_inherent_score_check CHECK (((inherent_score >= (0)::numeric) AND (inherent_score <= (100)::numeric))),
    CONSTRAINT risks_residual_score_check CHECK (((residual_score >= (0)::numeric) AND (residual_score <= (100)::numeric))),
    CONSTRAINT risks_status_check CHECK ((status = ANY (ARRAY['identified'::text, 'assessed'::text, 'treatment_planned'::text, 'monitoring'::text, 'closed'::text])))
);

ALTER TABLE ONLY public.risks FORCE ROW LEVEL SECURITY;


ALTER TABLE public.risks OWNER TO postgres;

--
-- Name: safety_checks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.safety_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    generation_run_id uuid NOT NULL,
    check_type text NOT NULL,
    policy_version text NOT NULL,
    result text NOT NULL,
    score numeric,
    redaction_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT safety_checks_check_type_check CHECK ((check_type = ANY (ARRAY['prompt_injection'::text, 'pii_exposure'::text, 'toxicity'::text, 'policy_bypass'::text, 'jailbreak'::text]))),
    CONSTRAINT safety_checks_result_check CHECK ((result = ANY (ARRAY['pass'::text, 'fail'::text, 'warn'::text])))
);

ALTER TABLE ONLY public.safety_checks FORCE ROW LEVEL SECURITY;


ALTER TABLE public.safety_checks OWNER TO postgres;

--
-- Name: sdlc_release_gates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sdlc_release_gates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    sbom_hash text NOT NULL,
    signed_build_ref text NOT NULL,
    scan_findings jsonb DEFAULT '[]'::jsonb NOT NULL,
    penetration_test_evidence_id uuid NOT NULL,
    releasable boolean DEFAULT false NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.sdlc_release_gates FORCE ROW LEVEL SECURITY;


ALTER TABLE public.sdlc_release_gates OWNER TO postgres;

--
-- Name: siem_export_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.siem_export_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    actor_id uuid NOT NULL,
    target text NOT NULL,
    before_hash text NOT NULL,
    after_hash text NOT NULL,
    trace_id text NOT NULL,
    delivered boolean DEFAULT false NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.siem_export_records FORCE ROW LEVEL SECURITY;


ALTER TABLE public.siem_export_records OWNER TO postgres;

--
-- Name: systems_assets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.systems_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    workspace_id uuid,
    name text NOT NULL,
    asset_type text NOT NULL,
    owner_id uuid NOT NULL,
    region text,
    criticality text,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT systems_assets_criticality_check CHECK ((criticality = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);

ALTER TABLE ONLY public.systems_assets FORCE ROW LEVEL SECURITY;


ALTER TABLE public.systems_assets OWNER TO postgres;

--
-- Name: tenant_catalog_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenant_catalog_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    framework_id uuid,
    source_package_id uuid,
    status public.catalog_subscription_status DEFAULT 'active'::public.catalog_subscription_status NOT NULL,
    subscribed_at timestamp with time zone DEFAULT now() NOT NULL,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tenant_catalog_subscriptions_check CHECK (((framework_id IS NOT NULL) OR (source_package_id IS NOT NULL)))
);

ALTER TABLE ONLY public.tenant_catalog_subscriptions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.tenant_catalog_subscriptions OWNER TO postgres;

--
-- Name: test_procedures; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.test_procedures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    control_id text NOT NULL,
    procedure_key text NOT NULL,
    method text NOT NULL,
    expected_result text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT test_procedures_status_check CHECK ((status = ANY (ARRAY['active'::text, 'deprecated'::text])))
);

ALTER TABLE ONLY public.test_procedures FORCE ROW LEVEL SECURITY;


ALTER TABLE public.test_procedures OWNER TO postgres;

--
-- Name: transfers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    processing_activity_id uuid NOT NULL,
    from_country text NOT NULL,
    to_country text NOT NULL,
    mechanism text NOT NULL,
    safeguards text,
    status text DEFAULT 'active'::text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transfers_mechanism_check CHECK ((mechanism = ANY (ARRAY['sccs'::text, 'adequacy_decision'::text, 'bcr'::text, 'derogation'::text]))),
    CONSTRAINT transfers_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'terminated'::text])))
);

ALTER TABLE ONLY public.transfers FORCE ROW LEVEL SECURITY;


ALTER TABLE public.transfers OWNER TO postgres;

--
-- Name: trust_center_artifacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trust_center_artifacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    title text NOT NULL,
    artifact_version text NOT NULL,
    approved boolean DEFAULT false NOT NULL,
    visibility text NOT NULL,
    artifact_evidence_id uuid NOT NULL,
    nda_required boolean DEFAULT false NOT NULL,
    crm_account_id text,
    download_events jsonb DEFAULT '[]'::jsonb NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT trust_center_artifacts_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'private'::text])))
);

ALTER TABLE ONLY public.trust_center_artifacts FORCE ROW LEVEL SECURITY;


ALTER TABLE public.trust_center_artifacts OWNER TO postgres;

--
-- Name: universal_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.universal_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    due_at timestamp with time zone,
    owner_id uuid NOT NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    completed_at timestamp with time zone,
    completed_by uuid,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT universal_tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT universal_tasks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT universal_tasks_target_type_check CHECK ((target_type = ANY (ARRAY['remediation_task'::text, 'rights_request_task'::text, 'framework_update_impact'::text]))),
    CONSTRAINT universal_tasks_title_check CHECK ((length(TRIM(BOTH FROM title)) > 0))
);

ALTER TABLE ONLY public.universal_tasks FORCE ROW LEVEL SECURITY;


ALTER TABLE public.universal_tasks OWNER TO postgres;

--
-- Name: upload_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.upload_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    file_name text NOT NULL,
    scan_status text NOT NULL,
    sha256 text,
    classification public.cybernara_classification DEFAULT 'restricted'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT upload_sessions_scan_status_check CHECK ((scan_status = ANY (ARRAY['quarantined'::text, 'clean'::text, 'malicious'::text])))
);

ALTER TABLE ONLY public.upload_sessions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.upload_sessions OWNER TO postgres;

--
-- Name: vendor_assessments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendor_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    vendor_id uuid NOT NULL,
    assessment_type text NOT NULL,
    period text NOT NULL,
    status text DEFAULT 'planned'::text NOT NULL,
    reviewer_id uuid NOT NULL,
    score numeric,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vendor_assessments_assessment_type_check CHECK ((assessment_type = ANY (ARRAY['onboarding'::text, 'renewal'::text, 'ad_hoc'::text]))),
    CONSTRAINT vendor_assessments_score_check CHECK (((score >= (0)::numeric) AND (score <= (100)::numeric))),
    CONSTRAINT vendor_assessments_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'in_progress'::text, 'completed'::text])))
);

ALTER TABLE ONLY public.vendor_assessments FORCE ROW LEVEL SECURITY;


ALTER TABLE public.vendor_assessments OWNER TO postgres;

--
-- Name: vendor_findings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendor_findings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    vendor_assessment_id uuid NOT NULL,
    severity text NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    due_at timestamp with time zone,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vendor_findings_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT vendor_findings_status_check CHECK ((status = ANY (ARRAY['open'::text, 'remediated'::text, 'accepted'::text])))
);

ALTER TABLE ONLY public.vendor_findings FORCE ROW LEVEL SECURITY;


ALTER TABLE public.vendor_findings OWNER TO postgres;

--
-- Name: vendors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    name text NOT NULL,
    tier text NOT NULL,
    systems text[] DEFAULT '{}'::text[] NOT NULL,
    contract_ids text[] DEFAULT '{}'::text[] NOT NULL,
    control_ids text[] DEFAULT '{}'::text[] NOT NULL,
    incident_ids text[] DEFAULT '{}'::text[] NOT NULL,
    questionnaire_ids text[] DEFAULT '{}'::text[] NOT NULL,
    monitoring_findings text[] DEFAULT '{}'::text[] NOT NULL,
    renewal_at timestamp with time zone NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vendors_tier_check CHECK ((tier = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);

ALTER TABLE ONLY public.vendors FORCE ROW LEVEL SECURITY;


ALTER TABLE public.vendors OWNER TO postgres;

--
-- Name: webhook_contracts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webhook_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    webhook_key text NOT NULL,
    contract_version text NOT NULL,
    direction text NOT NULL,
    signing_secret_ref text NOT NULL,
    rate_limit_per_minute integer NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT webhook_contracts_direction_check CHECK ((direction = ANY (ARRAY['inbound'::text, 'outbound'::text]))),
    CONSTRAINT webhook_contracts_rate_limit_per_minute_check CHECK ((rate_limit_per_minute > 0)),
    CONSTRAINT webhook_contracts_status_check CHECK ((status = ANY (ARRAY['active'::text, 'disabled'::text])))
);

ALTER TABLE ONLY public.webhook_contracts FORCE ROW LEVEL SECURITY;


ALTER TABLE public.webhook_contracts OWNER TO postgres;

--
-- Name: webhook_deliveries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webhook_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    webhook_id uuid NOT NULL,
    idempotency_key text NOT NULL,
    payload_hash text NOT NULL,
    delivery_status text NOT NULL,
    attempts integer NOT NULL,
    last_error text,
    observed_at timestamp with time zone NOT NULL,
    classification public.cybernara_classification DEFAULT 'confidential'::public.cybernara_classification NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT webhook_deliveries_attempts_check CHECK ((attempts > 0)),
    CONSTRAINT webhook_deliveries_delivery_status_check CHECK ((delivery_status = ANY (ARRAY['pending'::text, 'delivered'::text, 'failed'::text, 'dead_lettered'::text])))
);

ALTER TABLE ONLY public.webhook_deliveries FORCE ROW LEVEL SECURITY;


ALTER TABLE public.webhook_deliveries OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea
)
PARTITION BY RANGE (inserted_at);


ALTER TABLE realtime.messages OWNER TO supabase_realtime_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


ALTER TABLE realtime.schema_migrations OWNER TO supabase_admin;

--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    selected_columns text[],
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


ALTER TABLE realtime.subscription OWNER TO supabase_admin;

--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;

--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE storage.buckets_analytics OWNER TO supabase_storage_admin;

--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.buckets_vectors OWNER TO supabase_storage_admin;

--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE storage.migrations OWNER TO supabase_storage_admin;

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


ALTER TABLE storage.objects OWNER TO supabase_storage_admin;

--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb,
    metadata jsonb
);


ALTER TABLE storage.s3_multipart_uploads OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.s3_multipart_uploads_parts OWNER TO supabase_storage_admin;

--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.vector_indexes OWNER TO supabase_storage_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: postgres
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    name text,
    applied_at timestamp with time zone DEFAULT now()
);


ALTER TABLE supabase_migrations.schema_migrations OWNER TO postgres;

--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: access_review_decisions access_review_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_review_decisions
    ADD CONSTRAINT access_review_decisions_pkey PRIMARY KEY (id);


--
-- Name: access_review_items access_review_items_access_review_id_principal_ref_resource_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_review_items
    ADD CONSTRAINT access_review_items_access_review_id_principal_ref_resource_key UNIQUE (access_review_id, principal_ref, resource_ref, entitlement_ref);


--
-- Name: access_review_items access_review_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_review_items
    ADD CONSTRAINT access_review_items_pkey PRIMARY KEY (id);


--
-- Name: access_reviews access_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_reviews
    ADD CONSTRAINT access_reviews_pkey PRIMARY KEY (id);


--
-- Name: ai_evaluation_runs ai_evaluation_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_evaluation_runs
    ADD CONSTRAINT ai_evaluation_runs_pkey PRIMARY KEY (id);


--
-- Name: ai_generation_runs ai_generation_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_generation_runs
    ADD CONSTRAINT ai_generation_runs_pkey PRIMARY KEY (id);


--
-- Name: ai_model_deployments ai_model_deployments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_model_deployments
    ADD CONSTRAINT ai_model_deployments_pkey PRIMARY KEY (id);


--
-- Name: ai_model_deployments ai_model_deployments_tenant_id_provider_model_name_deployme_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_model_deployments
    ADD CONSTRAINT ai_model_deployments_tenant_id_provider_model_name_deployme_key UNIQUE (tenant_id, provider, model_name, deployment_version, region);


--
-- Name: ai_output_reviews ai_output_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_output_reviews
    ADD CONSTRAINT ai_output_reviews_pkey PRIMARY KEY (id);


--
-- Name: ai_prompt_versions ai_prompt_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_prompt_versions
    ADD CONSTRAINT ai_prompt_versions_pkey PRIMARY KEY (id);


--
-- Name: ai_prompt_versions ai_prompt_versions_tenant_id_prompt_key_prompt_version_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_prompt_versions
    ADD CONSTRAINT ai_prompt_versions_tenant_id_prompt_key_prompt_version_key UNIQUE (tenant_id, prompt_key, prompt_version);


--
-- Name: ai_publication_events ai_publication_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_publication_events
    ADD CONSTRAINT ai_publication_events_pkey PRIMARY KEY (id);


--
-- Name: ai_publication_events ai_publication_events_target_type_target_id_approved_versio_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_publication_events
    ADD CONSTRAINT ai_publication_events_target_type_target_id_approved_versio_key UNIQUE (target_type, target_id, approved_version_id);


--
-- Name: ai_question_versions ai_question_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_question_versions
    ADD CONSTRAINT ai_question_versions_pkey PRIMARY KEY (id);


--
-- Name: ai_question_versions ai_question_versions_tenant_id_generation_run_id_question_v_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_question_versions
    ADD CONSTRAINT ai_question_versions_tenant_id_generation_run_id_question_v_key UNIQUE (tenant_id, generation_run_id, question_version);


--
-- Name: ai_retrieval_indexes ai_retrieval_indexes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_retrieval_indexes
    ADD CONSTRAINT ai_retrieval_indexes_pkey PRIMARY KEY (id);


--
-- Name: ai_retrieval_indexes ai_retrieval_indexes_tenant_id_index_key_index_version_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_retrieval_indexes
    ADD CONSTRAINT ai_retrieval_indexes_tenant_id_index_key_index_version_key UNIQUE (tenant_id, index_key, index_version);


--
-- Name: answer_revisions answer_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.answer_revisions
    ADD CONSTRAINT answer_revisions_pkey PRIMARY KEY (id);


--
-- Name: answer_revisions answer_revisions_tenant_id_assessment_item_id_revision_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.answer_revisions
    ADD CONSTRAINT answer_revisions_tenant_id_assessment_item_id_revision_key UNIQUE (tenant_id, assessment_item_id, revision);


--
-- Name: applicability_decisions applicability_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applicability_decisions
    ADD CONSTRAINT applicability_decisions_pkey PRIMARY KEY (id);


--
-- Name: assessment_frameworks assessment_frameworks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_frameworks
    ADD CONSTRAINT assessment_frameworks_pkey PRIMARY KEY (id);


--
-- Name: assessment_frameworks assessment_frameworks_tenant_id_assessment_id_framework_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_frameworks
    ADD CONSTRAINT assessment_frameworks_tenant_id_assessment_id_framework_key_key UNIQUE (tenant_id, assessment_id, framework_key);


--
-- Name: assessment_items assessment_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_items
    ADD CONSTRAINT assessment_items_pkey PRIMARY KEY (id);


--
-- Name: assessment_scopes assessment_scopes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_scopes
    ADD CONSTRAINT assessment_scopes_pkey PRIMARY KEY (id);


--
-- Name: assessment_signoffs assessment_signoffs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_signoffs
    ADD CONSTRAINT assessment_signoffs_pkey PRIMARY KEY (id);


--
-- Name: assessment_signoffs assessment_signoffs_tenant_id_assessment_id_scope_type_scop_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_signoffs
    ADD CONSTRAINT assessment_signoffs_tenant_id_assessment_id_scope_type_scop_key UNIQUE (tenant_id, assessment_id, scope_type, scope_id);


--
-- Name: assessment_snapshots assessment_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_snapshots
    ADD CONSTRAINT assessment_snapshots_pkey PRIMARY KEY (id);


--
-- Name: assessment_snapshots assessment_snapshots_tenant_id_assessment_id_sequence_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_snapshots
    ADD CONSTRAINT assessment_snapshots_tenant_id_assessment_id_sequence_key UNIQUE (tenant_id, assessment_id, sequence);


--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);


--
-- Name: assurance_alerts assurance_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assurance_alerts
    ADD CONSTRAINT assurance_alerts_pkey PRIMARY KEY (id);


--
-- Name: audit_checkpoints audit_checkpoints_chain_partition_end_sequence_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_checkpoints
    ADD CONSTRAINT audit_checkpoints_chain_partition_end_sequence_key UNIQUE (chain_partition, end_sequence);


--
-- Name: audit_checkpoints audit_checkpoints_chain_partition_start_sequence_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_checkpoints
    ADD CONSTRAINT audit_checkpoints_chain_partition_start_sequence_key UNIQUE (chain_partition, start_sequence);


--
-- Name: audit_checkpoints audit_checkpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_checkpoints
    ADD CONSTRAINT audit_checkpoints_pkey PRIMARY KEY (id);


--
-- Name: audit_engagements audit_engagements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_engagements
    ADD CONSTRAINT audit_engagements_pkey PRIMARY KEY (id);


--
-- Name: audit_events audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_pkey PRIMARY KEY (id);


--
-- Name: audit_events audit_events_tenant_id_event_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_tenant_id_event_hash_key UNIQUE (tenant_id, event_hash);


--
-- Name: audit_events audit_events_tenant_id_sequence_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_tenant_id_sequence_key UNIQUE (tenant_id, sequence);


--
-- Name: audit_requests audit_requests_audit_engagement_id_control_id_requested_fro_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_requests
    ADD CONSTRAINT audit_requests_audit_engagement_id_control_id_requested_fro_key UNIQUE (audit_engagement_id, control_id, requested_from);


--
-- Name: audit_requests audit_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_requests
    ADD CONSTRAINT audit_requests_pkey PRIMARY KEY (id);


--
-- Name: audit_tests audit_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_tests
    ADD CONSTRAINT audit_tests_pkey PRIMARY KEY (id);


--
-- Name: audit_verifications audit_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_verifications
    ADD CONSTRAINT audit_verifications_pkey PRIMARY KEY (id);


--
-- Name: authorization_decision_logs authorization_decision_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.authorization_decision_logs
    ADD CONSTRAINT authorization_decision_logs_pkey PRIMARY KEY (id);


--
-- Name: automated_control_tests automated_control_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automated_control_tests
    ADD CONSTRAINT automated_control_tests_pkey PRIMARY KEY (id);


--
-- Name: automated_test_runs automated_test_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automated_test_runs
    ADD CONSTRAINT automated_test_runs_pkey PRIMARY KEY (id);


--
-- Name: automated_test_runs automated_test_runs_tenant_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automated_test_runs
    ADD CONSTRAINT automated_test_runs_tenant_id_idempotency_key_key UNIQUE (tenant_id, idempotency_key);


--
-- Name: automated_tests automated_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automated_tests
    ADD CONSTRAINT automated_tests_pkey PRIMARY KEY (id);


--
-- Name: automated_tests automated_tests_tenant_id_control_id_connector_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automated_tests
    ADD CONSTRAINT automated_tests_tenant_id_control_id_connector_type_key UNIQUE (tenant_id, control_id, connector_type);


--
-- Name: backup_restore_tests backup_restore_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.backup_restore_tests
    ADD CONSTRAINT backup_restore_tests_pkey PRIMARY KEY (id);


--
-- Name: connector_objects connector_objects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connector_objects
    ADD CONSTRAINT connector_objects_pkey PRIMARY KEY (id);


--
-- Name: connector_objects connector_objects_tenant_id_connector_id_object_type_extern_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connector_objects
    ADD CONSTRAINT connector_objects_tenant_id_connector_id_object_type_extern_key UNIQUE (tenant_id, connector_id, object_type, external_id);


--
-- Name: connector_sync_runs connector_sync_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connector_sync_runs
    ADD CONSTRAINT connector_sync_runs_pkey PRIMARY KEY (id);


--
-- Name: connectors connectors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connectors
    ADD CONSTRAINT connectors_pkey PRIMARY KEY (id);


--
-- Name: connectors connectors_tenant_id_connector_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connectors
    ADD CONSTRAINT connectors_tenant_id_connector_key_key UNIQUE (tenant_id, connector_key);


--
-- Name: consent_events consent_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consent_events
    ADD CONSTRAINT consent_events_pkey PRIMARY KEY (id);


--
-- Name: consent_events consent_events_tenant_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consent_events
    ADD CONSTRAINT consent_events_tenant_id_idempotency_key_key UNIQUE (tenant_id, idempotency_key);


--
-- Name: consent_purposes consent_purposes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consent_purposes
    ADD CONSTRAINT consent_purposes_pkey PRIMARY KEY (id);


--
-- Name: consent_records consent_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consent_records
    ADD CONSTRAINT consent_records_pkey PRIMARY KEY (id);


--
-- Name: content_rejected_records content_rejected_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_rejected_records
    ADD CONSTRAINT content_rejected_records_pkey PRIMARY KEY (id);


--
-- Name: content_source_packages content_source_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_source_packages
    ADD CONSTRAINT content_source_packages_pkey PRIMARY KEY (id);


--
-- Name: content_source_packages content_source_packages_tenant_id_source_file_name_source_s_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_source_packages
    ADD CONSTRAINT content_source_packages_tenant_id_source_file_name_source_s_key UNIQUE (tenant_id, source_file_name, source_sha256);


--
-- Name: control_instances control_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.control_instances
    ADD CONSTRAINT control_instances_pkey PRIMARY KEY (id);


--
-- Name: control_instances control_instances_tenant_id_assessment_id_control_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.control_instances
    ADD CONSTRAINT control_instances_tenant_id_assessment_id_control_id_key UNIQUE (tenant_id, assessment_id, control_id);


--
-- Name: control_mappings control_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.control_mappings
    ADD CONSTRAINT control_mappings_pkey PRIMARY KEY (id);


--
-- Name: control_mappings control_mappings_tenant_id_framework_key_source_control_id__key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.control_mappings
    ADD CONSTRAINT control_mappings_tenant_id_framework_key_source_control_id__key UNIQUE (tenant_id, framework_key, source_control_id, harmonized_control_id, source_workbook, source_row_number);


--
-- Name: control_sets control_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.control_sets
    ADD CONSTRAINT control_sets_pkey PRIMARY KEY (id);


--
-- Name: control_sets control_sets_tenant_id_framework_version_id_set_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.control_sets
    ADD CONSTRAINT control_sets_tenant_id_framework_version_id_set_key_key UNIQUE (tenant_id, framework_version_id, set_key);


--
-- Name: control_subcontrols control_subcontrols_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.control_subcontrols
    ADD CONSTRAINT control_subcontrols_pkey PRIMARY KEY (id);


--
-- Name: control_subcontrols control_subcontrols_tenant_id_control_id_subcontrol_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.control_subcontrols
    ADD CONSTRAINT control_subcontrols_tenant_id_control_id_subcontrol_key_key UNIQUE (tenant_id, control_id, subcontrol_key);


--
-- Name: control_test_results control_test_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.control_test_results
    ADD CONSTRAINT control_test_results_pkey PRIMARY KEY (id);


--
-- Name: controls controls_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.controls
    ADD CONSTRAINT controls_pkey PRIMARY KEY (id);


--
-- Name: controls controls_tenant_id_control_set_id_control_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.controls
    ADD CONSTRAINT controls_tenant_id_control_set_id_control_key_key UNIQUE (tenant_id, control_set_id, control_key);


--
-- Name: custom_field_definitions custom_field_definitions_object_definition_id_field_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_field_definitions
    ADD CONSTRAINT custom_field_definitions_object_definition_id_field_key_key UNIQUE (object_definition_id, field_key);


--
-- Name: custom_field_definitions custom_field_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_field_definitions
    ADD CONSTRAINT custom_field_definitions_pkey PRIMARY KEY (id);


--
-- Name: custom_object_definitions custom_object_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_object_definitions
    ADD CONSTRAINT custom_object_definitions_pkey PRIMARY KEY (id);


--
-- Name: custom_object_definitions custom_object_definitions_tenant_id_object_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_object_definitions
    ADD CONSTRAINT custom_object_definitions_tenant_id_object_key_key UNIQUE (tenant_id, object_key);


--
-- Name: custom_records custom_records_object_definition_id_record_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_records
    ADD CONSTRAINT custom_records_object_definition_id_record_key_key UNIQUE (object_definition_id, record_key);


--
-- Name: custom_records custom_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_records
    ADD CONSTRAINT custom_records_pkey PRIMARY KEY (id);


--
-- Name: custom_values custom_values_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_values
    ADD CONSTRAINT custom_values_pkey PRIMARY KEY (id);


--
-- Name: custom_values custom_values_record_id_field_definition_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_values
    ADD CONSTRAINT custom_values_record_id_field_definition_id_key UNIQUE (record_id, field_definition_id);


--
-- Name: data_categories data_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_categories
    ADD CONSTRAINT data_categories_pkey PRIMARY KEY (id);


--
-- Name: data_categories data_categories_tenant_id_category_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_categories
    ADD CONSTRAINT data_categories_tenant_id_category_key_key UNIQUE (tenant_id, category_key);


--
-- Name: data_discovery_findings data_discovery_findings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_discovery_findings
    ADD CONSTRAINT data_discovery_findings_pkey PRIMARY KEY (id);


--
-- Name: data_discovery_findings data_discovery_findings_scan_id_locator_hash_data_category__key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_discovery_findings
    ADD CONSTRAINT data_discovery_findings_scan_id_locator_hash_data_category__key UNIQUE (scan_id, locator_hash, data_category_id);


--
-- Name: data_discovery_scans data_discovery_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_discovery_scans
    ADD CONSTRAINT data_discovery_scans_pkey PRIMARY KEY (id);


--
-- Name: data_discovery_scans data_discovery_scans_tenant_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_discovery_scans
    ADD CONSTRAINT data_discovery_scans_tenant_id_idempotency_key_key UNIQUE (tenant_id, idempotency_key);


--
-- Name: data_inventory_records data_inventory_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_inventory_records
    ADD CONSTRAINT data_inventory_records_pkey PRIMARY KEY (id);


--
-- Name: data_subject_categories data_subject_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_subject_categories
    ADD CONSTRAINT data_subject_categories_pkey PRIMARY KEY (id);


--
-- Name: data_subject_categories data_subject_categories_tenant_id_subject_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_subject_categories
    ADD CONSTRAINT data_subject_categories_tenant_id_subject_key_key UNIQUE (tenant_id, subject_key);


--
-- Name: deletion_items deletion_items_deletion_job_id_target_type_target_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deletion_items
    ADD CONSTRAINT deletion_items_deletion_job_id_target_type_target_id_key UNIQUE (deletion_job_id, target_type, target_id);


--
-- Name: deletion_items deletion_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deletion_items
    ADD CONSTRAINT deletion_items_pkey PRIMARY KEY (id);


--
-- Name: deletion_jobs deletion_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deletion_jobs
    ADD CONSTRAINT deletion_jobs_pkey PRIMARY KEY (id);


--
-- Name: dpia_assessments dpia_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dpia_assessments
    ADD CONSTRAINT dpia_assessments_pkey PRIMARY KEY (id);


--
-- Name: dpia_risks dpia_risks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dpia_risks
    ADD CONSTRAINT dpia_risks_pkey PRIMARY KEY (id);


--
-- Name: dpias dpias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dpias
    ADD CONSTRAINT dpias_pkey PRIMARY KEY (id);


--
-- Name: encryption_key_records encryption_key_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encryption_key_records
    ADD CONSTRAINT encryption_key_records_pkey PRIMARY KEY (id);


--
-- Name: evaluation_cases evaluation_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_cases
    ADD CONSTRAINT evaluation_cases_pkey PRIMARY KEY (id);


--
-- Name: evaluation_cases evaluation_cases_suite_id_case_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_cases
    ADD CONSTRAINT evaluation_cases_suite_id_case_key_key UNIQUE (suite_id, case_key);


--
-- Name: evaluation_results evaluation_results_evaluation_run_id_case_id_metric_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_results
    ADD CONSTRAINT evaluation_results_evaluation_run_id_case_id_metric_key UNIQUE (evaluation_run_id, case_id, metric);


--
-- Name: evaluation_results evaluation_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_results
    ADD CONSTRAINT evaluation_results_pkey PRIMARY KEY (id);


--
-- Name: evaluation_suites evaluation_suites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_suites
    ADD CONSTRAINT evaluation_suites_pkey PRIMARY KEY (id);


--
-- Name: evaluation_suites evaluation_suites_tenant_id_use_case_suite_key_suite_versio_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_suites
    ADD CONSTRAINT evaluation_suites_tenant_id_use_case_suite_key_suite_versio_key UNIQUE (tenant_id, use_case, suite_key, suite_version);


--
-- Name: evidence_custody_events evidence_custody_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_custody_events
    ADD CONSTRAINT evidence_custody_events_pkey PRIMARY KEY (id);


--
-- Name: evidence_expiry_events evidence_expiry_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_expiry_events
    ADD CONSTRAINT evidence_expiry_events_pkey PRIMARY KEY (id);


--
-- Name: evidence_links evidence_links_evidence_version_id_target_type_target_id_pu_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_links
    ADD CONSTRAINT evidence_links_evidence_version_id_target_type_target_id_pu_key UNIQUE (evidence_version_id, target_type, target_id, purpose);


--
-- Name: evidence_links evidence_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_links
    ADD CONSTRAINT evidence_links_pkey PRIMARY KEY (id);


--
-- Name: evidence_objects evidence_objects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_objects
    ADD CONSTRAINT evidence_objects_pkey PRIMARY KEY (id);


--
-- Name: evidence_requests evidence_requests_assessment_id_control_instance_id_request_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_requests
    ADD CONSTRAINT evidence_requests_assessment_id_control_instance_id_request_key UNIQUE (assessment_id, control_instance_id, requested_from);


--
-- Name: evidence_requests evidence_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_requests
    ADD CONSTRAINT evidence_requests_pkey PRIMARY KEY (id);


--
-- Name: evidence_reviews evidence_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_reviews
    ADD CONSTRAINT evidence_reviews_pkey PRIMARY KEY (id);


--
-- Name: evidence_samples evidence_samples_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_samples
    ADD CONSTRAINT evidence_samples_pkey PRIMARY KEY (id);


--
-- Name: evidence_versions evidence_versions_evidence_id_evidence_version_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_versions
    ADD CONSTRAINT evidence_versions_evidence_id_evidence_version_no_key UNIQUE (evidence_id, evidence_version_no);


--
-- Name: evidence_versions evidence_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_versions
    ADD CONSTRAINT evidence_versions_pkey PRIMARY KEY (id);


--
-- Name: export_manifests export_manifests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_manifests
    ADD CONSTRAINT export_manifests_pkey PRIMARY KEY (id);


--
-- Name: export_manifests export_manifests_tenant_id_snapshot_id_template_version_man_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_manifests
    ADD CONSTRAINT export_manifests_tenant_id_snapshot_id_template_version_man_key UNIQUE (tenant_id, snapshot_id, template_version, manifest_hash);


--
-- Name: findings findings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.findings
    ADD CONSTRAINT findings_pkey PRIMARY KEY (id);


--
-- Name: framework_content_packs framework_content_packs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_content_packs
    ADD CONSTRAINT framework_content_packs_pkey PRIMARY KEY (id);


--
-- Name: framework_content_packs framework_content_packs_tenant_id_framework_key_pack_versio_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_content_packs
    ADD CONSTRAINT framework_content_packs_tenant_id_framework_key_pack_versio_key UNIQUE (tenant_id, framework_key, pack_version);


--
-- Name: framework_diff_items framework_diff_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_diff_items
    ADD CONSTRAINT framework_diff_items_pkey PRIMARY KEY (id);


--
-- Name: framework_diffs framework_diffs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_diffs
    ADD CONSTRAINT framework_diffs_pkey PRIMARY KEY (id);


--
-- Name: framework_diffs framework_diffs_tenant_id_from_version_id_to_version_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_diffs
    ADD CONSTRAINT framework_diffs_tenant_id_from_version_id_to_version_id_key UNIQUE (tenant_id, from_version_id, to_version_id);


--
-- Name: framework_requirements framework_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_requirements
    ADD CONSTRAINT framework_requirements_pkey PRIMARY KEY (id);


--
-- Name: framework_requirements framework_requirements_source_row_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_requirements
    ADD CONSTRAINT framework_requirements_source_row_key UNIQUE (tenant_id, source_workbook, source_sheet, source_row_number);


--
-- Name: framework_requirements framework_requirements_tenant_id_framework_pack_id_control__key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_requirements
    ADD CONSTRAINT framework_requirements_tenant_id_framework_pack_id_control__key UNIQUE (tenant_id, framework_pack_id, control_id, sub_control_id, source_sheet, source_row_number);


--
-- Name: framework_update_impacts framework_update_impacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_update_impacts
    ADD CONSTRAINT framework_update_impacts_pkey PRIMARY KEY (id);


--
-- Name: framework_update_impacts framework_update_impacts_tenant_id_diff_item_id_assessment__key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_update_impacts
    ADD CONSTRAINT framework_update_impacts_tenant_id_diff_item_id_assessment__key UNIQUE (tenant_id, diff_item_id, assessment_id, control_instance_id);


--
-- Name: framework_versions framework_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_versions
    ADD CONSTRAINT framework_versions_pkey PRIMARY KEY (id);


--
-- Name: framework_versions framework_versions_tenant_id_framework_id_version_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_versions
    ADD CONSTRAINT framework_versions_tenant_id_framework_id_version_key_key UNIQUE (tenant_id, framework_id, version_key);


--
-- Name: frameworks frameworks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.frameworks
    ADD CONSTRAINT frameworks_pkey PRIMARY KEY (id);


--
-- Name: frameworks frameworks_tenant_id_framework_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.frameworks
    ADD CONSTRAINT frameworks_tenant_id_framework_key_key UNIQUE (tenant_id, framework_key);


--
-- Name: generation_citations generation_citations_generation_run_id_output_path_knowledg_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generation_citations
    ADD CONSTRAINT generation_citations_generation_run_id_output_path_knowledg_key UNIQUE (generation_run_id, output_path, knowledge_chunk_id);


--
-- Name: generation_citations generation_citations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generation_citations
    ADD CONSTRAINT generation_citations_pkey PRIMARY KEY (id);


--
-- Name: grc_workspaces grc_workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grc_workspaces
    ADD CONSTRAINT grc_workspaces_pkey PRIMARY KEY (id);


--
-- Name: harmonized_controls harmonized_controls_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.harmonized_controls
    ADD CONSTRAINT harmonized_controls_pkey PRIMARY KEY (id);


--
-- Name: harmonized_controls harmonized_controls_tenant_id_harmonized_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.harmonized_controls
    ADD CONSTRAINT harmonized_controls_tenant_id_harmonized_id_key UNIQUE (tenant_id, harmonized_id);


--
-- Name: identity_role_grants identity_role_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_role_grants
    ADD CONSTRAINT identity_role_grants_pkey PRIMARY KEY (id);


--
-- Name: identity_role_grants identity_role_grants_tenant_id_user_id_role_id_resource_typ_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_role_grants
    ADD CONSTRAINT identity_role_grants_tenant_id_user_id_role_id_resource_typ_key UNIQUE (tenant_id, user_id, role_id, resource_type, resource_id);


--
-- Name: identity_roles identity_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_roles
    ADD CONSTRAINT identity_roles_pkey PRIMARY KEY (id);


--
-- Name: identity_roles identity_roles_tenant_id_role_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_roles
    ADD CONSTRAINT identity_roles_tenant_id_role_key_key UNIQUE (tenant_id, role_key);


--
-- Name: identity_service_accounts identity_service_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_service_accounts
    ADD CONSTRAINT identity_service_accounts_pkey PRIMARY KEY (id);


--
-- Name: identity_service_accounts identity_service_accounts_tenant_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_service_accounts
    ADD CONSTRAINT identity_service_accounts_tenant_id_name_key UNIQUE (tenant_id, name);


--
-- Name: identity_sessions identity_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_sessions
    ADD CONSTRAINT identity_sessions_pkey PRIMARY KEY (id);


--
-- Name: identity_sessions identity_sessions_tenant_id_supabase_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_sessions
    ADD CONSTRAINT identity_sessions_tenant_id_supabase_session_id_key UNIQUE (tenant_id, supabase_session_id);


--
-- Name: identity_tenants identity_tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_tenants
    ADD CONSTRAINT identity_tenants_pkey PRIMARY KEY (id);


--
-- Name: identity_users identity_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_users
    ADD CONSTRAINT identity_users_pkey PRIMARY KEY (id);


--
-- Name: identity_users identity_users_tenant_id_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_users
    ADD CONSTRAINT identity_users_tenant_id_email_key UNIQUE (tenant_id, email);


--
-- Name: identity_users identity_users_tenant_id_supabase_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_users
    ADD CONSTRAINT identity_users_tenant_id_supabase_user_id_key UNIQUE (tenant_id, supabase_user_id);


--
-- Name: identity_workspace_delegations identity_workspace_delegations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_workspace_delegations
    ADD CONSTRAINT identity_workspace_delegations_pkey PRIMARY KEY (id);


--
-- Name: incident_assessments incident_assessments_incident_id_jurisdiction_assessment_ve_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_assessments
    ADD CONSTRAINT incident_assessments_incident_id_jurisdiction_assessment_ve_key UNIQUE (incident_id, jurisdiction, assessment_version_no);


--
-- Name: incident_assessments incident_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_assessments
    ADD CONSTRAINT incident_assessments_pkey PRIMARY KEY (id);


--
-- Name: incident_notifications incident_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_notifications
    ADD CONSTRAINT incident_notifications_pkey PRIMARY KEY (id);


--
-- Name: knowledge_chunks knowledge_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_chunks
    ADD CONSTRAINT knowledge_chunks_pkey PRIMARY KEY (id);


--
-- Name: knowledge_chunks knowledge_chunks_retrieval_index_id_source_id_content_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_chunks
    ADD CONSTRAINT knowledge_chunks_retrieval_index_id_source_id_content_hash_key UNIQUE (retrieval_index_id, source_id, content_hash);


--
-- Name: lawful_bases lawful_bases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lawful_bases
    ADD CONSTRAINT lawful_bases_pkey PRIMARY KEY (id);


--
-- Name: lawful_bases lawful_bases_tenant_id_jurisdiction_basis_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lawful_bases
    ADD CONSTRAINT lawful_bases_tenant_id_jurisdiction_basis_key_key UNIQUE (tenant_id, jurisdiction, basis_key);


--
-- Name: legal_hold_items legal_hold_items_legal_hold_id_target_type_target_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_hold_items
    ADD CONSTRAINT legal_hold_items_legal_hold_id_target_type_target_id_key UNIQUE (legal_hold_id, target_type, target_id);


--
-- Name: legal_hold_items legal_hold_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_hold_items
    ADD CONSTRAINT legal_hold_items_pkey PRIMARY KEY (id);


--
-- Name: legal_holds legal_holds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_holds
    ADD CONSTRAINT legal_holds_pkey PRIMARY KEY (id);


--
-- Name: legal_holds legal_holds_tenant_id_hold_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_holds
    ADD CONSTRAINT legal_holds_tenant_id_hold_key_key UNIQUE (tenant_id, hold_key);


--
-- Name: malware_scan_results malware_scan_results_evidence_version_id_engine_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.malware_scan_results
    ADD CONSTRAINT malware_scan_results_evidence_version_id_engine_key UNIQUE (evidence_version_id, engine);


--
-- Name: malware_scan_results malware_scan_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.malware_scan_results
    ADD CONSTRAINT malware_scan_results_pkey PRIMARY KEY (id);


--
-- Name: mapping_conflicts mapping_conflicts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mapping_conflicts
    ADD CONSTRAINT mapping_conflicts_pkey PRIMARY KEY (id);


--
-- Name: mapping_reviews mapping_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mapping_reviews
    ADD CONSTRAINT mapping_reviews_pkey PRIMARY KEY (id);


--
-- Name: mapping_versions mapping_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mapping_versions
    ADD CONSTRAINT mapping_versions_pkey PRIMARY KEY (id);


--
-- Name: mapping_versions mapping_versions_tenant_id_version_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mapping_versions
    ADD CONSTRAINT mapping_versions_tenant_id_version_key_key UNIQUE (tenant_id, version_key);


--
-- Name: outbox_events outbox_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT outbox_events_pkey PRIMARY KEY (id);


--
-- Name: outbox_events outbox_events_tenant_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT outbox_events_tenant_id_idempotency_key_key UNIQUE (tenant_id, idempotency_key);


--
-- Name: policies policies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_pkey PRIMARY KEY (id);


--
-- Name: policies policies_tenant_id_policy_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_tenant_id_policy_key_key UNIQUE (tenant_id, policy_key);


--
-- Name: policy_attestations policy_attestations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policy_attestations
    ADD CONSTRAINT policy_attestations_pkey PRIMARY KEY (id);


--
-- Name: policy_attestations policy_attestations_policy_version_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policy_attestations
    ADD CONSTRAINT policy_attestations_policy_version_id_user_id_key UNIQUE (policy_version_id, user_id);


--
-- Name: policy_control_links policy_control_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policy_control_links
    ADD CONSTRAINT policy_control_links_pkey PRIMARY KEY (id);


--
-- Name: policy_control_links policy_control_links_policy_version_id_control_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policy_control_links
    ADD CONSTRAINT policy_control_links_policy_version_id_control_id_key UNIQUE (policy_version_id, control_id);


--
-- Name: policy_versions policy_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policy_versions
    ADD CONSTRAINT policy_versions_pkey PRIMARY KEY (id);


--
-- Name: policy_versions policy_versions_tenant_id_template_key_policy_version_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policy_versions
    ADD CONSTRAINT policy_versions_tenant_id_template_key_policy_version_key UNIQUE (tenant_id, template_key, policy_version);


--
-- Name: privacy_incidents privacy_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.privacy_incidents
    ADD CONSTRAINT privacy_incidents_pkey PRIMARY KEY (id);


--
-- Name: privacy_notice_versions privacy_notice_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.privacy_notice_versions
    ADD CONSTRAINT privacy_notice_versions_pkey PRIMARY KEY (id);


--
-- Name: privacy_notice_versions privacy_notice_versions_privacy_notice_id_notice_version_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.privacy_notice_versions
    ADD CONSTRAINT privacy_notice_versions_privacy_notice_id_notice_version_no_key UNIQUE (privacy_notice_id, notice_version_no);


--
-- Name: privacy_notices privacy_notices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.privacy_notices
    ADD CONSTRAINT privacy_notices_pkey PRIMARY KEY (id);


--
-- Name: privacy_notices privacy_notices_tenant_id_notice_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.privacy_notices
    ADD CONSTRAINT privacy_notices_tenant_id_notice_key_key UNIQUE (tenant_id, notice_key);


--
-- Name: privacy_rights_requests privacy_rights_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.privacy_rights_requests
    ADD CONSTRAINT privacy_rights_requests_pkey PRIMARY KEY (id);


--
-- Name: processing_activities processing_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processing_activities
    ADD CONSTRAINT processing_activities_pkey PRIMARY KEY (id);


--
-- Name: processing_inventory_links processing_inventory_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processing_inventory_links
    ADD CONSTRAINT processing_inventory_links_pkey PRIMARY KEY (id);


--
-- Name: processing_inventory_links processing_inventory_links_processing_activity_id_inventory_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processing_inventory_links
    ADD CONSTRAINT processing_inventory_links_processing_activity_id_inventory_key UNIQUE (processing_activity_id, inventory_record_id, role);


--
-- Name: processing_purposes processing_purposes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processing_purposes
    ADD CONSTRAINT processing_purposes_pkey PRIMARY KEY (id);


--
-- Name: processing_recipients processing_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processing_recipients
    ADD CONSTRAINT processing_recipients_pkey PRIMARY KEY (id);


--
-- Name: processing_recipients processing_recipients_processing_activity_id_recipient_id_p_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processing_recipients
    ADD CONSTRAINT processing_recipients_processing_activity_id_recipient_id_p_key UNIQUE (processing_activity_id, recipient_id, purpose_id);


--
-- Name: product_assurance_evidence product_assurance_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_assurance_evidence
    ADD CONSTRAINT product_assurance_evidence_pkey PRIMARY KEY (id);


--
-- Name: purposes purposes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purposes
    ADD CONSTRAINT purposes_pkey PRIMARY KEY (id);


--
-- Name: purposes purposes_tenant_id_purpose_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purposes
    ADD CONSTRAINT purposes_tenant_id_purpose_key_key UNIQUE (tenant_id, purpose_key);


--
-- Name: question_sets question_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_sets
    ADD CONSTRAINT question_sets_pkey PRIMARY KEY (id);


--
-- Name: question_sets question_sets_tenant_id_control_id_question_set_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_sets
    ADD CONSTRAINT question_sets_tenant_id_control_id_question_set_key_key UNIQUE (tenant_id, control_id, question_set_key);


--
-- Name: question_versions question_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_versions
    ADD CONSTRAINT question_versions_pkey PRIMARY KEY (id);


--
-- Name: question_versions question_versions_tenant_id_question_set_id_question_versio_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_versions
    ADD CONSTRAINT question_versions_tenant_id_question_set_id_question_versio_key UNIQUE (tenant_id, question_set_id, question_version);


--
-- Name: rate_limit_policies rate_limit_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rate_limit_policies
    ADD CONSTRAINT rate_limit_policies_pkey PRIMARY KEY (id);


--
-- Name: rate_limit_policies rate_limit_policies_tenant_id_policy_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rate_limit_policies
    ADD CONSTRAINT rate_limit_policies_tenant_id_policy_key_key UNIQUE (tenant_id, policy_key);


--
-- Name: recipients recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipients
    ADD CONSTRAINT recipients_pkey PRIMARY KEY (id);


--
-- Name: recipients recipients_tenant_id_name_recipient_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipients
    ADD CONSTRAINT recipients_tenant_id_name_recipient_type_key UNIQUE (tenant_id, name, recipient_type);


--
-- Name: remediation_tasks remediation_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.remediation_tasks
    ADD CONSTRAINT remediation_tasks_pkey PRIMARY KEY (id);


--
-- Name: report_exports report_exports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_exports
    ADD CONSTRAINT report_exports_pkey PRIMARY KEY (id);


--
-- Name: report_exports report_exports_tenant_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_exports
    ADD CONSTRAINT report_exports_tenant_id_idempotency_key_key UNIQUE (tenant_id, idempotency_key);


--
-- Name: report_templates report_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_pkey PRIMARY KEY (id);


--
-- Name: report_templates report_templates_tenant_id_template_key_template_version_fo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_tenant_id_template_key_template_version_fo_key UNIQUE (tenant_id, template_key, template_version, format);


--
-- Name: requirement_instances requirement_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requirement_instances
    ADD CONSTRAINT requirement_instances_pkey PRIMARY KEY (id);


--
-- Name: requirement_instances requirement_instances_tenant_id_assessment_id_requirement_i_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requirement_instances
    ADD CONSTRAINT requirement_instances_tenant_id_assessment_id_requirement_i_key UNIQUE (tenant_id, assessment_id, requirement_id);


--
-- Name: retention_assignments retention_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retention_assignments
    ADD CONSTRAINT retention_assignments_pkey PRIMARY KEY (id);


--
-- Name: retention_rules retention_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retention_rules
    ADD CONSTRAINT retention_rules_pkey PRIMARY KEY (id);


--
-- Name: retention_schedules retention_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retention_schedules
    ADD CONSTRAINT retention_schedules_pkey PRIMARY KEY (id);


--
-- Name: retrieval_runs retrieval_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retrieval_runs
    ADD CONSTRAINT retrieval_runs_pkey PRIMARY KEY (id);


--
-- Name: retrieved_chunks retrieved_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retrieved_chunks
    ADD CONSTRAINT retrieved_chunks_pkey PRIMARY KEY (id);


--
-- Name: retrieved_chunks retrieved_chunks_retrieval_run_id_knowledge_chunk_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retrieved_chunks
    ADD CONSTRAINT retrieved_chunks_retrieval_run_id_knowledge_chunk_id_key UNIQUE (retrieval_run_id, knowledge_chunk_id);


--
-- Name: retrieved_chunks retrieved_chunks_retrieval_run_id_rank_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retrieved_chunks
    ADD CONSTRAINT retrieved_chunks_retrieval_run_id_rank_key UNIQUE (retrieval_run_id, rank);


--
-- Name: review_decisions review_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_decisions
    ADD CONSTRAINT review_decisions_pkey PRIMARY KEY (id);


--
-- Name: rights_request_tasks rights_request_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rights_request_tasks
    ADD CONSTRAINT rights_request_tasks_pkey PRIMARY KEY (id);


--
-- Name: rights_request_tasks rights_request_tasks_rights_request_id_system_id_task_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rights_request_tasks
    ADD CONSTRAINT rights_request_tasks_rights_request_id_system_id_task_type_key UNIQUE (rights_request_id, system_id, task_type);


--
-- Name: risk_acceptance_reviews risk_acceptance_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_acceptance_reviews
    ADD CONSTRAINT risk_acceptance_reviews_pkey PRIMARY KEY (id);


--
-- Name: risk_acceptances risk_acceptances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_acceptances
    ADD CONSTRAINT risk_acceptances_pkey PRIMARY KEY (id);


--
-- Name: risk_links risk_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_links
    ADD CONSTRAINT risk_links_pkey PRIMARY KEY (id);


--
-- Name: risk_links risk_links_risk_id_target_type_target_id_relationship_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_links
    ADD CONSTRAINT risk_links_risk_id_target_type_target_id_relationship_key UNIQUE (risk_id, target_type, target_id, relationship);


--
-- Name: risk_models risk_models_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_models
    ADD CONSTRAINT risk_models_pkey PRIMARY KEY (id);


--
-- Name: risk_models risk_models_tenant_id_model_key_model_version_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_models
    ADD CONSTRAINT risk_models_tenant_id_model_key_model_version_key UNIQUE (tenant_id, model_key, model_version);


--
-- Name: risk_treatments risk_treatments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_treatments
    ADD CONSTRAINT risk_treatments_pkey PRIMARY KEY (id);


--
-- Name: risks risks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_pkey PRIMARY KEY (id);


--
-- Name: risks risks_tenant_id_risk_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_tenant_id_risk_key_key UNIQUE (tenant_id, risk_key);


--
-- Name: safety_checks safety_checks_generation_run_id_check_type_policy_version_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.safety_checks
    ADD CONSTRAINT safety_checks_generation_run_id_check_type_policy_version_key UNIQUE (generation_run_id, check_type, policy_version);


--
-- Name: safety_checks safety_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.safety_checks
    ADD CONSTRAINT safety_checks_pkey PRIMARY KEY (id);


--
-- Name: sdlc_release_gates sdlc_release_gates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sdlc_release_gates
    ADD CONSTRAINT sdlc_release_gates_pkey PRIMARY KEY (id);


--
-- Name: siem_export_records siem_export_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.siem_export_records
    ADD CONSTRAINT siem_export_records_pkey PRIMARY KEY (id);


--
-- Name: systems_assets systems_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.systems_assets
    ADD CONSTRAINT systems_assets_pkey PRIMARY KEY (id);


--
-- Name: systems_assets systems_assets_tenant_id_workspace_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.systems_assets
    ADD CONSTRAINT systems_assets_tenant_id_workspace_id_name_key UNIQUE (tenant_id, workspace_id, name);


--
-- Name: tenant_catalog_subscriptions tenant_catalog_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_catalog_subscriptions
    ADD CONSTRAINT tenant_catalog_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: test_procedures test_procedures_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_procedures
    ADD CONSTRAINT test_procedures_pkey PRIMARY KEY (id);


--
-- Name: test_procedures test_procedures_tenant_id_control_id_procedure_key_version_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_procedures
    ADD CONSTRAINT test_procedures_tenant_id_control_id_procedure_key_version_key UNIQUE (tenant_id, control_id, procedure_key, version);


--
-- Name: transfers transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_pkey PRIMARY KEY (id);


--
-- Name: trust_center_artifacts trust_center_artifacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trust_center_artifacts
    ADD CONSTRAINT trust_center_artifacts_pkey PRIMARY KEY (id);


--
-- Name: universal_tasks universal_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.universal_tasks
    ADD CONSTRAINT universal_tasks_pkey PRIMARY KEY (id);


--
-- Name: universal_tasks universal_tasks_tenant_id_target_type_target_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.universal_tasks
    ADD CONSTRAINT universal_tasks_tenant_id_target_type_target_id_key UNIQUE (tenant_id, target_type, target_id);


--
-- Name: upload_sessions upload_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.upload_sessions
    ADD CONSTRAINT upload_sessions_pkey PRIMARY KEY (id);


--
-- Name: vendor_assessments vendor_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_assessments
    ADD CONSTRAINT vendor_assessments_pkey PRIMARY KEY (id);


--
-- Name: vendor_assessments vendor_assessments_vendor_id_assessment_type_period_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_assessments
    ADD CONSTRAINT vendor_assessments_vendor_id_assessment_type_period_key UNIQUE (vendor_id, assessment_type, period);


--
-- Name: vendor_findings vendor_findings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_findings
    ADD CONSTRAINT vendor_findings_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: webhook_contracts webhook_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_contracts
    ADD CONSTRAINT webhook_contracts_pkey PRIMARY KEY (id);


--
-- Name: webhook_contracts webhook_contracts_tenant_id_webhook_key_contract_version_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_contracts
    ADD CONSTRAINT webhook_contracts_tenant_id_webhook_key_contract_version_key UNIQUE (tenant_id, webhook_key, contract_version);


--
-- Name: webhook_deliveries webhook_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_pkey PRIMARY KEY (id);


--
-- Name: webhook_deliveries webhook_deliveries_tenant_id_webhook_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_tenant_id_webhook_id_idempotency_key_key UNIQUE (tenant_id, webhook_id, idempotency_key);


--
-- Name: messages messages_payload_exclusive; Type: CHECK CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.messages
    ADD CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL))) NOT VALID;


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: postgres
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: idx_users_created_at_desc; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_users_created_at_desc ON auth.users USING btree (created_at DESC);


--
-- Name: idx_users_email; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_users_email ON auth.users USING btree (email);


--
-- Name: idx_users_last_sign_in_at_desc; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_users_last_sign_in_at_desc ON auth.users USING btree (last_sign_in_at DESC);


--
-- Name: idx_users_name; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_users_name ON auth.users USING btree (((raw_user_meta_data ->> 'name'::text))) WHERE ((raw_user_meta_data ->> 'name'::text) IS NOT NULL);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


--
-- Name: framework_diff_items_diff_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX framework_diff_items_diff_id_idx ON public.framework_diff_items USING btree (tenant_id, diff_id);


--
-- Name: framework_update_impacts_assessment_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX framework_update_impacts_assessment_idx ON public.framework_update_impacts USING btree (tenant_id, assessment_id);


--
-- Name: framework_update_impacts_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX framework_update_impacts_status_idx ON public.framework_update_impacts USING btree (tenant_id, status);


--
-- Name: idx_access_review_decisions_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_access_review_decisions_item ON public.access_review_decisions USING btree (review_item_id, decision);


--
-- Name: idx_access_review_items_review; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_access_review_items_review ON public.access_review_items USING btree (access_review_id);


--
-- Name: idx_ai_generation_runs_tenant_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_generation_runs_tenant_status ON public.ai_generation_runs USING btree (tenant_id, status);


--
-- Name: idx_ai_output_reviews_generation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_output_reviews_generation ON public.ai_output_reviews USING btree (tenant_id, generation_run_id);


--
-- Name: idx_ai_publication_events_target; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_publication_events_target ON public.ai_publication_events USING btree (target_type, target_id);


--
-- Name: idx_ai_question_versions_generation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_question_versions_generation ON public.ai_question_versions USING btree (tenant_id, generation_run_id);


--
-- Name: idx_answer_revisions_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_answer_revisions_item ON public.answer_revisions USING btree (tenant_id, assessment_item_id, revision);


--
-- Name: idx_applicability_decisions_control_instance; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_applicability_decisions_control_instance ON public.applicability_decisions USING btree (tenant_id, control_instance_id);


--
-- Name: idx_assessment_frameworks_assessment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assessment_frameworks_assessment ON public.assessment_frameworks USING btree (tenant_id, assessment_id);


--
-- Name: idx_assessment_items_assessment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assessment_items_assessment ON public.assessment_items USING btree (tenant_id, assessment_id);


--
-- Name: idx_assessment_items_control_instance; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assessment_items_control_instance ON public.assessment_items USING btree (tenant_id, control_instance_id);


--
-- Name: idx_assessment_items_question_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assessment_items_question_version ON public.assessment_items USING btree (tenant_id, question_version_id);


--
-- Name: idx_assessment_scopes_tenant_workspace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assessment_scopes_tenant_workspace ON public.assessment_scopes USING btree (tenant_id, workspace_id);


--
-- Name: idx_assessment_signoffs_assessment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assessment_signoffs_assessment ON public.assessment_signoffs USING btree (tenant_id, assessment_id, decision);


--
-- Name: idx_assessment_snapshots_assessment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assessment_snapshots_assessment ON public.assessment_snapshots USING btree (tenant_id, assessment_id, sequence);


--
-- Name: idx_assurance_alerts_triage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assurance_alerts_triage ON public.assurance_alerts USING btree (tenant_id, status, severity, sla_due_at);


--
-- Name: idx_audit_checkpoints_chain_partition; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_checkpoints_chain_partition ON public.audit_checkpoints USING btree (chain_partition, end_sequence DESC);


--
-- Name: idx_audit_events_chain_partition_sequence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_audit_events_chain_partition_sequence ON public.audit_events USING btree (chain_partition, sequence);


--
-- Name: idx_audit_events_tenant_sequence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_events_tenant_sequence ON public.audit_events USING btree (tenant_id, sequence DESC);


--
-- Name: idx_audit_requests_engagement; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_requests_engagement ON public.audit_requests USING btree (audit_engagement_id, status);


--
-- Name: idx_audit_tests_engagement; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_tests_engagement ON public.audit_tests USING btree (audit_engagement_id);


--
-- Name: idx_audit_verifications_checkpoint; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_verifications_checkpoint ON public.audit_verifications USING btree (checkpoint_id, result);


--
-- Name: idx_automated_control_tests_control; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automated_control_tests_control ON public.automated_control_tests USING btree (tenant_id, control_ref, source_timestamp);


--
-- Name: idx_automated_test_runs_test_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automated_test_runs_test_status ON public.automated_test_runs USING btree (automated_test_id, status);


--
-- Name: idx_automated_tests_control; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automated_tests_control ON public.automated_tests USING btree (tenant_id, control_id, connector_type);


--
-- Name: idx_connector_objects_external; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_connector_objects_external ON public.connector_objects USING btree (tenant_id, connector_id, object_type, external_id);


--
-- Name: idx_connector_sync_runs_connector; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_connector_sync_runs_connector ON public.connector_sync_runs USING btree (tenant_id, connector_id, started_at);


--
-- Name: idx_connectors_tenant_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_connectors_tenant_status ON public.connectors USING btree (tenant_id, status, health);


--
-- Name: idx_consent_events_subject_occurred; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_consent_events_subject_occurred ON public.consent_events USING btree (subject_token, occurred_at);


--
-- Name: idx_consent_purposes_active_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_consent_purposes_active_unique ON public.consent_purposes USING btree (tenant_id, purpose_id, channel, region) WHERE (active_to IS NULL);


--
-- Name: idx_consent_purposes_tenant_purpose; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_consent_purposes_tenant_purpose ON public.consent_purposes USING btree (tenant_id, purpose_id);


--
-- Name: idx_control_instances_assessment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_control_instances_assessment ON public.control_instances USING btree (tenant_id, assessment_id, status, owner_id);


--
-- Name: idx_control_mappings_mapping_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_control_mappings_mapping_version ON public.control_mappings USING btree (mapping_version_id);


--
-- Name: idx_control_mappings_owner_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_control_mappings_owner_scope ON public.control_mappings USING btree (owner_scope);


--
-- Name: idx_control_mappings_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_control_mappings_source ON public.control_mappings USING btree (tenant_id, framework_key, source_control_id);


--
-- Name: idx_control_mappings_target; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_control_mappings_target ON public.control_mappings USING btree (tenant_id, harmonized_control_id);


--
-- Name: idx_control_sets_framework_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_control_sets_framework_version ON public.control_sets USING btree (tenant_id, framework_version_id);


--
-- Name: idx_control_subcontrols_control; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_control_subcontrols_control ON public.control_subcontrols USING btree (tenant_id, control_id);


--
-- Name: idx_control_test_results_instance; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_control_test_results_instance ON public.control_test_results USING btree (tenant_id, control_instance_id, result);


--
-- Name: idx_controls_control_set; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_controls_control_set ON public.controls USING btree (tenant_id, control_set_id);


--
-- Name: idx_custom_field_definitions_object; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_custom_field_definitions_object ON public.custom_field_definitions USING btree (object_definition_id);


--
-- Name: idx_custom_object_definitions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_custom_object_definitions_status ON public.custom_object_definitions USING btree (tenant_id, status);


--
-- Name: idx_custom_records_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_custom_records_status ON public.custom_records USING btree (tenant_id, status);


--
-- Name: idx_custom_values_record; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_custom_values_record ON public.custom_values USING btree (record_id);


--
-- Name: idx_data_categories_sensitivity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_data_categories_sensitivity ON public.data_categories USING btree (sensitivity);


--
-- Name: idx_data_discovery_findings_scan_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_data_discovery_findings_scan_status ON public.data_discovery_findings USING btree (scan_id, review_status);


--
-- Name: idx_data_discovery_scans_system_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_data_discovery_scans_system_status ON public.data_discovery_scans USING btree (system_id, status);


--
-- Name: idx_data_subject_categories_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_data_subject_categories_key ON public.data_subject_categories USING btree (subject_key);


--
-- Name: idx_deletion_items_job_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_deletion_items_job_status ON public.deletion_items USING btree (deletion_job_id, disposition);


--
-- Name: idx_deletion_jobs_tenant_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_deletion_jobs_tenant_status ON public.deletion_jobs USING btree (tenant_id, status);


--
-- Name: idx_dpia_risks_dpia; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dpia_risks_dpia ON public.dpia_risks USING btree (dpia_id);


--
-- Name: idx_dpias_activity_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dpias_activity_status ON public.dpias USING btree (processing_activity_id, status);


--
-- Name: idx_evaluation_cases_suite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluation_cases_suite ON public.evaluation_cases USING btree (suite_id);


--
-- Name: idx_evaluation_results_run; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluation_results_run ON public.evaluation_results USING btree (evaluation_run_id, passed);


--
-- Name: idx_evaluation_suites_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evaluation_suites_status ON public.evaluation_suites USING btree (tenant_id, status);


--
-- Name: idx_evidence_custody_events_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_custody_events_version ON public.evidence_custody_events USING btree (evidence_version_id, occurred_at);


--
-- Name: idx_evidence_expiry_events_evidence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_expiry_events_evidence ON public.evidence_expiry_events USING btree (evidence_id, occurred_at);


--
-- Name: idx_evidence_links_target; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_links_target ON public.evidence_links USING btree (target_type, target_id);


--
-- Name: idx_evidence_objects_tenant_state; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_objects_tenant_state ON public.evidence_objects USING btree (tenant_id, state);


--
-- Name: idx_evidence_requests_assessment_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_requests_assessment_status ON public.evidence_requests USING btree (assessment_id, status, due_at);


--
-- Name: idx_evidence_reviews_version_decision; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_reviews_version_decision ON public.evidence_reviews USING btree (evidence_version_id, decision);


--
-- Name: idx_evidence_samples_test_result; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_samples_test_result ON public.evidence_samples USING btree (test_result_id);


--
-- Name: idx_evidence_versions_evidence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_versions_evidence ON public.evidence_versions USING btree (evidence_id);


--
-- Name: idx_export_manifests_report_export; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_export_manifests_report_export ON public.export_manifests USING btree (tenant_id, report_export_id);


--
-- Name: idx_findings_assessment_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_findings_assessment_item ON public.findings USING btree (tenant_id, assessment_item_id);


--
-- Name: idx_findings_test_result; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_findings_test_result ON public.findings USING btree (tenant_id, test_result_id);


--
-- Name: idx_framework_content_packs_framework_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_framework_content_packs_framework_version ON public.framework_content_packs USING btree (framework_version_id);


--
-- Name: idx_framework_content_packs_owner_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_framework_content_packs_owner_scope ON public.framework_content_packs USING btree (owner_scope);


--
-- Name: idx_framework_requirements_control_ref; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_framework_requirements_control_ref ON public.framework_requirements USING btree (control_id_ref);


--
-- Name: idx_framework_requirements_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_framework_requirements_lookup ON public.framework_requirements USING btree (tenant_id, framework_key, control_id, sub_control_id);


--
-- Name: idx_framework_requirements_pack; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_framework_requirements_pack ON public.framework_requirements USING btree (tenant_id, framework_pack_id);


--
-- Name: idx_framework_requirements_subcontrol_ref; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_framework_requirements_subcontrol_ref ON public.framework_requirements USING btree (control_subcontrol_id);


--
-- Name: idx_framework_versions_framework; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_framework_versions_framework ON public.framework_versions USING btree (tenant_id, framework_id);


--
-- Name: idx_framework_versions_owner_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_framework_versions_owner_scope ON public.framework_versions USING btree (owner_scope);


--
-- Name: idx_frameworks_owner_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_frameworks_owner_scope ON public.frameworks USING btree (owner_scope);


--
-- Name: idx_generation_citations_run; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_generation_citations_run ON public.generation_citations USING btree (generation_run_id);


--
-- Name: idx_harmonized_controls_owner_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_harmonized_controls_owner_scope ON public.harmonized_controls USING btree (owner_scope);


--
-- Name: idx_identity_role_grants_tenant_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_identity_role_grants_tenant_user ON public.identity_role_grants USING btree (tenant_id, user_id);


--
-- Name: idx_identity_users_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_identity_users_tenant ON public.identity_users USING btree (tenant_id);


--
-- Name: idx_incident_assessments_incident; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incident_assessments_incident ON public.incident_assessments USING btree (incident_id);


--
-- Name: idx_incident_notifications_incident_due; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incident_notifications_incident_due ON public.incident_notifications USING btree (incident_id, due_at);


--
-- Name: idx_knowledge_chunks_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_knowledge_chunks_index ON public.knowledge_chunks USING btree (tenant_id, retrieval_index_id);


--
-- Name: idx_lawful_bases_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lawful_bases_key ON public.lawful_bases USING btree (basis_key);


--
-- Name: idx_legal_hold_items_target; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_legal_hold_items_target ON public.legal_hold_items USING btree (target_type, target_id);


--
-- Name: idx_legal_holds_tenant_released; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_legal_holds_tenant_released ON public.legal_holds USING btree (tenant_id, released_at);


--
-- Name: idx_malware_scan_results_version_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_malware_scan_results_version_status ON public.malware_scan_results USING btree (evidence_version_id, status);


--
-- Name: idx_mapping_conflicts_control_mapping; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mapping_conflicts_control_mapping ON public.mapping_conflicts USING btree (tenant_id, control_mapping_id);


--
-- Name: idx_mapping_reviews_control_mapping; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mapping_reviews_control_mapping ON public.mapping_reviews USING btree (tenant_id, control_mapping_id);


--
-- Name: idx_mapping_versions_owner_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mapping_versions_owner_scope ON public.mapping_versions USING btree (owner_scope);


--
-- Name: idx_outbox_events_pending; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_outbox_events_pending ON public.outbox_events USING btree (status, available_at, created_at);


--
-- Name: idx_policies_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_policies_status ON public.policies USING btree (tenant_id, status);


--
-- Name: idx_policy_attestations_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_policy_attestations_user ON public.policy_attestations USING btree (tenant_id, user_id);


--
-- Name: idx_policy_control_links_control; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_policy_control_links_control ON public.policy_control_links USING btree (control_id);


--
-- Name: idx_privacy_notices_tenant_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_privacy_notices_tenant_status ON public.privacy_notices USING btree (tenant_id, status);


--
-- Name: idx_processing_inventory_links_activity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_processing_inventory_links_activity ON public.processing_inventory_links USING btree (processing_activity_id);


--
-- Name: idx_processing_purposes_active_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_processing_purposes_active_unique ON public.processing_purposes USING btree (processing_activity_id, purpose_id) WHERE (effective_to IS NULL);


--
-- Name: idx_processing_purposes_activity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_processing_purposes_activity ON public.processing_purposes USING btree (processing_activity_id);


--
-- Name: idx_processing_recipients_activity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_processing_recipients_activity ON public.processing_recipients USING btree (processing_activity_id);


--
-- Name: idx_purposes_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purposes_key ON public.purposes USING btree (purpose_key);


--
-- Name: idx_question_sets_control; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_sets_control ON public.question_sets USING btree (tenant_id, control_id, status);


--
-- Name: idx_question_versions_set; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_versions_set ON public.question_versions USING btree (tenant_id, question_set_id, status);


--
-- Name: idx_recipients_tenant_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_recipients_tenant_type ON public.recipients USING btree (tenant_id, recipient_type);


--
-- Name: idx_report_exports_idempotency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_exports_idempotency ON public.report_exports USING btree (tenant_id, idempotency_key);


--
-- Name: idx_report_exports_snapshot; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_exports_snapshot ON public.report_exports USING btree (tenant_id, assessment_snapshot_id);


--
-- Name: idx_report_exports_template; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_exports_template ON public.report_exports USING btree (tenant_id, report_template_id);


--
-- Name: idx_report_templates_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_templates_key ON public.report_templates USING btree (tenant_id, template_key, status);


--
-- Name: idx_requirement_instances_assessment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_requirement_instances_assessment ON public.requirement_instances USING btree (tenant_id, assessment_id, status);


--
-- Name: idx_requirement_instances_requirement; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_requirement_instances_requirement ON public.requirement_instances USING btree (requirement_id);


--
-- Name: idx_retention_assignments_active_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_retention_assignments_active_unique ON public.retention_assignments USING btree (target_type, target_id) WHERE (effective_to IS NULL);


--
-- Name: idx_retention_assignments_rule; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_retention_assignments_rule ON public.retention_assignments USING btree (retention_rule_id);


--
-- Name: idx_retention_rules_category_jurisdiction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_retention_rules_category_jurisdiction ON public.retention_rules USING btree (data_category_id, jurisdiction);


--
-- Name: idx_retrieval_runs_tenant_started; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_retrieval_runs_tenant_started ON public.retrieval_runs USING btree (tenant_id, started_at);


--
-- Name: idx_retrieved_chunks_run; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_retrieved_chunks_run ON public.retrieved_chunks USING btree (retrieval_run_id);


--
-- Name: idx_review_decisions_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_review_decisions_item ON public.review_decisions USING btree (tenant_id, assessment_item_id, decision);


--
-- Name: idx_rights_request_tasks_request_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rights_request_tasks_request_status ON public.rights_request_tasks USING btree (rights_request_id, status);


--
-- Name: idx_risk_acceptance_reviews_acceptance; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_acceptance_reviews_acceptance ON public.risk_acceptance_reviews USING btree (tenant_id, risk_acceptance_id);


--
-- Name: idx_risk_acceptances_expiry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_acceptances_expiry ON public.risk_acceptances USING btree (tenant_id, expires_at);


--
-- Name: idx_risk_acceptances_finding; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_acceptances_finding ON public.risk_acceptances USING btree (tenant_id, finding_id);


--
-- Name: idx_risk_acceptances_task; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_acceptances_task ON public.risk_acceptances USING btree (tenant_id, remediation_task_id);


--
-- Name: idx_risk_links_target; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_links_target ON public.risk_links USING btree (target_type, target_id);


--
-- Name: idx_risk_models_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_models_status ON public.risk_models USING btree (tenant_id, status);


--
-- Name: idx_risk_treatments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risk_treatments_status ON public.risk_treatments USING btree (risk_id, status);


--
-- Name: idx_risks_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_risks_status ON public.risks USING btree (tenant_id, status, owner_id);


--
-- Name: idx_safety_checks_run_result; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_safety_checks_run_result ON public.safety_checks USING btree (generation_run_id, result);


--
-- Name: idx_systems_assets_tenant_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_systems_assets_tenant_type ON public.systems_assets USING btree (tenant_id, asset_type);


--
-- Name: idx_tenant_catalog_subscriptions_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tenant_catalog_subscriptions_tenant ON public.tenant_catalog_subscriptions USING btree (tenant_id);


--
-- Name: idx_test_procedures_control; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_test_procedures_control ON public.test_procedures USING btree (tenant_id, control_id, status);


--
-- Name: idx_transfers_activity_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transfers_activity_status ON public.transfers USING btree (processing_activity_id, status);


--
-- Name: idx_vendor_assessments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendor_assessments_status ON public.vendor_assessments USING btree (tenant_id, status);


--
-- Name: idx_vendor_findings_assessment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendor_findings_assessment ON public.vendor_findings USING btree (vendor_assessment_id);


--
-- Name: idx_webhook_deliveries_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_webhook_deliveries_status ON public.webhook_deliveries USING btree (tenant_id, webhook_id, delivery_status);


--
-- Name: universal_tasks_due_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX universal_tasks_due_at_idx ON public.universal_tasks USING btree (tenant_id, due_at);


--
-- Name: universal_tasks_owner_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX universal_tasks_owner_idx ON public.universal_tasks USING btree (tenant_id, owner_id);


--
-- Name: universal_tasks_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX universal_tasks_status_idx ON public.universal_tasks USING btree (tenant_id, status);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_selec; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_selec ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter, COALESCE(selected_columns, '{}'::text[]));


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: framework_update_impacts delete_framework_update_impact_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER delete_framework_update_impact_trigger AFTER DELETE ON public.framework_update_impacts FOR EACH ROW EXECUTE FUNCTION public.delete_universal_task_on_legacy_delete();


--
-- Name: remediation_tasks delete_remediation_task_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER delete_remediation_task_trigger AFTER DELETE ON public.remediation_tasks FOR EACH ROW EXECUTE FUNCTION public.delete_universal_task_on_legacy_delete();


--
-- Name: rights_request_tasks delete_rights_request_task_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER delete_rights_request_task_trigger AFTER DELETE ON public.rights_request_tasks FOR EACH ROW EXECUTE FUNCTION public.delete_universal_task_on_legacy_delete();


--
-- Name: universal_tasks handle_universal_task_completion_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER handle_universal_task_completion_trigger BEFORE INSERT OR UPDATE ON public.universal_tasks FOR EACH ROW EXECUTE FUNCTION public.handle_universal_task_completion();


--
-- Name: remediation_tasks sync_remediation_task_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER sync_remediation_task_trigger AFTER INSERT OR UPDATE ON public.remediation_tasks FOR EACH ROW EXECUTE FUNCTION public.sync_remediation_task_to_universal();


--
-- Name: rights_request_tasks sync_rights_request_task_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER sync_rights_request_task_trigger AFTER INSERT OR UPDATE ON public.rights_request_tasks FOR EACH ROW EXECUTE FUNCTION public.sync_rights_request_task_to_universal();


--
-- Name: control_mappings trg_after_control_mappings; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_after_control_mappings AFTER INSERT ON public.control_mappings FOR EACH ROW EXECUTE FUNCTION public.fn_after_control_mappings();


--
-- Name: control_mappings trg_backfill_control_mappings; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_backfill_control_mappings BEFORE INSERT OR UPDATE ON public.control_mappings FOR EACH ROW EXECUTE FUNCTION public.fn_backfill_control_mappings();


--
-- Name: framework_content_packs trg_backfill_framework_content_packs; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_backfill_framework_content_packs BEFORE INSERT OR UPDATE ON public.framework_content_packs FOR EACH ROW EXECUTE FUNCTION public.fn_backfill_framework_content_packs();


--
-- Name: framework_requirements trg_backfill_framework_requirements; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_backfill_framework_requirements BEFORE INSERT OR UPDATE ON public.framework_requirements FOR EACH ROW EXECUTE FUNCTION public.fn_backfill_framework_requirements();


--
-- Name: control_mappings trg_block_control_mappings; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_block_control_mappings BEFORE INSERT OR UPDATE ON public.control_mappings FOR EACH ROW EXECUTE FUNCTION public.fn_block_legacy_writes();


--
-- Name: framework_content_packs trg_block_framework_content_packs; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_block_framework_content_packs BEFORE INSERT OR UPDATE ON public.framework_content_packs FOR EACH ROW EXECUTE FUNCTION public.fn_block_legacy_writes();


--
-- Name: framework_requirements trg_block_framework_requirements; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_block_framework_requirements BEFORE INSERT OR UPDATE ON public.framework_requirements FOR EACH ROW EXECUTE FUNCTION public.fn_block_legacy_writes();


--
-- Name: remediation_tasks trg_block_remediation_tasks; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_block_remediation_tasks BEFORE INSERT OR UPDATE ON public.remediation_tasks FOR EACH ROW EXECUTE FUNCTION public.fn_block_legacy_writes();

ALTER TABLE public.remediation_tasks DISABLE TRIGGER trg_block_remediation_tasks;


--
-- Name: rights_request_tasks trg_block_rights_request_tasks; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_block_rights_request_tasks BEFORE INSERT OR UPDATE ON public.rights_request_tasks FOR EACH ROW EXECUTE FUNCTION public.fn_block_legacy_writes();


--
-- Name: control_mappings trg_guard_legacy_write_control_mappings; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_guard_legacy_write_control_mappings BEFORE INSERT ON public.control_mappings FOR EACH ROW EXECUTE FUNCTION public.fn_guard_legacy_write();


--
-- Name: framework_content_packs trg_guard_legacy_write_framework_content_packs; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_guard_legacy_write_framework_content_packs BEFORE INSERT ON public.framework_content_packs FOR EACH ROW EXECUTE FUNCTION public.fn_guard_legacy_write();


--
-- Name: framework_requirements trg_guard_legacy_write_framework_requirements; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_guard_legacy_write_framework_requirements BEFORE INSERT ON public.framework_requirements FOR EACH ROW EXECUTE FUNCTION public.fn_guard_legacy_write();


--
-- Name: remediation_tasks trg_guard_legacy_write_remediation_tasks; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_guard_legacy_write_remediation_tasks BEFORE INSERT ON public.remediation_tasks FOR EACH ROW EXECUTE FUNCTION public.fn_guard_legacy_write();


--
-- Name: rights_request_tasks trg_guard_legacy_write_rights_request_tasks; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_guard_legacy_write_rights_request_tasks BEFORE INSERT ON public.rights_request_tasks FOR EACH ROW EXECUTE FUNCTION public.fn_guard_legacy_write();


--
-- Name: access_review_decisions trg_prevent_access_review_decision_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_access_review_decision_mutation BEFORE DELETE OR UPDATE ON public.access_review_decisions FOR EACH ROW EXECUTE FUNCTION public.prevent_access_review_decision_mutation();


--
-- Name: ai_publication_events trg_prevent_ai_publication_event_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_ai_publication_event_mutation BEFORE DELETE OR UPDATE ON public.ai_publication_events FOR EACH ROW EXECUTE FUNCTION public.prevent_ai_publication_event_mutation();


--
-- Name: answer_revisions trg_prevent_answer_revisions_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_answer_revisions_mutation BEFORE DELETE OR UPDATE ON public.answer_revisions FOR EACH ROW EXECUTE FUNCTION public.prevent_assessment_history_mutation();


--
-- Name: applicability_decisions trg_prevent_applicability_decisions_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_applicability_decisions_mutation BEFORE DELETE OR UPDATE ON public.applicability_decisions FOR EACH ROW EXECUTE FUNCTION public.prevent_assessment_history_mutation();


--
-- Name: question_versions trg_prevent_approved_question_version_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_approved_question_version_mutation BEFORE UPDATE ON public.question_versions FOR EACH ROW EXECUTE FUNCTION public.prevent_approved_question_version_mutation();


--
-- Name: assessment_snapshots trg_prevent_assessment_snapshots_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_assessment_snapshots_mutation BEFORE DELETE OR UPDATE ON public.assessment_snapshots FOR EACH ROW EXECUTE FUNCTION public.prevent_assessment_history_mutation();


--
-- Name: audit_checkpoints trg_prevent_audit_checkpoints_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_audit_checkpoints_mutation BEFORE DELETE OR UPDATE ON public.audit_checkpoints FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_chain_mutation();


--
-- Name: audit_events trg_prevent_audit_event_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_audit_event_update BEFORE DELETE OR UPDATE ON public.audit_events FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_event_mutation();


--
-- Name: audit_verifications trg_prevent_audit_verifications_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_audit_verifications_mutation BEFORE DELETE OR UPDATE ON public.audit_verifications FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_chain_mutation();


--
-- Name: consent_events trg_prevent_consent_events_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_consent_events_mutation BEFORE DELETE OR UPDATE ON public.consent_events FOR EACH ROW EXECUTE FUNCTION public.prevent_privacy_ledger_mutation();


--
-- Name: evidence_custody_events trg_prevent_evidence_custody_events_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_evidence_custody_events_mutation BEFORE DELETE OR UPDATE ON public.evidence_custody_events FOR EACH ROW EXECUTE FUNCTION public.prevent_evidence_graph_mutation();


--
-- Name: evidence_expiry_events trg_prevent_evidence_expiry_events_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_evidence_expiry_events_mutation BEFORE DELETE OR UPDATE ON public.evidence_expiry_events FOR EACH ROW EXECUTE FUNCTION public.prevent_evidence_graph_mutation();


--
-- Name: evidence_versions trg_prevent_evidence_versions_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_evidence_versions_mutation BEFORE DELETE OR UPDATE ON public.evidence_versions FOR EACH ROW EXECUTE FUNCTION public.prevent_evidence_graph_mutation();


--
-- Name: export_manifests trg_prevent_export_manifest_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_export_manifest_mutation BEFORE DELETE OR UPDATE ON public.export_manifests FOR EACH ROW EXECUTE FUNCTION public.prevent_export_manifest_mutation();


--
-- Name: policy_attestations trg_prevent_policy_attestation_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_policy_attestation_mutation BEFORE DELETE OR UPDATE ON public.policy_attestations FOR EACH ROW EXECUTE FUNCTION public.prevent_policy_attestation_mutation();


--
-- Name: privacy_notice_versions trg_prevent_privacy_notice_versions_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_privacy_notice_versions_mutation BEFORE DELETE OR UPDATE ON public.privacy_notice_versions FOR EACH ROW EXECUTE FUNCTION public.prevent_privacy_ledger_mutation();


--
-- Name: review_decisions trg_prevent_review_decision_self_review; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_review_decision_self_review BEFORE INSERT ON public.review_decisions FOR EACH ROW EXECUTE FUNCTION public.prevent_review_decision_self_review();


--
-- Name: review_decisions trg_prevent_review_decisions_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_review_decisions_mutation BEFORE DELETE OR UPDATE ON public.review_decisions FOR EACH ROW EXECUTE FUNCTION public.prevent_assessment_history_mutation();


--
-- Name: risk_acceptance_reviews trg_prevent_risk_acceptance_review_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_risk_acceptance_review_update BEFORE DELETE OR UPDATE ON public.risk_acceptance_reviews FOR EACH ROW EXECUTE FUNCTION public.prevent_risk_acceptance_review_mutation();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: supabase_admin
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: access_review_decisions access_review_decisions_review_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_review_decisions
    ADD CONSTRAINT access_review_decisions_review_item_id_fkey FOREIGN KEY (review_item_id) REFERENCES public.access_review_items(id);


--
-- Name: access_review_items access_review_items_access_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_review_items
    ADD CONSTRAINT access_review_items_access_review_id_fkey FOREIGN KEY (access_review_id) REFERENCES public.access_reviews(id);


--
-- Name: ai_evaluation_runs ai_evaluation_runs_suite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_evaluation_runs
    ADD CONSTRAINT ai_evaluation_runs_suite_id_fkey FOREIGN KEY (suite_id) REFERENCES public.evaluation_suites(id);


--
-- Name: ai_generation_runs ai_generation_runs_model_deployment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_generation_runs
    ADD CONSTRAINT ai_generation_runs_model_deployment_id_fkey FOREIGN KEY (model_deployment_id) REFERENCES public.ai_model_deployments(id);


--
-- Name: ai_generation_runs ai_generation_runs_prompt_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_generation_runs
    ADD CONSTRAINT ai_generation_runs_prompt_version_id_fkey FOREIGN KEY (prompt_version_id) REFERENCES public.ai_prompt_versions(id);


--
-- Name: ai_generation_runs ai_generation_runs_retrieval_index_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_generation_runs
    ADD CONSTRAINT ai_generation_runs_retrieval_index_id_fkey FOREIGN KEY (retrieval_index_id) REFERENCES public.ai_retrieval_indexes(id);


--
-- Name: ai_output_reviews ai_output_reviews_generation_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_output_reviews
    ADD CONSTRAINT ai_output_reviews_generation_run_id_fkey FOREIGN KEY (generation_run_id) REFERENCES public.ai_generation_runs(id);


--
-- Name: ai_publication_events ai_publication_events_generation_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_publication_events
    ADD CONSTRAINT ai_publication_events_generation_run_id_fkey FOREIGN KEY (generation_run_id) REFERENCES public.ai_generation_runs(id);


--
-- Name: ai_question_versions ai_question_versions_generation_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_question_versions
    ADD CONSTRAINT ai_question_versions_generation_run_id_fkey FOREIGN KEY (generation_run_id) REFERENCES public.ai_generation_runs(id);


--
-- Name: answer_revisions answer_revisions_assessment_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.answer_revisions
    ADD CONSTRAINT answer_revisions_assessment_item_id_fkey FOREIGN KEY (assessment_item_id) REFERENCES public.assessment_items(id);


--
-- Name: answer_revisions answer_revisions_supersedes_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.answer_revisions
    ADD CONSTRAINT answer_revisions_supersedes_id_fkey FOREIGN KEY (supersedes_id) REFERENCES public.answer_revisions(id);


--
-- Name: applicability_decisions applicability_decisions_control_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applicability_decisions
    ADD CONSTRAINT applicability_decisions_control_instance_id_fkey FOREIGN KEY (control_instance_id) REFERENCES public.control_instances(id);


--
-- Name: assessment_frameworks assessment_frameworks_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_frameworks
    ADD CONSTRAINT assessment_frameworks_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id);


--
-- Name: assessment_items assessment_items_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_items
    ADD CONSTRAINT assessment_items_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id);


--
-- Name: assessment_items assessment_items_control_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_items
    ADD CONSTRAINT assessment_items_control_instance_id_fkey FOREIGN KEY (control_instance_id) REFERENCES public.control_instances(id);


--
-- Name: assessment_items assessment_items_question_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_items
    ADD CONSTRAINT assessment_items_question_version_id_fkey FOREIGN KEY (question_version_id) REFERENCES public.question_versions(id);


--
-- Name: assessment_signoffs assessment_signoffs_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_signoffs
    ADD CONSTRAINT assessment_signoffs_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id);


--
-- Name: assessment_snapshots assessment_snapshots_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_snapshots
    ADD CONSTRAINT assessment_snapshots_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id);


--
-- Name: assessments assessments_scope_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES public.assessment_scopes(id);


--
-- Name: audit_requests audit_requests_audit_engagement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_requests
    ADD CONSTRAINT audit_requests_audit_engagement_id_fkey FOREIGN KEY (audit_engagement_id) REFERENCES public.audit_engagements(id);


--
-- Name: audit_tests audit_tests_audit_engagement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_tests
    ADD CONSTRAINT audit_tests_audit_engagement_id_fkey FOREIGN KEY (audit_engagement_id) REFERENCES public.audit_engagements(id);


--
-- Name: audit_tests audit_tests_control_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_tests
    ADD CONSTRAINT audit_tests_control_instance_id_fkey FOREIGN KEY (control_instance_id) REFERENCES public.control_instances(id);


--
-- Name: audit_verifications audit_verifications_checkpoint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_verifications
    ADD CONSTRAINT audit_verifications_checkpoint_id_fkey FOREIGN KEY (checkpoint_id) REFERENCES public.audit_checkpoints(id);


--
-- Name: automated_control_tests automated_control_tests_connector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automated_control_tests
    ADD CONSTRAINT automated_control_tests_connector_id_fkey FOREIGN KEY (connector_id) REFERENCES public.connectors(id);


--
-- Name: automated_test_runs automated_test_runs_automated_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automated_test_runs
    ADD CONSTRAINT automated_test_runs_automated_test_id_fkey FOREIGN KEY (automated_test_id) REFERENCES public.automated_tests(id);


--
-- Name: automated_test_runs automated_test_runs_connector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automated_test_runs
    ADD CONSTRAINT automated_test_runs_connector_id_fkey FOREIGN KEY (connector_id) REFERENCES public.connectors(id);


--
-- Name: automated_tests automated_tests_control_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automated_tests
    ADD CONSTRAINT automated_tests_control_id_fkey FOREIGN KEY (control_id) REFERENCES public.harmonized_controls(id);


--
-- Name: connector_objects connector_objects_connector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connector_objects
    ADD CONSTRAINT connector_objects_connector_id_fkey FOREIGN KEY (connector_id) REFERENCES public.connectors(id);


--
-- Name: connector_sync_runs connector_sync_runs_connector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connector_sync_runs
    ADD CONSTRAINT connector_sync_runs_connector_id_fkey FOREIGN KEY (connector_id) REFERENCES public.connectors(id);


--
-- Name: consent_events consent_events_consent_purpose_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consent_events
    ADD CONSTRAINT consent_events_consent_purpose_id_fkey FOREIGN KEY (consent_purpose_id) REFERENCES public.consent_purposes(id);


--
-- Name: consent_purposes consent_purposes_notice_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consent_purposes
    ADD CONSTRAINT consent_purposes_notice_version_id_fkey FOREIGN KEY (notice_version_id) REFERENCES public.privacy_notice_versions(id);


--
-- Name: consent_purposes consent_purposes_purpose_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consent_purposes
    ADD CONSTRAINT consent_purposes_purpose_id_fkey FOREIGN KEY (purpose_id) REFERENCES public.purposes(id);


--
-- Name: control_instances control_instances_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.control_instances
    ADD CONSTRAINT control_instances_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id);


--
-- Name: control_mappings control_mappings_mapping_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.control_mappings
    ADD CONSTRAINT control_mappings_mapping_version_id_fkey FOREIGN KEY (mapping_version_id) REFERENCES public.mapping_versions(id);


--
-- Name: control_sets control_sets_framework_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.control_sets
    ADD CONSTRAINT control_sets_framework_version_id_fkey FOREIGN KEY (framework_version_id) REFERENCES public.framework_versions(id);


--
-- Name: control_subcontrols control_subcontrols_control_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.control_subcontrols
    ADD CONSTRAINT control_subcontrols_control_id_fkey FOREIGN KEY (control_id) REFERENCES public.controls(id);


--
-- Name: control_test_results control_test_results_control_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.control_test_results
    ADD CONSTRAINT control_test_results_control_instance_id_fkey FOREIGN KEY (control_instance_id) REFERENCES public.control_instances(id);


--
-- Name: control_test_results control_test_results_test_procedure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.control_test_results
    ADD CONSTRAINT control_test_results_test_procedure_id_fkey FOREIGN KEY (test_procedure_id) REFERENCES public.test_procedures(id);


--
-- Name: controls controls_control_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.controls
    ADD CONSTRAINT controls_control_set_id_fkey FOREIGN KEY (control_set_id) REFERENCES public.control_sets(id);


--
-- Name: custom_field_definitions custom_field_definitions_object_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_field_definitions
    ADD CONSTRAINT custom_field_definitions_object_definition_id_fkey FOREIGN KEY (object_definition_id) REFERENCES public.custom_object_definitions(id);


--
-- Name: custom_records custom_records_object_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_records
    ADD CONSTRAINT custom_records_object_definition_id_fkey FOREIGN KEY (object_definition_id) REFERENCES public.custom_object_definitions(id);


--
-- Name: custom_values custom_values_field_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_values
    ADD CONSTRAINT custom_values_field_definition_id_fkey FOREIGN KEY (field_definition_id) REFERENCES public.custom_field_definitions(id);


--
-- Name: custom_values custom_values_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_values
    ADD CONSTRAINT custom_values_record_id_fkey FOREIGN KEY (record_id) REFERENCES public.custom_records(id);


--
-- Name: data_discovery_findings data_discovery_findings_data_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_discovery_findings
    ADD CONSTRAINT data_discovery_findings_data_category_id_fkey FOREIGN KEY (data_category_id) REFERENCES public.data_categories(id);


--
-- Name: data_discovery_findings data_discovery_findings_scan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_discovery_findings
    ADD CONSTRAINT data_discovery_findings_scan_id_fkey FOREIGN KEY (scan_id) REFERENCES public.data_discovery_scans(id);


--
-- Name: data_discovery_scans data_discovery_scans_connector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_discovery_scans
    ADD CONSTRAINT data_discovery_scans_connector_id_fkey FOREIGN KEY (connector_id) REFERENCES public.connectors(id);


--
-- Name: data_discovery_scans data_discovery_scans_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_discovery_scans
    ADD CONSTRAINT data_discovery_scans_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.systems_assets(id);


--
-- Name: deletion_items deletion_items_deletion_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deletion_items
    ADD CONSTRAINT deletion_items_deletion_job_id_fkey FOREIGN KEY (deletion_job_id) REFERENCES public.deletion_jobs(id);


--
-- Name: dpia_risks dpia_risks_dpia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dpia_risks
    ADD CONSTRAINT dpia_risks_dpia_id_fkey FOREIGN KEY (dpia_id) REFERENCES public.dpias(id);


--
-- Name: dpias dpias_processing_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dpias
    ADD CONSTRAINT dpias_processing_activity_id_fkey FOREIGN KEY (processing_activity_id) REFERENCES public.processing_activities(id);


--
-- Name: evaluation_cases evaluation_cases_suite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_cases
    ADD CONSTRAINT evaluation_cases_suite_id_fkey FOREIGN KEY (suite_id) REFERENCES public.evaluation_suites(id);


--
-- Name: evaluation_results evaluation_results_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_results
    ADD CONSTRAINT evaluation_results_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.evaluation_cases(id);


--
-- Name: evaluation_results evaluation_results_evaluation_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_results
    ADD CONSTRAINT evaluation_results_evaluation_run_id_fkey FOREIGN KEY (evaluation_run_id) REFERENCES public.ai_evaluation_runs(id);


--
-- Name: evidence_custody_events evidence_custody_events_evidence_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_custody_events
    ADD CONSTRAINT evidence_custody_events_evidence_version_id_fkey FOREIGN KEY (evidence_version_id) REFERENCES public.evidence_versions(id);


--
-- Name: evidence_expiry_events evidence_expiry_events_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_expiry_events
    ADD CONSTRAINT evidence_expiry_events_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES public.evidence_objects(id);


--
-- Name: evidence_links evidence_links_evidence_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_links
    ADD CONSTRAINT evidence_links_evidence_version_id_fkey FOREIGN KEY (evidence_version_id) REFERENCES public.evidence_versions(id);


--
-- Name: evidence_requests evidence_requests_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_requests
    ADD CONSTRAINT evidence_requests_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id);


--
-- Name: evidence_requests evidence_requests_control_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_requests
    ADD CONSTRAINT evidence_requests_control_instance_id_fkey FOREIGN KEY (control_instance_id) REFERENCES public.control_instances(id);


--
-- Name: evidence_reviews evidence_reviews_evidence_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_reviews
    ADD CONSTRAINT evidence_reviews_evidence_version_id_fkey FOREIGN KEY (evidence_version_id) REFERENCES public.evidence_versions(id);


--
-- Name: evidence_samples evidence_samples_test_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_samples
    ADD CONSTRAINT evidence_samples_test_result_id_fkey FOREIGN KEY (test_result_id) REFERENCES public.automated_test_runs(id);


--
-- Name: evidence_versions evidence_versions_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_versions
    ADD CONSTRAINT evidence_versions_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES public.evidence_objects(id);


--
-- Name: export_manifests export_manifests_report_export_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_manifests
    ADD CONSTRAINT export_manifests_report_export_id_fkey FOREIGN KEY (report_export_id) REFERENCES public.report_exports(id);


--
-- Name: export_manifests export_manifests_signing_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_manifests
    ADD CONSTRAINT export_manifests_signing_key_id_fkey FOREIGN KEY (signing_key_id) REFERENCES public.encryption_key_records(id);


--
-- Name: findings findings_assessment_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.findings
    ADD CONSTRAINT findings_assessment_item_id_fkey FOREIGN KEY (assessment_item_id) REFERENCES public.assessment_items(id);


--
-- Name: findings findings_test_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.findings
    ADD CONSTRAINT findings_test_result_id_fkey FOREIGN KEY (test_result_id) REFERENCES public.control_test_results(id);


--
-- Name: data_inventory_records fk_data_inventory_records_category; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_inventory_records
    ADD CONSTRAINT fk_data_inventory_records_category FOREIGN KEY (data_category_id) REFERENCES public.data_categories(id);


--
-- Name: data_inventory_records fk_data_inventory_records_system; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_inventory_records
    ADD CONSTRAINT fk_data_inventory_records_system FOREIGN KEY (system_id) REFERENCES public.systems_assets(id);


--
-- Name: framework_content_packs framework_content_packs_framework_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_content_packs
    ADD CONSTRAINT framework_content_packs_framework_version_id_fkey FOREIGN KEY (framework_version_id) REFERENCES public.framework_versions(id);


--
-- Name: framework_content_packs framework_content_packs_source_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_content_packs
    ADD CONSTRAINT framework_content_packs_source_package_id_fkey FOREIGN KEY (source_package_id) REFERENCES public.content_source_packages(id);


--
-- Name: framework_content_packs framework_content_packs_supersedes_pack_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_content_packs
    ADD CONSTRAINT framework_content_packs_supersedes_pack_id_fkey FOREIGN KEY (supersedes_pack_id) REFERENCES public.framework_content_packs(id);


--
-- Name: framework_diff_items framework_diff_items_diff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_diff_items
    ADD CONSTRAINT framework_diff_items_diff_id_fkey FOREIGN KEY (diff_id) REFERENCES public.framework_diffs(id) ON DELETE CASCADE;


--
-- Name: framework_diffs framework_diffs_framework_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_diffs
    ADD CONSTRAINT framework_diffs_framework_id_fkey FOREIGN KEY (framework_id) REFERENCES public.frameworks(id);


--
-- Name: framework_diffs framework_diffs_from_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_diffs
    ADD CONSTRAINT framework_diffs_from_version_id_fkey FOREIGN KEY (from_version_id) REFERENCES public.framework_versions(id);


--
-- Name: framework_diffs framework_diffs_to_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_diffs
    ADD CONSTRAINT framework_diffs_to_version_id_fkey FOREIGN KEY (to_version_id) REFERENCES public.framework_versions(id);


--
-- Name: framework_requirements framework_requirements_control_id_ref_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_requirements
    ADD CONSTRAINT framework_requirements_control_id_ref_fkey FOREIGN KEY (control_id_ref) REFERENCES public.controls(id);


--
-- Name: framework_requirements framework_requirements_control_subcontrol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_requirements
    ADD CONSTRAINT framework_requirements_control_subcontrol_id_fkey FOREIGN KEY (control_subcontrol_id) REFERENCES public.control_subcontrols(id);


--
-- Name: framework_requirements framework_requirements_framework_pack_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_requirements
    ADD CONSTRAINT framework_requirements_framework_pack_id_fkey FOREIGN KEY (framework_pack_id) REFERENCES public.framework_content_packs(id);


--
-- Name: framework_update_impacts framework_update_impacts_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_update_impacts
    ADD CONSTRAINT framework_update_impacts_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: framework_update_impacts framework_update_impacts_control_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_update_impacts
    ADD CONSTRAINT framework_update_impacts_control_instance_id_fkey FOREIGN KEY (control_instance_id) REFERENCES public.control_instances(id) ON DELETE CASCADE;


--
-- Name: framework_update_impacts framework_update_impacts_diff_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_update_impacts
    ADD CONSTRAINT framework_update_impacts_diff_item_id_fkey FOREIGN KEY (diff_item_id) REFERENCES public.framework_diff_items(id) ON DELETE CASCADE;


--
-- Name: framework_versions framework_versions_framework_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.framework_versions
    ADD CONSTRAINT framework_versions_framework_id_fkey FOREIGN KEY (framework_id) REFERENCES public.frameworks(id);


--
-- Name: generation_citations generation_citations_generation_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generation_citations
    ADD CONSTRAINT generation_citations_generation_run_id_fkey FOREIGN KEY (generation_run_id) REFERENCES public.ai_generation_runs(id);


--
-- Name: generation_citations generation_citations_knowledge_chunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generation_citations
    ADD CONSTRAINT generation_citations_knowledge_chunk_id_fkey FOREIGN KEY (knowledge_chunk_id) REFERENCES public.knowledge_chunks(id);


--
-- Name: identity_role_grants identity_role_grants_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_role_grants
    ADD CONSTRAINT identity_role_grants_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.identity_roles(id);


--
-- Name: identity_role_grants identity_role_grants_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_role_grants
    ADD CONSTRAINT identity_role_grants_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.identity_tenants(id);


--
-- Name: identity_role_grants identity_role_grants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_role_grants
    ADD CONSTRAINT identity_role_grants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.identity_users(id);


--
-- Name: identity_roles identity_roles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_roles
    ADD CONSTRAINT identity_roles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.identity_tenants(id);


--
-- Name: identity_service_accounts identity_service_accounts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_service_accounts
    ADD CONSTRAINT identity_service_accounts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.identity_tenants(id);


--
-- Name: identity_sessions identity_sessions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_sessions
    ADD CONSTRAINT identity_sessions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.identity_tenants(id);


--
-- Name: identity_sessions identity_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_sessions
    ADD CONSTRAINT identity_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.identity_users(id);


--
-- Name: identity_users identity_users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_users
    ADD CONSTRAINT identity_users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.identity_tenants(id);


--
-- Name: identity_workspace_delegations identity_workspace_delegations_delegated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_workspace_delegations
    ADD CONSTRAINT identity_workspace_delegations_delegated_by_fkey FOREIGN KEY (delegated_by) REFERENCES public.identity_users(id);


--
-- Name: identity_workspace_delegations identity_workspace_delegations_principal_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_workspace_delegations
    ADD CONSTRAINT identity_workspace_delegations_principal_user_id_fkey FOREIGN KEY (principal_user_id) REFERENCES public.identity_users(id);


--
-- Name: identity_workspace_delegations identity_workspace_delegations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_workspace_delegations
    ADD CONSTRAINT identity_workspace_delegations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.identity_tenants(id);


--
-- Name: incident_assessments incident_assessments_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_assessments
    ADD CONSTRAINT incident_assessments_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.privacy_incidents(id);


--
-- Name: incident_notifications incident_notifications_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incident_notifications
    ADD CONSTRAINT incident_notifications_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.privacy_incidents(id);


--
-- Name: knowledge_chunks knowledge_chunks_retrieval_index_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_chunks
    ADD CONSTRAINT knowledge_chunks_retrieval_index_id_fkey FOREIGN KEY (retrieval_index_id) REFERENCES public.ai_retrieval_indexes(id);


--
-- Name: legal_hold_items legal_hold_items_legal_hold_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_hold_items
    ADD CONSTRAINT legal_hold_items_legal_hold_id_fkey FOREIGN KEY (legal_hold_id) REFERENCES public.legal_holds(id);


--
-- Name: malware_scan_results malware_scan_results_evidence_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.malware_scan_results
    ADD CONSTRAINT malware_scan_results_evidence_version_id_fkey FOREIGN KEY (evidence_version_id) REFERENCES public.evidence_versions(id);


--
-- Name: mapping_conflicts mapping_conflicts_conflicting_mapping_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mapping_conflicts
    ADD CONSTRAINT mapping_conflicts_conflicting_mapping_id_fkey FOREIGN KEY (conflicting_mapping_id) REFERENCES public.control_mappings(id);


--
-- Name: mapping_conflicts mapping_conflicts_control_mapping_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mapping_conflicts
    ADD CONSTRAINT mapping_conflicts_control_mapping_id_fkey FOREIGN KEY (control_mapping_id) REFERENCES public.control_mappings(id);


--
-- Name: mapping_reviews mapping_reviews_control_mapping_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mapping_reviews
    ADD CONSTRAINT mapping_reviews_control_mapping_id_fkey FOREIGN KEY (control_mapping_id) REFERENCES public.control_mappings(id);


--
-- Name: policy_attestations policy_attestations_policy_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policy_attestations
    ADD CONSTRAINT policy_attestations_policy_version_id_fkey FOREIGN KEY (policy_version_id) REFERENCES public.policy_versions(id);


--
-- Name: policy_control_links policy_control_links_policy_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policy_control_links
    ADD CONSTRAINT policy_control_links_policy_version_id_fkey FOREIGN KEY (policy_version_id) REFERENCES public.policy_versions(id);


--
-- Name: policy_versions policy_versions_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policy_versions
    ADD CONSTRAINT policy_versions_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id);


--
-- Name: privacy_notice_versions privacy_notice_versions_privacy_notice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.privacy_notice_versions
    ADD CONSTRAINT privacy_notice_versions_privacy_notice_id_fkey FOREIGN KEY (privacy_notice_id) REFERENCES public.privacy_notices(id);


--
-- Name: processing_inventory_links processing_inventory_links_inventory_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processing_inventory_links
    ADD CONSTRAINT processing_inventory_links_inventory_record_id_fkey FOREIGN KEY (inventory_record_id) REFERENCES public.data_inventory_records(id);


--
-- Name: processing_inventory_links processing_inventory_links_processing_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processing_inventory_links
    ADD CONSTRAINT processing_inventory_links_processing_activity_id_fkey FOREIGN KEY (processing_activity_id) REFERENCES public.processing_activities(id);


--
-- Name: processing_purposes processing_purposes_lawful_basis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processing_purposes
    ADD CONSTRAINT processing_purposes_lawful_basis_id_fkey FOREIGN KEY (lawful_basis_id) REFERENCES public.lawful_bases(id);


--
-- Name: processing_purposes processing_purposes_processing_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processing_purposes
    ADD CONSTRAINT processing_purposes_processing_activity_id_fkey FOREIGN KEY (processing_activity_id) REFERENCES public.processing_activities(id);


--
-- Name: processing_purposes processing_purposes_purpose_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processing_purposes
    ADD CONSTRAINT processing_purposes_purpose_id_fkey FOREIGN KEY (purpose_id) REFERENCES public.purposes(id);


--
-- Name: processing_recipients processing_recipients_processing_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processing_recipients
    ADD CONSTRAINT processing_recipients_processing_activity_id_fkey FOREIGN KEY (processing_activity_id) REFERENCES public.processing_activities(id);


--
-- Name: processing_recipients processing_recipients_purpose_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processing_recipients
    ADD CONSTRAINT processing_recipients_purpose_id_fkey FOREIGN KEY (purpose_id) REFERENCES public.purposes(id);


--
-- Name: processing_recipients processing_recipients_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processing_recipients
    ADD CONSTRAINT processing_recipients_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.recipients(id);


--
-- Name: question_versions question_versions_question_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_versions
    ADD CONSTRAINT question_versions_question_set_id_fkey FOREIGN KEY (question_set_id) REFERENCES public.question_sets(id);


--
-- Name: question_versions question_versions_source_ai_question_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_versions
    ADD CONSTRAINT question_versions_source_ai_question_version_id_fkey FOREIGN KEY (source_ai_question_version_id) REFERENCES public.ai_question_versions(id);


--
-- Name: recipients recipients_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipients
    ADD CONSTRAINT recipients_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: remediation_tasks remediation_tasks_finding_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.remediation_tasks
    ADD CONSTRAINT remediation_tasks_finding_id_fkey FOREIGN KEY (finding_id) REFERENCES public.findings(id);


--
-- Name: remediation_tasks remediation_tasks_treatment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.remediation_tasks
    ADD CONSTRAINT remediation_tasks_treatment_id_fkey FOREIGN KEY (treatment_id) REFERENCES public.risk_treatments(id);


--
-- Name: report_exports report_exports_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_exports
    ADD CONSTRAINT report_exports_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id);


--
-- Name: report_exports report_exports_assessment_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_exports
    ADD CONSTRAINT report_exports_assessment_snapshot_id_fkey FOREIGN KEY (assessment_snapshot_id) REFERENCES public.assessment_snapshots(id);


--
-- Name: report_exports report_exports_report_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_exports
    ADD CONSTRAINT report_exports_report_template_id_fkey FOREIGN KEY (report_template_id) REFERENCES public.report_templates(id);


--
-- Name: requirement_instances requirement_instances_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requirement_instances
    ADD CONSTRAINT requirement_instances_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id);


--
-- Name: requirement_instances requirement_instances_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requirement_instances
    ADD CONSTRAINT requirement_instances_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.framework_requirements(id);


--
-- Name: retention_assignments retention_assignments_retention_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retention_assignments
    ADD CONSTRAINT retention_assignments_retention_rule_id_fkey FOREIGN KEY (retention_rule_id) REFERENCES public.retention_rules(id);


--
-- Name: retention_rules retention_rules_data_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retention_rules
    ADD CONSTRAINT retention_rules_data_category_id_fkey FOREIGN KEY (data_category_id) REFERENCES public.data_categories(id);


--
-- Name: retrieval_runs retrieval_runs_retrieval_index_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retrieval_runs
    ADD CONSTRAINT retrieval_runs_retrieval_index_id_fkey FOREIGN KEY (retrieval_index_id) REFERENCES public.ai_retrieval_indexes(id);


--
-- Name: retrieved_chunks retrieved_chunks_knowledge_chunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retrieved_chunks
    ADD CONSTRAINT retrieved_chunks_knowledge_chunk_id_fkey FOREIGN KEY (knowledge_chunk_id) REFERENCES public.knowledge_chunks(id);


--
-- Name: retrieved_chunks retrieved_chunks_retrieval_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retrieved_chunks
    ADD CONSTRAINT retrieved_chunks_retrieval_run_id_fkey FOREIGN KEY (retrieval_run_id) REFERENCES public.retrieval_runs(id);


--
-- Name: review_decisions review_decisions_answer_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_decisions
    ADD CONSTRAINT review_decisions_answer_revision_id_fkey FOREIGN KEY (answer_revision_id) REFERENCES public.answer_revisions(id);


--
-- Name: review_decisions review_decisions_assessment_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_decisions
    ADD CONSTRAINT review_decisions_assessment_item_id_fkey FOREIGN KEY (assessment_item_id) REFERENCES public.assessment_items(id);


--
-- Name: rights_request_tasks rights_request_tasks_rights_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rights_request_tasks
    ADD CONSTRAINT rights_request_tasks_rights_request_id_fkey FOREIGN KEY (rights_request_id) REFERENCES public.privacy_rights_requests(id);


--
-- Name: rights_request_tasks rights_request_tasks_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rights_request_tasks
    ADD CONSTRAINT rights_request_tasks_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.systems_assets(id);


--
-- Name: risk_acceptance_reviews risk_acceptance_reviews_risk_acceptance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_acceptance_reviews
    ADD CONSTRAINT risk_acceptance_reviews_risk_acceptance_id_fkey FOREIGN KEY (risk_acceptance_id) REFERENCES public.risk_acceptances(id);


--
-- Name: risk_acceptances risk_acceptances_finding_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_acceptances
    ADD CONSTRAINT risk_acceptances_finding_id_fkey FOREIGN KEY (finding_id) REFERENCES public.findings(id);


--
-- Name: risk_acceptances risk_acceptances_remediation_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_acceptances
    ADD CONSTRAINT risk_acceptances_remediation_task_id_fkey FOREIGN KEY (remediation_task_id) REFERENCES public.remediation_tasks(id);


--
-- Name: risk_acceptances risk_acceptances_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_acceptances
    ADD CONSTRAINT risk_acceptances_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.risks(id);


--
-- Name: risk_acceptances risk_acceptances_superseded_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_acceptances
    ADD CONSTRAINT risk_acceptances_superseded_by_id_fkey FOREIGN KEY (superseded_by_id) REFERENCES public.risk_acceptances(id);


--
-- Name: risk_links risk_links_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_links
    ADD CONSTRAINT risk_links_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.risks(id);


--
-- Name: risk_treatments risk_treatments_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_treatments
    ADD CONSTRAINT risk_treatments_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.risks(id);


--
-- Name: risks risks_risk_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_risk_model_id_fkey FOREIGN KEY (risk_model_id) REFERENCES public.risk_models(id);


--
-- Name: risks risks_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.grc_workspaces(id);


--
-- Name: safety_checks safety_checks_generation_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.safety_checks
    ADD CONSTRAINT safety_checks_generation_run_id_fkey FOREIGN KEY (generation_run_id) REFERENCES public.ai_generation_runs(id);


--
-- Name: systems_assets systems_assets_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.systems_assets
    ADD CONSTRAINT systems_assets_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.grc_workspaces(id);


--
-- Name: tenant_catalog_subscriptions tenant_catalog_subscriptions_framework_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_catalog_subscriptions
    ADD CONSTRAINT tenant_catalog_subscriptions_framework_id_fkey FOREIGN KEY (framework_id) REFERENCES public.frameworks(id);


--
-- Name: tenant_catalog_subscriptions tenant_catalog_subscriptions_source_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_catalog_subscriptions
    ADD CONSTRAINT tenant_catalog_subscriptions_source_package_id_fkey FOREIGN KEY (source_package_id) REFERENCES public.content_source_packages(id);


--
-- Name: transfers transfers_processing_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_processing_activity_id_fkey FOREIGN KEY (processing_activity_id) REFERENCES public.processing_activities(id);


--
-- Name: vendor_assessments vendor_assessments_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_assessments
    ADD CONSTRAINT vendor_assessments_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: vendor_findings vendor_findings_vendor_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_findings
    ADD CONSTRAINT vendor_findings_vendor_assessment_id_fkey FOREIGN KEY (vendor_assessment_id) REFERENCES public.vendor_assessments(id);


--
-- Name: webhook_deliveries webhook_deliveries_webhook_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.webhook_contracts(id);


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: access_review_decisions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.access_review_decisions ENABLE ROW LEVEL SECURITY;

--
-- Name: access_review_decisions access_review_decisions_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY access_review_decisions_app_context_isolation ON public.access_review_decisions USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: access_review_decisions access_review_decisions_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY access_review_decisions_tenant_isolation ON public.access_review_decisions USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: access_review_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.access_review_items ENABLE ROW LEVEL SECURITY;

--
-- Name: access_review_items access_review_items_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY access_review_items_app_context_isolation ON public.access_review_items USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: access_review_items access_review_items_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY access_review_items_tenant_isolation ON public.access_review_items USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: access_reviews; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.access_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: access_reviews access_reviews_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY access_reviews_app_context_isolation ON public.access_reviews USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: access_reviews access_reviews_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY access_reviews_tenant_isolation ON public.access_reviews USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: ai_evaluation_runs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_evaluation_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_evaluation_runs ai_evaluation_runs_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ai_evaluation_runs_app_context_isolation ON public.ai_evaluation_runs USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: ai_evaluation_runs ai_evaluation_runs_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ai_evaluation_runs_tenant_isolation ON public.ai_evaluation_runs USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: ai_generation_runs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_generation_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_generation_runs ai_generation_runs_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ai_generation_runs_app_context_isolation ON public.ai_generation_runs USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: ai_generation_runs ai_generation_runs_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ai_generation_runs_tenant_isolation ON public.ai_generation_runs USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: ai_model_deployments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_model_deployments ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_model_deployments ai_model_deployments_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ai_model_deployments_app_context_isolation ON public.ai_model_deployments USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: ai_model_deployments ai_model_deployments_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ai_model_deployments_tenant_isolation ON public.ai_model_deployments USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: ai_output_reviews; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_output_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_output_reviews ai_output_reviews_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ai_output_reviews_app_context_isolation ON public.ai_output_reviews USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: ai_output_reviews ai_output_reviews_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ai_output_reviews_tenant_isolation ON public.ai_output_reviews USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: ai_prompt_versions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_prompt_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_prompt_versions ai_prompt_versions_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ai_prompt_versions_app_context_isolation ON public.ai_prompt_versions USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: ai_prompt_versions ai_prompt_versions_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ai_prompt_versions_tenant_isolation ON public.ai_prompt_versions USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: ai_publication_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_publication_events ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_publication_events ai_publication_events_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ai_publication_events_app_context_isolation ON public.ai_publication_events USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: ai_publication_events ai_publication_events_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ai_publication_events_tenant_isolation ON public.ai_publication_events USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: ai_question_versions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_question_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_question_versions ai_question_versions_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ai_question_versions_app_context_isolation ON public.ai_question_versions USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: ai_question_versions ai_question_versions_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ai_question_versions_tenant_isolation ON public.ai_question_versions USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: ai_retrieval_indexes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_retrieval_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_retrieval_indexes ai_retrieval_indexes_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ai_retrieval_indexes_app_context_isolation ON public.ai_retrieval_indexes USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: ai_retrieval_indexes ai_retrieval_indexes_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ai_retrieval_indexes_tenant_isolation ON public.ai_retrieval_indexes USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: answer_revisions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.answer_revisions ENABLE ROW LEVEL SECURITY;

--
-- Name: answer_revisions answer_revisions_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY answer_revisions_app_context_isolation ON public.answer_revisions USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: answer_revisions answer_revisions_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY answer_revisions_tenant_isolation ON public.answer_revisions USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: applicability_decisions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.applicability_decisions ENABLE ROW LEVEL SECURITY;

--
-- Name: applicability_decisions applicability_decisions_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY applicability_decisions_app_context_isolation ON public.applicability_decisions USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: applicability_decisions applicability_decisions_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY applicability_decisions_tenant_isolation ON public.applicability_decisions USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: assessment_frameworks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.assessment_frameworks ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_frameworks assessment_frameworks_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY assessment_frameworks_app_context_isolation ON public.assessment_frameworks USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: assessment_frameworks assessment_frameworks_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY assessment_frameworks_tenant_isolation ON public.assessment_frameworks USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: assessment_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.assessment_items ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_items assessment_items_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY assessment_items_app_context_isolation ON public.assessment_items USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: assessment_items assessment_items_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY assessment_items_tenant_isolation ON public.assessment_items USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: assessment_scopes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.assessment_scopes ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_scopes assessment_scopes_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY assessment_scopes_app_context_isolation ON public.assessment_scopes USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: assessment_scopes assessment_scopes_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY assessment_scopes_tenant_isolation ON public.assessment_scopes USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: assessment_signoffs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.assessment_signoffs ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_signoffs assessment_signoffs_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY assessment_signoffs_app_context_isolation ON public.assessment_signoffs USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: assessment_signoffs assessment_signoffs_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY assessment_signoffs_tenant_isolation ON public.assessment_signoffs USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: assessment_snapshots; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.assessment_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_snapshots assessment_snapshots_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY assessment_snapshots_app_context_isolation ON public.assessment_snapshots USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: assessment_snapshots assessment_snapshots_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY assessment_snapshots_tenant_isolation ON public.assessment_snapshots USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: assessments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: assessments assessments_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY assessments_app_context_isolation ON public.assessments USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: assessments assessments_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY assessments_tenant_isolation ON public.assessments USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: assurance_alerts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.assurance_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: assurance_alerts assurance_alerts_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY assurance_alerts_app_context_isolation ON public.assurance_alerts USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: assurance_alerts assurance_alerts_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY assurance_alerts_tenant_isolation ON public.assurance_alerts USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: audit_checkpoints; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_checkpoints ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_checkpoints audit_checkpoints_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_checkpoints_app_context_isolation ON public.audit_checkpoints USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: audit_checkpoints audit_checkpoints_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_checkpoints_tenant_isolation ON public.audit_checkpoints USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: audit_engagements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_engagements ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_engagements audit_engagements_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_engagements_app_context_isolation ON public.audit_engagements USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: audit_engagements audit_engagements_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_engagements_tenant_isolation ON public.audit_engagements USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: audit_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_events audit_events_app_context_append; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_events_app_context_append ON public.audit_events FOR INSERT WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: audit_events audit_events_app_context_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_events_app_context_read ON public.audit_events FOR SELECT USING ((tenant_id = public.app_current_tenant()));


--
-- Name: audit_events audit_events_tenant_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_events_tenant_read ON public.audit_events FOR SELECT USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: audit_requests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_requests audit_requests_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_requests_app_context_isolation ON public.audit_requests USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: audit_requests audit_requests_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_requests_tenant_isolation ON public.audit_requests USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: audit_tests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_tests ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_tests audit_tests_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_tests_app_context_isolation ON public.audit_tests USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: audit_tests audit_tests_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_tests_tenant_isolation ON public.audit_tests USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: audit_verifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_verifications audit_verifications_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_verifications_app_context_isolation ON public.audit_verifications USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: audit_verifications audit_verifications_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_verifications_tenant_isolation ON public.audit_verifications USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: authorization_decision_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.authorization_decision_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: authorization_decision_logs authorization_decision_logs_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY authorization_decision_logs_app_context_isolation ON public.authorization_decision_logs USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: authorization_decision_logs authorization_decision_logs_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY authorization_decision_logs_tenant_isolation ON public.authorization_decision_logs USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: automated_control_tests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.automated_control_tests ENABLE ROW LEVEL SECURITY;

--
-- Name: automated_control_tests automated_control_tests_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY automated_control_tests_app_context_isolation ON public.automated_control_tests USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: automated_control_tests automated_control_tests_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY automated_control_tests_tenant_isolation ON public.automated_control_tests USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: automated_test_runs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.automated_test_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: automated_test_runs automated_test_runs_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY automated_test_runs_app_context_isolation ON public.automated_test_runs USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: automated_test_runs automated_test_runs_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY automated_test_runs_tenant_isolation ON public.automated_test_runs USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: automated_tests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.automated_tests ENABLE ROW LEVEL SECURITY;

--
-- Name: automated_tests automated_tests_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY automated_tests_app_context_isolation ON public.automated_tests USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: automated_tests automated_tests_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY automated_tests_tenant_isolation ON public.automated_tests USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: backup_restore_tests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.backup_restore_tests ENABLE ROW LEVEL SECURITY;

--
-- Name: backup_restore_tests backup_restore_tests_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY backup_restore_tests_app_context_isolation ON public.backup_restore_tests USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: backup_restore_tests backup_restore_tests_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY backup_restore_tests_tenant_isolation ON public.backup_restore_tests USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: connector_objects; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.connector_objects ENABLE ROW LEVEL SECURITY;

--
-- Name: connector_objects connector_objects_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY connector_objects_app_context_isolation ON public.connector_objects USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: connector_objects connector_objects_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY connector_objects_tenant_isolation ON public.connector_objects USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: connector_sync_runs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.connector_sync_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: connector_sync_runs connector_sync_runs_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY connector_sync_runs_app_context_isolation ON public.connector_sync_runs USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: connector_sync_runs connector_sync_runs_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY connector_sync_runs_tenant_isolation ON public.connector_sync_runs USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: connectors; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.connectors ENABLE ROW LEVEL SECURITY;

--
-- Name: connectors connectors_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY connectors_app_context_isolation ON public.connectors USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: connectors connectors_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY connectors_tenant_isolation ON public.connectors USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: consent_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;

--
-- Name: consent_events consent_events_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY consent_events_app_context_isolation ON public.consent_events USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: consent_events consent_events_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY consent_events_tenant_isolation ON public.consent_events USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: consent_purposes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.consent_purposes ENABLE ROW LEVEL SECURITY;

--
-- Name: consent_purposes consent_purposes_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY consent_purposes_app_context_isolation ON public.consent_purposes USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: consent_purposes consent_purposes_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY consent_purposes_tenant_isolation ON public.consent_purposes USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: consent_records; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

--
-- Name: consent_records consent_records_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY consent_records_app_context_isolation ON public.consent_records USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: consent_records consent_records_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY consent_records_tenant_isolation ON public.consent_records USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: content_rejected_records; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.content_rejected_records ENABLE ROW LEVEL SECURITY;

--
-- Name: content_rejected_records content_rejected_records_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY content_rejected_records_app_context_isolation ON public.content_rejected_records USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: content_rejected_records content_rejected_records_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY content_rejected_records_tenant_isolation ON public.content_rejected_records USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: content_source_packages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.content_source_packages ENABLE ROW LEVEL SECURITY;

--
-- Name: content_source_packages content_source_packages_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY content_source_packages_app_context_isolation ON public.content_source_packages USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: content_source_packages content_source_packages_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY content_source_packages_tenant_isolation ON public.content_source_packages USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: control_instances; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.control_instances ENABLE ROW LEVEL SECURITY;

--
-- Name: control_instances control_instances_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY control_instances_app_context_isolation ON public.control_instances USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: control_instances control_instances_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY control_instances_tenant_isolation ON public.control_instances USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: control_mappings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.control_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: control_mappings control_mappings_select_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY control_mappings_select_app_context_isolation ON public.control_mappings FOR SELECT USING (((tenant_id = public.app_current_tenant()) OR (owner_scope = 'global'::public.catalog_owner_scope)));


--
-- Name: control_mappings control_mappings_select_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY control_mappings_select_tenant_isolation ON public.control_mappings FOR SELECT USING ((((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)) OR (owner_scope = 'global'::public.catalog_owner_scope)));


--
-- Name: control_mappings control_mappings_write_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY control_mappings_write_app_context_isolation ON public.control_mappings USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: control_mappings control_mappings_write_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY control_mappings_write_tenant_isolation ON public.control_mappings USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: control_sets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.control_sets ENABLE ROW LEVEL SECURITY;

--
-- Name: control_sets control_sets_select_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY control_sets_select_app_context_isolation ON public.control_sets FOR SELECT USING (((tenant_id = public.app_current_tenant()) OR (owner_scope = 'global'::public.catalog_owner_scope)));


--
-- Name: control_sets control_sets_select_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY control_sets_select_tenant_isolation ON public.control_sets FOR SELECT USING ((((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)) OR (owner_scope = 'global'::public.catalog_owner_scope)));


--
-- Name: control_sets control_sets_write_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY control_sets_write_app_context_isolation ON public.control_sets USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: control_sets control_sets_write_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY control_sets_write_tenant_isolation ON public.control_sets USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: control_subcontrols; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.control_subcontrols ENABLE ROW LEVEL SECURITY;

--
-- Name: control_subcontrols control_subcontrols_select_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY control_subcontrols_select_app_context_isolation ON public.control_subcontrols FOR SELECT USING (((tenant_id = public.app_current_tenant()) OR (owner_scope = 'global'::public.catalog_owner_scope)));


--
-- Name: control_subcontrols control_subcontrols_select_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY control_subcontrols_select_tenant_isolation ON public.control_subcontrols FOR SELECT USING ((((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)) OR (owner_scope = 'global'::public.catalog_owner_scope)));


--
-- Name: control_subcontrols control_subcontrols_write_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY control_subcontrols_write_app_context_isolation ON public.control_subcontrols USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: control_subcontrols control_subcontrols_write_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY control_subcontrols_write_tenant_isolation ON public.control_subcontrols USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: control_test_results; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.control_test_results ENABLE ROW LEVEL SECURITY;

--
-- Name: control_test_results control_test_results_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY control_test_results_app_context_isolation ON public.control_test_results USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: control_test_results control_test_results_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY control_test_results_tenant_isolation ON public.control_test_results USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: controls; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;

--
-- Name: controls controls_select_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY controls_select_app_context_isolation ON public.controls FOR SELECT USING (((tenant_id = public.app_current_tenant()) OR (owner_scope = 'global'::public.catalog_owner_scope)));


--
-- Name: controls controls_select_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY controls_select_tenant_isolation ON public.controls FOR SELECT USING ((((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)) OR (owner_scope = 'global'::public.catalog_owner_scope)));


--
-- Name: controls controls_write_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY controls_write_app_context_isolation ON public.controls USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: controls controls_write_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY controls_write_tenant_isolation ON public.controls USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: custom_field_definitions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_field_definitions custom_field_definitions_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY custom_field_definitions_app_context_isolation ON public.custom_field_definitions USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: custom_field_definitions custom_field_definitions_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY custom_field_definitions_tenant_isolation ON public.custom_field_definitions USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: custom_object_definitions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.custom_object_definitions ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_object_definitions custom_object_definitions_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY custom_object_definitions_app_context_isolation ON public.custom_object_definitions USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: custom_object_definitions custom_object_definitions_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY custom_object_definitions_tenant_isolation ON public.custom_object_definitions USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: custom_records; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.custom_records ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_records custom_records_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY custom_records_app_context_isolation ON public.custom_records USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: custom_records custom_records_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY custom_records_tenant_isolation ON public.custom_records USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: custom_values; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.custom_values ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_values custom_values_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY custom_values_app_context_isolation ON public.custom_values USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: custom_values custom_values_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY custom_values_tenant_isolation ON public.custom_values USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: data_categories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.data_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: data_categories data_categories_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY data_categories_app_context_isolation ON public.data_categories USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: data_categories data_categories_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY data_categories_tenant_isolation ON public.data_categories USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: data_discovery_findings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.data_discovery_findings ENABLE ROW LEVEL SECURITY;

--
-- Name: data_discovery_findings data_discovery_findings_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY data_discovery_findings_app_context_isolation ON public.data_discovery_findings USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: data_discovery_findings data_discovery_findings_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY data_discovery_findings_tenant_isolation ON public.data_discovery_findings USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: data_discovery_scans; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.data_discovery_scans ENABLE ROW LEVEL SECURITY;

--
-- Name: data_discovery_scans data_discovery_scans_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY data_discovery_scans_app_context_isolation ON public.data_discovery_scans USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: data_discovery_scans data_discovery_scans_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY data_discovery_scans_tenant_isolation ON public.data_discovery_scans USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: data_inventory_records; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.data_inventory_records ENABLE ROW LEVEL SECURITY;

--
-- Name: data_inventory_records data_inventory_records_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY data_inventory_records_app_context_isolation ON public.data_inventory_records USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: data_inventory_records data_inventory_records_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY data_inventory_records_tenant_isolation ON public.data_inventory_records USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: data_subject_categories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.data_subject_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: data_subject_categories data_subject_categories_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY data_subject_categories_app_context_isolation ON public.data_subject_categories USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: data_subject_categories data_subject_categories_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY data_subject_categories_tenant_isolation ON public.data_subject_categories USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: deletion_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.deletion_items ENABLE ROW LEVEL SECURITY;

--
-- Name: deletion_items deletion_items_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY deletion_items_app_context_isolation ON public.deletion_items USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: deletion_items deletion_items_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY deletion_items_tenant_isolation ON public.deletion_items USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: deletion_jobs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.deletion_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: deletion_jobs deletion_jobs_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY deletion_jobs_app_context_isolation ON public.deletion_jobs USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: deletion_jobs deletion_jobs_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY deletion_jobs_tenant_isolation ON public.deletion_jobs USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: dpia_assessments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.dpia_assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: dpia_assessments dpia_assessments_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY dpia_assessments_app_context_isolation ON public.dpia_assessments USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: dpia_assessments dpia_assessments_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY dpia_assessments_tenant_isolation ON public.dpia_assessments USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: dpia_risks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.dpia_risks ENABLE ROW LEVEL SECURITY;

--
-- Name: dpia_risks dpia_risks_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY dpia_risks_app_context_isolation ON public.dpia_risks USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: dpia_risks dpia_risks_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY dpia_risks_tenant_isolation ON public.dpia_risks USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: dpias; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.dpias ENABLE ROW LEVEL SECURITY;

--
-- Name: dpias dpias_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY dpias_app_context_isolation ON public.dpias USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: dpias dpias_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY dpias_tenant_isolation ON public.dpias USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: encryption_key_records; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.encryption_key_records ENABLE ROW LEVEL SECURITY;

--
-- Name: encryption_key_records encryption_key_records_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY encryption_key_records_app_context_isolation ON public.encryption_key_records USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: encryption_key_records encryption_key_records_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY encryption_key_records_tenant_isolation ON public.encryption_key_records USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: evaluation_cases; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.evaluation_cases ENABLE ROW LEVEL SECURITY;

--
-- Name: evaluation_cases evaluation_cases_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evaluation_cases_app_context_isolation ON public.evaluation_cases USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: evaluation_cases evaluation_cases_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evaluation_cases_tenant_isolation ON public.evaluation_cases USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: evaluation_results; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.evaluation_results ENABLE ROW LEVEL SECURITY;

--
-- Name: evaluation_results evaluation_results_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evaluation_results_app_context_isolation ON public.evaluation_results USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: evaluation_results evaluation_results_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evaluation_results_tenant_isolation ON public.evaluation_results USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: evaluation_suites; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.evaluation_suites ENABLE ROW LEVEL SECURITY;

--
-- Name: evaluation_suites evaluation_suites_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evaluation_suites_app_context_isolation ON public.evaluation_suites USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: evaluation_suites evaluation_suites_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evaluation_suites_tenant_isolation ON public.evaluation_suites USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: evidence_custody_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.evidence_custody_events ENABLE ROW LEVEL SECURITY;

--
-- Name: evidence_custody_events evidence_custody_events_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evidence_custody_events_app_context_isolation ON public.evidence_custody_events USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: evidence_custody_events evidence_custody_events_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evidence_custody_events_tenant_isolation ON public.evidence_custody_events USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: evidence_expiry_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.evidence_expiry_events ENABLE ROW LEVEL SECURITY;

--
-- Name: evidence_expiry_events evidence_expiry_events_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evidence_expiry_events_app_context_isolation ON public.evidence_expiry_events USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: evidence_expiry_events evidence_expiry_events_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evidence_expiry_events_tenant_isolation ON public.evidence_expiry_events USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: evidence_links; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.evidence_links ENABLE ROW LEVEL SECURITY;

--
-- Name: evidence_links evidence_links_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evidence_links_app_context_isolation ON public.evidence_links USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: evidence_links evidence_links_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evidence_links_tenant_isolation ON public.evidence_links USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: evidence_objects; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.evidence_objects ENABLE ROW LEVEL SECURITY;

--
-- Name: evidence_objects evidence_objects_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evidence_objects_app_context_isolation ON public.evidence_objects USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: evidence_objects evidence_objects_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evidence_objects_tenant_isolation ON public.evidence_objects USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: evidence_requests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.evidence_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: evidence_requests evidence_requests_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evidence_requests_app_context_isolation ON public.evidence_requests USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: evidence_requests evidence_requests_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evidence_requests_tenant_isolation ON public.evidence_requests USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: evidence_reviews; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.evidence_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: evidence_reviews evidence_reviews_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evidence_reviews_app_context_isolation ON public.evidence_reviews USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: evidence_reviews evidence_reviews_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evidence_reviews_tenant_isolation ON public.evidence_reviews USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: evidence_samples; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.evidence_samples ENABLE ROW LEVEL SECURITY;

--
-- Name: evidence_samples evidence_samples_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evidence_samples_app_context_isolation ON public.evidence_samples USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: evidence_samples evidence_samples_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evidence_samples_tenant_isolation ON public.evidence_samples USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: evidence_versions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.evidence_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: evidence_versions evidence_versions_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evidence_versions_app_context_isolation ON public.evidence_versions USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: evidence_versions evidence_versions_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY evidence_versions_tenant_isolation ON public.evidence_versions USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: export_manifests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.export_manifests ENABLE ROW LEVEL SECURITY;

--
-- Name: export_manifests export_manifests_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY export_manifests_app_context_isolation ON public.export_manifests USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: export_manifests export_manifests_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY export_manifests_tenant_isolation ON public.export_manifests USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: findings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;

--
-- Name: findings findings_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY findings_app_context_isolation ON public.findings USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: findings findings_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY findings_tenant_isolation ON public.findings USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: framework_content_packs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.framework_content_packs ENABLE ROW LEVEL SECURITY;

--
-- Name: framework_content_packs framework_content_packs_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY framework_content_packs_app_context_isolation ON public.framework_content_packs USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: framework_content_packs framework_content_packs_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY framework_content_packs_tenant_isolation ON public.framework_content_packs USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: framework_diff_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.framework_diff_items ENABLE ROW LEVEL SECURITY;

--
-- Name: framework_diff_items framework_diff_items_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY framework_diff_items_delete ON public.framework_diff_items FOR DELETE USING ((tenant_id = public.app_current_tenant()));


--
-- Name: framework_diff_items framework_diff_items_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY framework_diff_items_insert ON public.framework_diff_items FOR INSERT WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: framework_diff_items framework_diff_items_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY framework_diff_items_select ON public.framework_diff_items FOR SELECT USING ((tenant_id = public.app_current_tenant()));


--
-- Name: framework_diff_items framework_diff_items_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY framework_diff_items_update ON public.framework_diff_items FOR UPDATE USING ((tenant_id = public.app_current_tenant()));


--
-- Name: framework_diffs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.framework_diffs ENABLE ROW LEVEL SECURITY;

--
-- Name: framework_diffs framework_diffs_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY framework_diffs_delete ON public.framework_diffs FOR DELETE USING ((tenant_id = public.app_current_tenant()));


--
-- Name: framework_diffs framework_diffs_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY framework_diffs_insert ON public.framework_diffs FOR INSERT WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: framework_diffs framework_diffs_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY framework_diffs_select ON public.framework_diffs FOR SELECT USING ((tenant_id = public.app_current_tenant()));


--
-- Name: framework_diffs framework_diffs_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY framework_diffs_update ON public.framework_diffs FOR UPDATE USING ((tenant_id = public.app_current_tenant()));


--
-- Name: framework_requirements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.framework_requirements ENABLE ROW LEVEL SECURITY;

--
-- Name: framework_requirements framework_requirements_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY framework_requirements_app_context_isolation ON public.framework_requirements USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: framework_requirements framework_requirements_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY framework_requirements_tenant_isolation ON public.framework_requirements USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: framework_update_impacts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.framework_update_impacts ENABLE ROW LEVEL SECURITY;

--
-- Name: framework_update_impacts framework_update_impacts_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY framework_update_impacts_delete ON public.framework_update_impacts FOR DELETE USING ((tenant_id = public.app_current_tenant()));


--
-- Name: framework_update_impacts framework_update_impacts_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY framework_update_impacts_insert ON public.framework_update_impacts FOR INSERT WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: framework_update_impacts framework_update_impacts_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY framework_update_impacts_select ON public.framework_update_impacts FOR SELECT USING ((tenant_id = public.app_current_tenant()));


--
-- Name: framework_update_impacts framework_update_impacts_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY framework_update_impacts_update ON public.framework_update_impacts FOR UPDATE USING ((tenant_id = public.app_current_tenant()));


--
-- Name: framework_versions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.framework_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: framework_versions framework_versions_select_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY framework_versions_select_app_context_isolation ON public.framework_versions FOR SELECT USING (((tenant_id = public.app_current_tenant()) OR (owner_scope = 'global'::public.catalog_owner_scope)));


--
-- Name: framework_versions framework_versions_select_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY framework_versions_select_tenant_isolation ON public.framework_versions FOR SELECT USING ((((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)) OR (owner_scope = 'global'::public.catalog_owner_scope)));


--
-- Name: framework_versions framework_versions_write_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY framework_versions_write_app_context_isolation ON public.framework_versions USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: framework_versions framework_versions_write_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY framework_versions_write_tenant_isolation ON public.framework_versions USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: frameworks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.frameworks ENABLE ROW LEVEL SECURITY;

--
-- Name: frameworks frameworks_select_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY frameworks_select_app_context_isolation ON public.frameworks FOR SELECT USING (((tenant_id = public.app_current_tenant()) OR (owner_scope = 'global'::public.catalog_owner_scope)));


--
-- Name: frameworks frameworks_select_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY frameworks_select_tenant_isolation ON public.frameworks FOR SELECT USING ((((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)) OR (owner_scope = 'global'::public.catalog_owner_scope)));


--
-- Name: frameworks frameworks_write_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY frameworks_write_app_context_isolation ON public.frameworks USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: frameworks frameworks_write_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY frameworks_write_tenant_isolation ON public.frameworks USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: generation_citations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.generation_citations ENABLE ROW LEVEL SECURITY;

--
-- Name: generation_citations generation_citations_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY generation_citations_app_context_isolation ON public.generation_citations USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: generation_citations generation_citations_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY generation_citations_tenant_isolation ON public.generation_citations USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: grc_workspaces; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.grc_workspaces ENABLE ROW LEVEL SECURITY;

--
-- Name: grc_workspaces grc_workspaces_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY grc_workspaces_app_context_isolation ON public.grc_workspaces USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: grc_workspaces grc_workspaces_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY grc_workspaces_tenant_isolation ON public.grc_workspaces USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: harmonized_controls; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.harmonized_controls ENABLE ROW LEVEL SECURITY;

--
-- Name: harmonized_controls harmonized_controls_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY harmonized_controls_app_context_isolation ON public.harmonized_controls USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: harmonized_controls harmonized_controls_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY harmonized_controls_tenant_isolation ON public.harmonized_controls USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: identity_role_grants; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.identity_role_grants ENABLE ROW LEVEL SECURITY;

--
-- Name: identity_role_grants identity_role_grants_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY identity_role_grants_app_context_isolation ON public.identity_role_grants USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: identity_role_grants identity_role_grants_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY identity_role_grants_tenant_isolation ON public.identity_role_grants USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: identity_roles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.identity_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: identity_roles identity_roles_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY identity_roles_app_context_isolation ON public.identity_roles USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: identity_roles identity_roles_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY identity_roles_tenant_isolation ON public.identity_roles USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: identity_service_accounts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.identity_service_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: identity_service_accounts identity_service_accounts_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY identity_service_accounts_app_context_isolation ON public.identity_service_accounts USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: identity_service_accounts identity_service_accounts_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY identity_service_accounts_tenant_isolation ON public.identity_service_accounts USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: identity_sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.identity_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: identity_sessions identity_sessions_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY identity_sessions_app_context_isolation ON public.identity_sessions USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: identity_sessions identity_sessions_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY identity_sessions_tenant_isolation ON public.identity_sessions USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: identity_tenants; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.identity_tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: identity_tenants identity_tenants_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY identity_tenants_app_context_isolation ON public.identity_tenants USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: identity_tenants identity_tenants_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY identity_tenants_tenant_isolation ON public.identity_tenants USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: identity_users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.identity_users ENABLE ROW LEVEL SECURITY;

--
-- Name: identity_users identity_users_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY identity_users_app_context_isolation ON public.identity_users USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: identity_users identity_users_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY identity_users_tenant_isolation ON public.identity_users USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: identity_workspace_delegations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.identity_workspace_delegations ENABLE ROW LEVEL SECURITY;

--
-- Name: identity_workspace_delegations identity_workspace_delegations_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY identity_workspace_delegations_app_context_isolation ON public.identity_workspace_delegations USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: identity_workspace_delegations identity_workspace_delegations_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY identity_workspace_delegations_tenant_isolation ON public.identity_workspace_delegations USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: incident_assessments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.incident_assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: incident_assessments incident_assessments_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY incident_assessments_app_context_isolation ON public.incident_assessments USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: incident_assessments incident_assessments_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY incident_assessments_tenant_isolation ON public.incident_assessments USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: incident_notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.incident_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: incident_notifications incident_notifications_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY incident_notifications_app_context_isolation ON public.incident_notifications USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: incident_notifications incident_notifications_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY incident_notifications_tenant_isolation ON public.incident_notifications USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: knowledge_chunks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_chunks knowledge_chunks_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY knowledge_chunks_app_context_isolation ON public.knowledge_chunks USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: knowledge_chunks knowledge_chunks_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY knowledge_chunks_tenant_isolation ON public.knowledge_chunks USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: lawful_bases; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lawful_bases ENABLE ROW LEVEL SECURITY;

--
-- Name: lawful_bases lawful_bases_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lawful_bases_app_context_isolation ON public.lawful_bases USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: lawful_bases lawful_bases_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lawful_bases_tenant_isolation ON public.lawful_bases USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: legal_hold_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.legal_hold_items ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_hold_items legal_hold_items_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY legal_hold_items_app_context_isolation ON public.legal_hold_items USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: legal_hold_items legal_hold_items_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY legal_hold_items_tenant_isolation ON public.legal_hold_items USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: legal_holds; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.legal_holds ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_holds legal_holds_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY legal_holds_app_context_isolation ON public.legal_holds USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: legal_holds legal_holds_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY legal_holds_tenant_isolation ON public.legal_holds USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: malware_scan_results; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.malware_scan_results ENABLE ROW LEVEL SECURITY;

--
-- Name: malware_scan_results malware_scan_results_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY malware_scan_results_app_context_isolation ON public.malware_scan_results USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: malware_scan_results malware_scan_results_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY malware_scan_results_tenant_isolation ON public.malware_scan_results USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: mapping_conflicts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.mapping_conflicts ENABLE ROW LEVEL SECURITY;

--
-- Name: mapping_conflicts mapping_conflicts_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY mapping_conflicts_app_context_isolation ON public.mapping_conflicts USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: mapping_conflicts mapping_conflicts_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY mapping_conflicts_tenant_isolation ON public.mapping_conflicts USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: mapping_reviews; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.mapping_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: mapping_reviews mapping_reviews_select_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY mapping_reviews_select_app_context_isolation ON public.mapping_reviews FOR SELECT USING (((tenant_id = public.app_current_tenant()) OR (EXISTS ( SELECT 1
   FROM public.control_mappings m
  WHERE ((m.id = mapping_reviews.control_mapping_id) AND (m.owner_scope = 'global'::public.catalog_owner_scope))))));


--
-- Name: mapping_reviews mapping_reviews_select_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY mapping_reviews_select_tenant_isolation ON public.mapping_reviews FOR SELECT USING ((((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)) OR (EXISTS ( SELECT 1
   FROM public.control_mappings m
  WHERE ((m.id = mapping_reviews.control_mapping_id) AND (m.owner_scope = 'global'::public.catalog_owner_scope))))));


--
-- Name: mapping_reviews mapping_reviews_write_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY mapping_reviews_write_app_context_isolation ON public.mapping_reviews USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: mapping_reviews mapping_reviews_write_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY mapping_reviews_write_tenant_isolation ON public.mapping_reviews USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: mapping_versions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.mapping_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: mapping_versions mapping_versions_select_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY mapping_versions_select_app_context_isolation ON public.mapping_versions FOR SELECT USING (((tenant_id = public.app_current_tenant()) OR (owner_scope = 'global'::public.catalog_owner_scope)));


--
-- Name: mapping_versions mapping_versions_select_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY mapping_versions_select_tenant_isolation ON public.mapping_versions FOR SELECT USING ((((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)) OR (owner_scope = 'global'::public.catalog_owner_scope)));


--
-- Name: mapping_versions mapping_versions_write_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY mapping_versions_write_app_context_isolation ON public.mapping_versions USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: mapping_versions mapping_versions_write_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY mapping_versions_write_tenant_isolation ON public.mapping_versions USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: outbox_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;

--
-- Name: outbox_events outbox_events_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY outbox_events_app_context_isolation ON public.outbox_events USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: outbox_events outbox_events_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY outbox_events_tenant_isolation ON public.outbox_events USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: policies; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

--
-- Name: policies policies_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY policies_app_context_isolation ON public.policies USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: policies policies_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY policies_tenant_isolation ON public.policies USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: policy_attestations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.policy_attestations ENABLE ROW LEVEL SECURITY;

--
-- Name: policy_attestations policy_attestations_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY policy_attestations_app_context_isolation ON public.policy_attestations USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: policy_attestations policy_attestations_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY policy_attestations_tenant_isolation ON public.policy_attestations USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: policy_control_links; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.policy_control_links ENABLE ROW LEVEL SECURITY;

--
-- Name: policy_control_links policy_control_links_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY policy_control_links_app_context_isolation ON public.policy_control_links USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: policy_control_links policy_control_links_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY policy_control_links_tenant_isolation ON public.policy_control_links USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: policy_versions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: policy_versions policy_versions_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY policy_versions_app_context_isolation ON public.policy_versions USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: policy_versions policy_versions_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY policy_versions_tenant_isolation ON public.policy_versions USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: privacy_incidents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.privacy_incidents ENABLE ROW LEVEL SECURITY;

--
-- Name: privacy_incidents privacy_incidents_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY privacy_incidents_app_context_isolation ON public.privacy_incidents USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: privacy_incidents privacy_incidents_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY privacy_incidents_tenant_isolation ON public.privacy_incidents USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: privacy_notice_versions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.privacy_notice_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: privacy_notice_versions privacy_notice_versions_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY privacy_notice_versions_app_context_isolation ON public.privacy_notice_versions USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: privacy_notice_versions privacy_notice_versions_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY privacy_notice_versions_tenant_isolation ON public.privacy_notice_versions USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: privacy_notices; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.privacy_notices ENABLE ROW LEVEL SECURITY;

--
-- Name: privacy_notices privacy_notices_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY privacy_notices_app_context_isolation ON public.privacy_notices USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: privacy_notices privacy_notices_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY privacy_notices_tenant_isolation ON public.privacy_notices USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: privacy_rights_requests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.privacy_rights_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: privacy_rights_requests privacy_rights_requests_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY privacy_rights_requests_app_context_isolation ON public.privacy_rights_requests USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: privacy_rights_requests privacy_rights_requests_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY privacy_rights_requests_tenant_isolation ON public.privacy_rights_requests USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: processing_activities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.processing_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: processing_activities processing_activities_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY processing_activities_app_context_isolation ON public.processing_activities USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: processing_activities processing_activities_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY processing_activities_tenant_isolation ON public.processing_activities USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: processing_inventory_links; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.processing_inventory_links ENABLE ROW LEVEL SECURITY;

--
-- Name: processing_inventory_links processing_inventory_links_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY processing_inventory_links_app_context_isolation ON public.processing_inventory_links USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: processing_inventory_links processing_inventory_links_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY processing_inventory_links_tenant_isolation ON public.processing_inventory_links USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: processing_purposes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.processing_purposes ENABLE ROW LEVEL SECURITY;

--
-- Name: processing_purposes processing_purposes_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY processing_purposes_app_context_isolation ON public.processing_purposes USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: processing_purposes processing_purposes_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY processing_purposes_tenant_isolation ON public.processing_purposes USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: processing_recipients; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.processing_recipients ENABLE ROW LEVEL SECURITY;

--
-- Name: processing_recipients processing_recipients_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY processing_recipients_app_context_isolation ON public.processing_recipients USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: processing_recipients processing_recipients_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY processing_recipients_tenant_isolation ON public.processing_recipients USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: product_assurance_evidence; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.product_assurance_evidence ENABLE ROW LEVEL SECURITY;

--
-- Name: product_assurance_evidence product_assurance_evidence_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY product_assurance_evidence_app_context_isolation ON public.product_assurance_evidence USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: product_assurance_evidence product_assurance_evidence_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY product_assurance_evidence_tenant_isolation ON public.product_assurance_evidence USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: purposes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.purposes ENABLE ROW LEVEL SECURITY;

--
-- Name: purposes purposes_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY purposes_app_context_isolation ON public.purposes USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: purposes purposes_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY purposes_tenant_isolation ON public.purposes USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: question_sets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.question_sets ENABLE ROW LEVEL SECURITY;

--
-- Name: question_sets question_sets_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY question_sets_app_context_isolation ON public.question_sets USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: question_sets question_sets_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY question_sets_tenant_isolation ON public.question_sets USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: question_versions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.question_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: question_versions question_versions_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY question_versions_app_context_isolation ON public.question_versions USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: question_versions question_versions_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY question_versions_tenant_isolation ON public.question_versions USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: rate_limit_policies; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.rate_limit_policies ENABLE ROW LEVEL SECURITY;

--
-- Name: rate_limit_policies rate_limit_policies_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rate_limit_policies_app_context_isolation ON public.rate_limit_policies USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: rate_limit_policies rate_limit_policies_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rate_limit_policies_tenant_isolation ON public.rate_limit_policies USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: recipients; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.recipients ENABLE ROW LEVEL SECURITY;

--
-- Name: recipients recipients_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY recipients_app_context_isolation ON public.recipients USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: recipients recipients_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY recipients_tenant_isolation ON public.recipients USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: remediation_tasks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.remediation_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: remediation_tasks remediation_tasks_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY remediation_tasks_app_context_isolation ON public.remediation_tasks USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: remediation_tasks remediation_tasks_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY remediation_tasks_tenant_isolation ON public.remediation_tasks USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: report_exports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;

--
-- Name: report_exports report_exports_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY report_exports_app_context_isolation ON public.report_exports USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: report_exports report_exports_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY report_exports_tenant_isolation ON public.report_exports USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: report_templates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: report_templates report_templates_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY report_templates_app_context_isolation ON public.report_templates USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: report_templates report_templates_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY report_templates_tenant_isolation ON public.report_templates USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: requirement_instances; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.requirement_instances ENABLE ROW LEVEL SECURITY;

--
-- Name: requirement_instances requirement_instances_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY requirement_instances_app_context_isolation ON public.requirement_instances USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: requirement_instances requirement_instances_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY requirement_instances_tenant_isolation ON public.requirement_instances USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: retention_assignments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.retention_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: retention_assignments retention_assignments_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY retention_assignments_app_context_isolation ON public.retention_assignments USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: retention_assignments retention_assignments_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY retention_assignments_tenant_isolation ON public.retention_assignments USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: retention_rules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.retention_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: retention_rules retention_rules_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY retention_rules_app_context_isolation ON public.retention_rules USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: retention_rules retention_rules_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY retention_rules_tenant_isolation ON public.retention_rules USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: retention_schedules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.retention_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: retention_schedules retention_schedules_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY retention_schedules_app_context_isolation ON public.retention_schedules USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: retention_schedules retention_schedules_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY retention_schedules_tenant_isolation ON public.retention_schedules USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: retrieval_runs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.retrieval_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: retrieval_runs retrieval_runs_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY retrieval_runs_app_context_isolation ON public.retrieval_runs USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: retrieval_runs retrieval_runs_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY retrieval_runs_tenant_isolation ON public.retrieval_runs USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: retrieved_chunks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.retrieved_chunks ENABLE ROW LEVEL SECURITY;

--
-- Name: retrieved_chunks retrieved_chunks_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY retrieved_chunks_app_context_isolation ON public.retrieved_chunks USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: retrieved_chunks retrieved_chunks_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY retrieved_chunks_tenant_isolation ON public.retrieved_chunks USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: review_decisions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.review_decisions ENABLE ROW LEVEL SECURITY;

--
-- Name: review_decisions review_decisions_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY review_decisions_app_context_isolation ON public.review_decisions USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: review_decisions review_decisions_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY review_decisions_tenant_isolation ON public.review_decisions USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: rights_request_tasks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.rights_request_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: rights_request_tasks rights_request_tasks_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rights_request_tasks_app_context_isolation ON public.rights_request_tasks USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: rights_request_tasks rights_request_tasks_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rights_request_tasks_tenant_isolation ON public.rights_request_tasks USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: risk_acceptance_reviews; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.risk_acceptance_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: risk_acceptance_reviews risk_acceptance_reviews_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY risk_acceptance_reviews_app_context_isolation ON public.risk_acceptance_reviews USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: risk_acceptance_reviews risk_acceptance_reviews_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY risk_acceptance_reviews_tenant_isolation ON public.risk_acceptance_reviews USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: risk_acceptances; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.risk_acceptances ENABLE ROW LEVEL SECURITY;

--
-- Name: risk_acceptances risk_acceptances_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY risk_acceptances_app_context_isolation ON public.risk_acceptances USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: risk_acceptances risk_acceptances_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY risk_acceptances_tenant_isolation ON public.risk_acceptances USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: risk_links; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.risk_links ENABLE ROW LEVEL SECURITY;

--
-- Name: risk_links risk_links_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY risk_links_app_context_isolation ON public.risk_links USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: risk_links risk_links_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY risk_links_tenant_isolation ON public.risk_links USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: risk_models; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.risk_models ENABLE ROW LEVEL SECURITY;

--
-- Name: risk_models risk_models_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY risk_models_app_context_isolation ON public.risk_models USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: risk_models risk_models_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY risk_models_tenant_isolation ON public.risk_models USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: risk_treatments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.risk_treatments ENABLE ROW LEVEL SECURITY;

--
-- Name: risk_treatments risk_treatments_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY risk_treatments_app_context_isolation ON public.risk_treatments USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: risk_treatments risk_treatments_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY risk_treatments_tenant_isolation ON public.risk_treatments USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: risks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;

--
-- Name: risks risks_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY risks_app_context_isolation ON public.risks USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: risks risks_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY risks_tenant_isolation ON public.risks USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: safety_checks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.safety_checks ENABLE ROW LEVEL SECURITY;

--
-- Name: safety_checks safety_checks_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY safety_checks_app_context_isolation ON public.safety_checks USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: safety_checks safety_checks_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY safety_checks_tenant_isolation ON public.safety_checks USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: sdlc_release_gates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sdlc_release_gates ENABLE ROW LEVEL SECURITY;

--
-- Name: sdlc_release_gates sdlc_release_gates_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sdlc_release_gates_app_context_isolation ON public.sdlc_release_gates USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: sdlc_release_gates sdlc_release_gates_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sdlc_release_gates_tenant_isolation ON public.sdlc_release_gates USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: siem_export_records; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.siem_export_records ENABLE ROW LEVEL SECURITY;

--
-- Name: siem_export_records siem_export_records_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY siem_export_records_app_context_isolation ON public.siem_export_records USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: siem_export_records siem_export_records_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY siem_export_records_tenant_isolation ON public.siem_export_records USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: systems_assets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.systems_assets ENABLE ROW LEVEL SECURITY;

--
-- Name: systems_assets systems_assets_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY systems_assets_app_context_isolation ON public.systems_assets USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: systems_assets systems_assets_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY systems_assets_tenant_isolation ON public.systems_assets USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: tenant_catalog_subscriptions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tenant_catalog_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_catalog_subscriptions tenant_catalog_subscriptions_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_catalog_subscriptions_app_context_isolation ON public.tenant_catalog_subscriptions USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: tenant_catalog_subscriptions tenant_catalog_subscriptions_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_catalog_subscriptions_tenant_isolation ON public.tenant_catalog_subscriptions USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: test_procedures; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.test_procedures ENABLE ROW LEVEL SECURITY;

--
-- Name: test_procedures test_procedures_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY test_procedures_app_context_isolation ON public.test_procedures USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: test_procedures test_procedures_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY test_procedures_tenant_isolation ON public.test_procedures USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: transfers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: transfers transfers_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY transfers_app_context_isolation ON public.transfers USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: transfers transfers_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY transfers_tenant_isolation ON public.transfers USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: trust_center_artifacts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.trust_center_artifacts ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_center_artifacts trust_center_artifacts_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY trust_center_artifacts_app_context_isolation ON public.trust_center_artifacts USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: trust_center_artifacts trust_center_artifacts_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY trust_center_artifacts_tenant_isolation ON public.trust_center_artifacts USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: universal_tasks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.universal_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: universal_tasks universal_tasks_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY universal_tasks_delete ON public.universal_tasks FOR DELETE USING ((tenant_id = public.app_current_tenant()));


--
-- Name: universal_tasks universal_tasks_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY universal_tasks_insert ON public.universal_tasks FOR INSERT WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: universal_tasks universal_tasks_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY universal_tasks_select ON public.universal_tasks FOR SELECT USING ((tenant_id = public.app_current_tenant()));


--
-- Name: universal_tasks universal_tasks_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY universal_tasks_update ON public.universal_tasks FOR UPDATE USING ((tenant_id = public.app_current_tenant()));


--
-- Name: upload_sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: upload_sessions upload_sessions_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY upload_sessions_app_context_isolation ON public.upload_sessions USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: upload_sessions upload_sessions_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY upload_sessions_tenant_isolation ON public.upload_sessions USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: vendor_assessments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.vendor_assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: vendor_assessments vendor_assessments_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY vendor_assessments_app_context_isolation ON public.vendor_assessments USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: vendor_assessments vendor_assessments_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY vendor_assessments_tenant_isolation ON public.vendor_assessments USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: vendor_findings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.vendor_findings ENABLE ROW LEVEL SECURITY;

--
-- Name: vendor_findings vendor_findings_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY vendor_findings_app_context_isolation ON public.vendor_findings USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: vendor_findings vendor_findings_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY vendor_findings_tenant_isolation ON public.vendor_findings USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: vendors; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

--
-- Name: vendors vendors_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY vendors_app_context_isolation ON public.vendors USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: vendors vendors_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY vendors_tenant_isolation ON public.vendors USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: webhook_contracts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.webhook_contracts ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_contracts webhook_contracts_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY webhook_contracts_app_context_isolation ON public.webhook_contracts USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: webhook_contracts webhook_contracts_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY webhook_contracts_tenant_isolation ON public.webhook_contracts USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: webhook_deliveries; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_deliveries webhook_deliveries_app_context_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY webhook_deliveries_app_context_isolation ON public.webhook_deliveries USING ((tenant_id = public.app_current_tenant())) WITH CHECK ((tenant_id = public.app_current_tenant()));


--
-- Name: webhook_deliveries webhook_deliveries_tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY webhook_deliveries_tenant_isolation ON public.webhook_deliveries USING (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))) WITH CHECK (((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text)));


--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime OWNER TO postgres;

--
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO dashboard_user;
GRANT USAGE ON SCHEMA auth TO postgres;


--
-- Name: SCHEMA extensions; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA extensions TO anon;
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;
GRANT ALL ON SCHEMA extensions TO dashboard_user;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO app_runtime;


--
-- Name: SCHEMA realtime; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA realtime TO postgres;
GRANT USAGE ON SCHEMA realtime TO anon;
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT USAGE ON SCHEMA realtime TO service_role;
GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;


--
-- Name: SCHEMA storage; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA storage TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON SCHEMA storage TO dashboard_user;


--
-- Name: SCHEMA vault; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA vault TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA vault TO service_role;


--
-- Name: FUNCTION email(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.email() TO dashboard_user;


--
-- Name: FUNCTION jwt(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.jwt() TO postgres;
GRANT ALL ON FUNCTION auth.jwt() TO dashboard_user;


--
-- Name: FUNCTION role(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.role() TO dashboard_user;


--
-- Name: FUNCTION uid(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.uid() TO dashboard_user;


--
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO dashboard_user;


--
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea, text[], text[]) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO dashboard_user;


--
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.crypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.dearmor(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO dashboard_user;


--
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_bytes(integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO dashboard_user;


--
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_uuid() FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text, integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO dashboard_user;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_cron_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO dashboard_user;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.grant_pg_graphql_access() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION grant_pg_net_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_net_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO dashboard_user;


--
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO dashboard_user;


--
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO dashboard_user;


--
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_key_id(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgrst_ddl_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_ddl_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgrst_drop_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_drop_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.set_graphql_placeholder() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1mc() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v4() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_nil() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_dns() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_oid() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_url() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_x500() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO dashboard_user;


--
-- Name: FUNCTION graphql("operationName" text, query text, variables jsonb, extensions jsonb); Type: ACL; Schema: graphql_public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO postgres;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO anon;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO authenticated;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO service_role;


--
-- Name: FUNCTION pg_reload_conf(); Type: ACL; Schema: pg_catalog; Owner: supabase_admin
--

GRANT ALL ON FUNCTION pg_catalog.pg_reload_conf() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION get_auth(p_usename text); Type: ACL; Schema: pgbouncer; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION pgbouncer.get_auth(p_usename text) FROM PUBLIC;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO pgbouncer;


--
-- Name: FUNCTION app_current_principal(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.app_current_principal() TO anon;
GRANT ALL ON FUNCTION public.app_current_principal() TO authenticated;
GRANT ALL ON FUNCTION public.app_current_principal() TO service_role;


--
-- Name: FUNCTION app_current_tenant(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.app_current_tenant() TO anon;
GRANT ALL ON FUNCTION public.app_current_tenant() TO authenticated;
GRANT ALL ON FUNCTION public.app_current_tenant() TO service_role;


--
-- Name: FUNCTION delete_universal_task_on_legacy_delete(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.delete_universal_task_on_legacy_delete() TO anon;
GRANT ALL ON FUNCTION public.delete_universal_task_on_legacy_delete() TO authenticated;
GRANT ALL ON FUNCTION public.delete_universal_task_on_legacy_delete() TO service_role;


--
-- Name: FUNCTION fn_after_control_mappings(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fn_after_control_mappings() TO anon;
GRANT ALL ON FUNCTION public.fn_after_control_mappings() TO authenticated;
GRANT ALL ON FUNCTION public.fn_after_control_mappings() TO service_role;


--
-- Name: FUNCTION fn_backfill_control_mappings(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fn_backfill_control_mappings() TO anon;
GRANT ALL ON FUNCTION public.fn_backfill_control_mappings() TO authenticated;
GRANT ALL ON FUNCTION public.fn_backfill_control_mappings() TO service_role;


--
-- Name: FUNCTION fn_backfill_framework_content_packs(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fn_backfill_framework_content_packs() TO anon;
GRANT ALL ON FUNCTION public.fn_backfill_framework_content_packs() TO authenticated;
GRANT ALL ON FUNCTION public.fn_backfill_framework_content_packs() TO service_role;


--
-- Name: FUNCTION fn_backfill_framework_requirements(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fn_backfill_framework_requirements() TO anon;
GRANT ALL ON FUNCTION public.fn_backfill_framework_requirements() TO authenticated;
GRANT ALL ON FUNCTION public.fn_backfill_framework_requirements() TO service_role;


--
-- Name: FUNCTION fn_block_legacy_writes(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fn_block_legacy_writes() TO anon;
GRANT ALL ON FUNCTION public.fn_block_legacy_writes() TO authenticated;
GRANT ALL ON FUNCTION public.fn_block_legacy_writes() TO service_role;


--
-- Name: FUNCTION fn_guard_legacy_write(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fn_guard_legacy_write() TO anon;
GRANT ALL ON FUNCTION public.fn_guard_legacy_write() TO authenticated;
GRANT ALL ON FUNCTION public.fn_guard_legacy_write() TO service_role;


--
-- Name: FUNCTION handle_universal_task_completion(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_universal_task_completion() TO anon;
GRANT ALL ON FUNCTION public.handle_universal_task_completion() TO authenticated;
GRANT ALL ON FUNCTION public.handle_universal_task_completion() TO service_role;


--
-- Name: FUNCTION prevent_access_review_decision_mutation(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.prevent_access_review_decision_mutation() TO anon;
GRANT ALL ON FUNCTION public.prevent_access_review_decision_mutation() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_access_review_decision_mutation() TO service_role;


--
-- Name: FUNCTION prevent_ai_publication_event_mutation(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.prevent_ai_publication_event_mutation() TO anon;
GRANT ALL ON FUNCTION public.prevent_ai_publication_event_mutation() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_ai_publication_event_mutation() TO service_role;


--
-- Name: FUNCTION prevent_approved_question_version_mutation(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.prevent_approved_question_version_mutation() TO anon;
GRANT ALL ON FUNCTION public.prevent_approved_question_version_mutation() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_approved_question_version_mutation() TO service_role;


--
-- Name: FUNCTION prevent_assessment_history_mutation(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.prevent_assessment_history_mutation() TO anon;
GRANT ALL ON FUNCTION public.prevent_assessment_history_mutation() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_assessment_history_mutation() TO service_role;


--
-- Name: FUNCTION prevent_audit_chain_mutation(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.prevent_audit_chain_mutation() TO anon;
GRANT ALL ON FUNCTION public.prevent_audit_chain_mutation() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_audit_chain_mutation() TO service_role;


--
-- Name: FUNCTION prevent_audit_event_mutation(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.prevent_audit_event_mutation() TO anon;
GRANT ALL ON FUNCTION public.prevent_audit_event_mutation() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_audit_event_mutation() TO service_role;


--
-- Name: FUNCTION prevent_evidence_graph_mutation(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.prevent_evidence_graph_mutation() TO anon;
GRANT ALL ON FUNCTION public.prevent_evidence_graph_mutation() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_evidence_graph_mutation() TO service_role;


--
-- Name: FUNCTION prevent_export_manifest_mutation(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.prevent_export_manifest_mutation() TO anon;
GRANT ALL ON FUNCTION public.prevent_export_manifest_mutation() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_export_manifest_mutation() TO service_role;


--
-- Name: FUNCTION prevent_policy_attestation_mutation(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.prevent_policy_attestation_mutation() TO anon;
GRANT ALL ON FUNCTION public.prevent_policy_attestation_mutation() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_policy_attestation_mutation() TO service_role;


--
-- Name: FUNCTION prevent_privacy_ledger_mutation(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.prevent_privacy_ledger_mutation() TO anon;
GRANT ALL ON FUNCTION public.prevent_privacy_ledger_mutation() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_privacy_ledger_mutation() TO service_role;


--
-- Name: FUNCTION prevent_review_decision_self_review(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.prevent_review_decision_self_review() TO anon;
GRANT ALL ON FUNCTION public.prevent_review_decision_self_review() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_review_decision_self_review() TO service_role;


--
-- Name: FUNCTION prevent_risk_acceptance_review_mutation(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.prevent_risk_acceptance_review_mutation() TO anon;
GRANT ALL ON FUNCTION public.prevent_risk_acceptance_review_mutation() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_risk_acceptance_review_mutation() TO service_role;


--
-- Name: FUNCTION rls_auto_enable(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;


--
-- Name: FUNCTION sync_remediation_task_to_universal(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sync_remediation_task_to_universal() TO anon;
GRANT ALL ON FUNCTION public.sync_remediation_task_to_universal() TO authenticated;
GRANT ALL ON FUNCTION public.sync_remediation_task_to_universal() TO service_role;


--
-- Name: FUNCTION sync_rights_request_task_to_universal(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sync_rights_request_task_to_universal() TO anon;
GRANT ALL ON FUNCTION public.sync_rights_request_task_to_universal() TO authenticated;
GRANT ALL ON FUNCTION public.sync_rights_request_task_to_universal() TO service_role;


--
-- Name: FUNCTION apply_rls(wal jsonb, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO supabase_realtime_admin;


--
-- Name: FUNCTION broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO postgres;
GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO dashboard_user;


--
-- Name: FUNCTION build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO postgres;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO anon;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO service_role;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION "cast"(val text, type_ regtype); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO postgres;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO dashboard_user;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO anon;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO authenticated;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO service_role;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO supabase_realtime_admin;


--
-- Name: FUNCTION check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO postgres;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO anon;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO authenticated;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO service_role;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO supabase_realtime_admin;


--
-- Name: FUNCTION check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) TO anon;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) TO authenticated;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) TO service_role;


--
-- Name: FUNCTION is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO postgres;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO anon;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO service_role;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO dashboard_user;


--
-- Name: FUNCTION quote_wal2json(entity regclass); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO postgres;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO anon;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO authenticated;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO service_role;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO supabase_realtime_admin;


--
-- Name: FUNCTION send(payload jsonb, event text, topic text, private boolean); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO dashboard_user;


--
-- Name: FUNCTION send_binary(payload bytea, event text, topic text, private boolean); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.send_binary(payload bytea, event text, topic text, private boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.send_binary(payload bytea, event text, topic text, private boolean) TO dashboard_user;


--
-- Name: FUNCTION subscription_check_filters(); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO postgres;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO dashboard_user;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO anon;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO authenticated;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO service_role;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO supabase_realtime_admin;


--
-- Name: FUNCTION to_regrole(role_name text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO postgres;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO anon;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO authenticated;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO service_role;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO supabase_realtime_admin;


--
-- Name: FUNCTION topic(); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.topic() TO postgres;
GRANT ALL ON FUNCTION realtime.topic() TO dashboard_user;


--
-- Name: FUNCTION wal2json_escape_identifier(name text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.wal2json_escape_identifier(name text) TO postgres;
GRANT ALL ON FUNCTION realtime.wal2json_escape_identifier(name text) TO dashboard_user;


--
-- Name: FUNCTION _crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO service_role;


--
-- Name: FUNCTION create_secret(new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: FUNCTION update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: TABLE audit_log_entries; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.audit_log_entries TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.audit_log_entries TO postgres;
GRANT SELECT ON TABLE auth.audit_log_entries TO postgres WITH GRANT OPTION;


--
-- Name: TABLE custom_oauth_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.custom_oauth_providers TO postgres;
GRANT ALL ON TABLE auth.custom_oauth_providers TO dashboard_user;


--
-- Name: TABLE flow_state; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.flow_state TO postgres;
GRANT SELECT ON TABLE auth.flow_state TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.flow_state TO dashboard_user;


--
-- Name: TABLE identities; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.identities TO postgres;
GRANT SELECT ON TABLE auth.identities TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.identities TO dashboard_user;


--
-- Name: TABLE instances; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.instances TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.instances TO postgres;
GRANT SELECT ON TABLE auth.instances TO postgres WITH GRANT OPTION;


--
-- Name: TABLE mfa_amr_claims; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_amr_claims TO postgres;
GRANT SELECT ON TABLE auth.mfa_amr_claims TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_amr_claims TO dashboard_user;


--
-- Name: TABLE mfa_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_challenges TO postgres;
GRANT SELECT ON TABLE auth.mfa_challenges TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_challenges TO dashboard_user;


--
-- Name: TABLE mfa_factors; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_factors TO postgres;
GRANT SELECT ON TABLE auth.mfa_factors TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_factors TO dashboard_user;


--
-- Name: TABLE oauth_authorizations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_authorizations TO postgres;
GRANT ALL ON TABLE auth.oauth_authorizations TO dashboard_user;


--
-- Name: TABLE oauth_client_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_client_states TO postgres;
GRANT ALL ON TABLE auth.oauth_client_states TO dashboard_user;


--
-- Name: TABLE oauth_clients; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_clients TO postgres;
GRANT ALL ON TABLE auth.oauth_clients TO dashboard_user;


--
-- Name: TABLE oauth_consents; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_consents TO postgres;
GRANT ALL ON TABLE auth.oauth_consents TO dashboard_user;


--
-- Name: TABLE one_time_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.one_time_tokens TO postgres;
GRANT SELECT ON TABLE auth.one_time_tokens TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.one_time_tokens TO dashboard_user;


--
-- Name: TABLE refresh_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.refresh_tokens TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.refresh_tokens TO postgres;
GRANT SELECT ON TABLE auth.refresh_tokens TO postgres WITH GRANT OPTION;


--
-- Name: SEQUENCE refresh_tokens_id_seq; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO dashboard_user;
GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO postgres;


--
-- Name: TABLE saml_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_providers TO postgres;
GRANT SELECT ON TABLE auth.saml_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_providers TO dashboard_user;


--
-- Name: TABLE saml_relay_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_relay_states TO postgres;
GRANT SELECT ON TABLE auth.saml_relay_states TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_relay_states TO dashboard_user;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT ON TABLE auth.schema_migrations TO postgres WITH GRANT OPTION;


--
-- Name: TABLE sessions; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sessions TO postgres;
GRANT SELECT ON TABLE auth.sessions TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sessions TO dashboard_user;


--
-- Name: TABLE sso_domains; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_domains TO postgres;
GRANT SELECT ON TABLE auth.sso_domains TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_domains TO dashboard_user;


--
-- Name: TABLE sso_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_providers TO postgres;
GRANT SELECT ON TABLE auth.sso_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_providers TO dashboard_user;


--
-- Name: TABLE users; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.users TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.users TO postgres;
GRANT SELECT ON TABLE auth.users TO postgres WITH GRANT OPTION;


--
-- Name: TABLE webauthn_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.webauthn_challenges TO postgres;
GRANT ALL ON TABLE auth.webauthn_challenges TO dashboard_user;


--
-- Name: TABLE webauthn_credentials; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.webauthn_credentials TO postgres;
GRANT ALL ON TABLE auth.webauthn_credentials TO dashboard_user;


--
-- Name: TABLE pg_stat_statements; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements TO dashboard_user;


--
-- Name: TABLE pg_stat_statements_info; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements_info FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO dashboard_user;


--
-- Name: TABLE access_review_decisions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.access_review_decisions TO anon;
GRANT ALL ON TABLE public.access_review_decisions TO authenticated;
GRANT ALL ON TABLE public.access_review_decisions TO service_role;
GRANT SELECT,INSERT ON TABLE public.access_review_decisions TO app_runtime;


--
-- Name: TABLE access_review_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.access_review_items TO anon;
GRANT ALL ON TABLE public.access_review_items TO authenticated;
GRANT ALL ON TABLE public.access_review_items TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.access_review_items TO app_runtime;


--
-- Name: TABLE access_reviews; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.access_reviews TO anon;
GRANT ALL ON TABLE public.access_reviews TO authenticated;
GRANT ALL ON TABLE public.access_reviews TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.access_reviews TO app_runtime;


--
-- Name: TABLE ai_evaluation_runs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_evaluation_runs TO anon;
GRANT ALL ON TABLE public.ai_evaluation_runs TO authenticated;
GRANT ALL ON TABLE public.ai_evaluation_runs TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_evaluation_runs TO app_runtime;


--
-- Name: TABLE ai_generation_runs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_generation_runs TO anon;
GRANT ALL ON TABLE public.ai_generation_runs TO authenticated;
GRANT ALL ON TABLE public.ai_generation_runs TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_generation_runs TO app_runtime;


--
-- Name: TABLE ai_model_deployments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_model_deployments TO anon;
GRANT ALL ON TABLE public.ai_model_deployments TO authenticated;
GRANT ALL ON TABLE public.ai_model_deployments TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_model_deployments TO app_runtime;


--
-- Name: TABLE ai_output_reviews; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_output_reviews TO anon;
GRANT ALL ON TABLE public.ai_output_reviews TO authenticated;
GRANT ALL ON TABLE public.ai_output_reviews TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_output_reviews TO app_runtime;


--
-- Name: TABLE ai_prompt_versions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_prompt_versions TO anon;
GRANT ALL ON TABLE public.ai_prompt_versions TO authenticated;
GRANT ALL ON TABLE public.ai_prompt_versions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_prompt_versions TO app_runtime;


--
-- Name: TABLE ai_publication_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_publication_events TO anon;
GRANT ALL ON TABLE public.ai_publication_events TO authenticated;
GRANT ALL ON TABLE public.ai_publication_events TO service_role;
GRANT SELECT,INSERT ON TABLE public.ai_publication_events TO app_runtime;


--
-- Name: TABLE ai_question_versions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_question_versions TO anon;
GRANT ALL ON TABLE public.ai_question_versions TO authenticated;
GRANT ALL ON TABLE public.ai_question_versions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_question_versions TO app_runtime;


--
-- Name: TABLE ai_retrieval_indexes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_retrieval_indexes TO anon;
GRANT ALL ON TABLE public.ai_retrieval_indexes TO authenticated;
GRANT ALL ON TABLE public.ai_retrieval_indexes TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ai_retrieval_indexes TO app_runtime;


--
-- Name: TABLE answer_revisions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.answer_revisions TO anon;
GRANT ALL ON TABLE public.answer_revisions TO authenticated;
GRANT ALL ON TABLE public.answer_revisions TO service_role;
GRANT SELECT,INSERT ON TABLE public.answer_revisions TO app_runtime;


--
-- Name: TABLE applicability_decisions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.applicability_decisions TO anon;
GRANT ALL ON TABLE public.applicability_decisions TO authenticated;
GRANT ALL ON TABLE public.applicability_decisions TO service_role;
GRANT SELECT,INSERT ON TABLE public.applicability_decisions TO app_runtime;


--
-- Name: TABLE assessment_frameworks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.assessment_frameworks TO anon;
GRANT ALL ON TABLE public.assessment_frameworks TO authenticated;
GRANT ALL ON TABLE public.assessment_frameworks TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.assessment_frameworks TO app_runtime;


--
-- Name: TABLE assessment_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.assessment_items TO anon;
GRANT ALL ON TABLE public.assessment_items TO authenticated;
GRANT ALL ON TABLE public.assessment_items TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.assessment_items TO app_runtime;


--
-- Name: TABLE assessment_scopes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.assessment_scopes TO anon;
GRANT ALL ON TABLE public.assessment_scopes TO authenticated;
GRANT ALL ON TABLE public.assessment_scopes TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.assessment_scopes TO app_runtime;


--
-- Name: TABLE assessment_signoffs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.assessment_signoffs TO anon;
GRANT ALL ON TABLE public.assessment_signoffs TO authenticated;
GRANT ALL ON TABLE public.assessment_signoffs TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.assessment_signoffs TO app_runtime;


--
-- Name: TABLE assessment_snapshots; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.assessment_snapshots TO anon;
GRANT ALL ON TABLE public.assessment_snapshots TO authenticated;
GRANT ALL ON TABLE public.assessment_snapshots TO service_role;
GRANT SELECT,INSERT ON TABLE public.assessment_snapshots TO app_runtime;


--
-- Name: TABLE assessments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.assessments TO anon;
GRANT ALL ON TABLE public.assessments TO authenticated;
GRANT ALL ON TABLE public.assessments TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.assessments TO app_runtime;


--
-- Name: TABLE assurance_alerts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.assurance_alerts TO anon;
GRANT ALL ON TABLE public.assurance_alerts TO authenticated;
GRANT ALL ON TABLE public.assurance_alerts TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.assurance_alerts TO app_runtime;


--
-- Name: TABLE audit_checkpoints; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_checkpoints TO anon;
GRANT ALL ON TABLE public.audit_checkpoints TO authenticated;
GRANT ALL ON TABLE public.audit_checkpoints TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_checkpoints TO app_runtime;


--
-- Name: TABLE audit_engagements; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_engagements TO anon;
GRANT ALL ON TABLE public.audit_engagements TO authenticated;
GRANT ALL ON TABLE public.audit_engagements TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_engagements TO app_runtime;


--
-- Name: TABLE audit_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_events TO anon;
GRANT ALL ON TABLE public.audit_events TO authenticated;
GRANT ALL ON TABLE public.audit_events TO service_role;
GRANT SELECT,INSERT ON TABLE public.audit_events TO app_runtime;


--
-- Name: TABLE audit_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_requests TO anon;
GRANT ALL ON TABLE public.audit_requests TO authenticated;
GRANT ALL ON TABLE public.audit_requests TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_requests TO app_runtime;


--
-- Name: TABLE audit_tests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_tests TO anon;
GRANT ALL ON TABLE public.audit_tests TO authenticated;
GRANT ALL ON TABLE public.audit_tests TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_tests TO app_runtime;


--
-- Name: TABLE audit_verifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_verifications TO anon;
GRANT ALL ON TABLE public.audit_verifications TO authenticated;
GRANT ALL ON TABLE public.audit_verifications TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_verifications TO app_runtime;


--
-- Name: TABLE authorization_decision_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.authorization_decision_logs TO anon;
GRANT ALL ON TABLE public.authorization_decision_logs TO authenticated;
GRANT ALL ON TABLE public.authorization_decision_logs TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.authorization_decision_logs TO app_runtime;


--
-- Name: TABLE automated_control_tests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.automated_control_tests TO anon;
GRANT ALL ON TABLE public.automated_control_tests TO authenticated;
GRANT ALL ON TABLE public.automated_control_tests TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.automated_control_tests TO app_runtime;


--
-- Name: TABLE automated_test_runs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.automated_test_runs TO anon;
GRANT ALL ON TABLE public.automated_test_runs TO authenticated;
GRANT ALL ON TABLE public.automated_test_runs TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.automated_test_runs TO app_runtime;


--
-- Name: TABLE automated_tests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.automated_tests TO anon;
GRANT ALL ON TABLE public.automated_tests TO authenticated;
GRANT ALL ON TABLE public.automated_tests TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.automated_tests TO app_runtime;


--
-- Name: TABLE backup_restore_tests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.backup_restore_tests TO anon;
GRANT ALL ON TABLE public.backup_restore_tests TO authenticated;
GRANT ALL ON TABLE public.backup_restore_tests TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.backup_restore_tests TO app_runtime;


--
-- Name: TABLE connector_objects; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.connector_objects TO anon;
GRANT ALL ON TABLE public.connector_objects TO authenticated;
GRANT ALL ON TABLE public.connector_objects TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.connector_objects TO app_runtime;


--
-- Name: TABLE connector_sync_runs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.connector_sync_runs TO anon;
GRANT ALL ON TABLE public.connector_sync_runs TO authenticated;
GRANT ALL ON TABLE public.connector_sync_runs TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.connector_sync_runs TO app_runtime;


--
-- Name: TABLE connectors; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.connectors TO anon;
GRANT ALL ON TABLE public.connectors TO authenticated;
GRANT ALL ON TABLE public.connectors TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.connectors TO app_runtime;


--
-- Name: TABLE consent_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.consent_events TO anon;
GRANT ALL ON TABLE public.consent_events TO authenticated;
GRANT ALL ON TABLE public.consent_events TO service_role;
GRANT SELECT,INSERT ON TABLE public.consent_events TO app_runtime;


--
-- Name: TABLE consent_purposes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.consent_purposes TO anon;
GRANT ALL ON TABLE public.consent_purposes TO authenticated;
GRANT ALL ON TABLE public.consent_purposes TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.consent_purposes TO app_runtime;


--
-- Name: TABLE consent_records; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.consent_records TO anon;
GRANT ALL ON TABLE public.consent_records TO authenticated;
GRANT ALL ON TABLE public.consent_records TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.consent_records TO app_runtime;


--
-- Name: TABLE content_rejected_records; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.content_rejected_records TO anon;
GRANT ALL ON TABLE public.content_rejected_records TO authenticated;
GRANT ALL ON TABLE public.content_rejected_records TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.content_rejected_records TO app_runtime;


--
-- Name: TABLE content_source_packages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.content_source_packages TO anon;
GRANT ALL ON TABLE public.content_source_packages TO authenticated;
GRANT ALL ON TABLE public.content_source_packages TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.content_source_packages TO app_runtime;


--
-- Name: TABLE control_instances; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.control_instances TO anon;
GRANT ALL ON TABLE public.control_instances TO authenticated;
GRANT ALL ON TABLE public.control_instances TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.control_instances TO app_runtime;


--
-- Name: TABLE control_mappings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.control_mappings TO anon;
GRANT ALL ON TABLE public.control_mappings TO authenticated;
GRANT ALL ON TABLE public.control_mappings TO service_role;
GRANT SELECT,DELETE ON TABLE public.control_mappings TO app_runtime;


--
-- Name: TABLE control_sets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.control_sets TO anon;
GRANT ALL ON TABLE public.control_sets TO authenticated;
GRANT ALL ON TABLE public.control_sets TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.control_sets TO app_runtime;


--
-- Name: TABLE control_subcontrols; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.control_subcontrols TO anon;
GRANT ALL ON TABLE public.control_subcontrols TO authenticated;
GRANT ALL ON TABLE public.control_subcontrols TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.control_subcontrols TO app_runtime;


--
-- Name: TABLE control_test_results; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.control_test_results TO anon;
GRANT ALL ON TABLE public.control_test_results TO authenticated;
GRANT ALL ON TABLE public.control_test_results TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.control_test_results TO app_runtime;


--
-- Name: TABLE controls; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.controls TO anon;
GRANT ALL ON TABLE public.controls TO authenticated;
GRANT ALL ON TABLE public.controls TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.controls TO app_runtime;


--
-- Name: TABLE custom_field_definitions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.custom_field_definitions TO anon;
GRANT ALL ON TABLE public.custom_field_definitions TO authenticated;
GRANT ALL ON TABLE public.custom_field_definitions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.custom_field_definitions TO app_runtime;


--
-- Name: TABLE custom_object_definitions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.custom_object_definitions TO anon;
GRANT ALL ON TABLE public.custom_object_definitions TO authenticated;
GRANT ALL ON TABLE public.custom_object_definitions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.custom_object_definitions TO app_runtime;


--
-- Name: TABLE custom_records; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.custom_records TO anon;
GRANT ALL ON TABLE public.custom_records TO authenticated;
GRANT ALL ON TABLE public.custom_records TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.custom_records TO app_runtime;


--
-- Name: TABLE custom_values; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.custom_values TO anon;
GRANT ALL ON TABLE public.custom_values TO authenticated;
GRANT ALL ON TABLE public.custom_values TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.custom_values TO app_runtime;


--
-- Name: TABLE data_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.data_categories TO anon;
GRANT ALL ON TABLE public.data_categories TO authenticated;
GRANT ALL ON TABLE public.data_categories TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.data_categories TO app_runtime;


--
-- Name: TABLE data_discovery_findings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.data_discovery_findings TO anon;
GRANT ALL ON TABLE public.data_discovery_findings TO authenticated;
GRANT ALL ON TABLE public.data_discovery_findings TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.data_discovery_findings TO app_runtime;


--
-- Name: TABLE data_discovery_scans; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.data_discovery_scans TO anon;
GRANT ALL ON TABLE public.data_discovery_scans TO authenticated;
GRANT ALL ON TABLE public.data_discovery_scans TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.data_discovery_scans TO app_runtime;


--
-- Name: TABLE data_inventory_records; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.data_inventory_records TO anon;
GRANT ALL ON TABLE public.data_inventory_records TO authenticated;
GRANT ALL ON TABLE public.data_inventory_records TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.data_inventory_records TO app_runtime;


--
-- Name: TABLE data_subject_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.data_subject_categories TO anon;
GRANT ALL ON TABLE public.data_subject_categories TO authenticated;
GRANT ALL ON TABLE public.data_subject_categories TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.data_subject_categories TO app_runtime;


--
-- Name: TABLE deletion_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.deletion_items TO anon;
GRANT ALL ON TABLE public.deletion_items TO authenticated;
GRANT ALL ON TABLE public.deletion_items TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.deletion_items TO app_runtime;


--
-- Name: TABLE deletion_jobs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.deletion_jobs TO anon;
GRANT ALL ON TABLE public.deletion_jobs TO authenticated;
GRANT ALL ON TABLE public.deletion_jobs TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.deletion_jobs TO app_runtime;


--
-- Name: TABLE dpia_assessments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.dpia_assessments TO anon;
GRANT ALL ON TABLE public.dpia_assessments TO authenticated;
GRANT ALL ON TABLE public.dpia_assessments TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.dpia_assessments TO app_runtime;


--
-- Name: TABLE dpia_risks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.dpia_risks TO anon;
GRANT ALL ON TABLE public.dpia_risks TO authenticated;
GRANT ALL ON TABLE public.dpia_risks TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.dpia_risks TO app_runtime;


--
-- Name: TABLE dpias; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.dpias TO anon;
GRANT ALL ON TABLE public.dpias TO authenticated;
GRANT ALL ON TABLE public.dpias TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.dpias TO app_runtime;


--
-- Name: TABLE encryption_key_records; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.encryption_key_records TO anon;
GRANT ALL ON TABLE public.encryption_key_records TO authenticated;
GRANT ALL ON TABLE public.encryption_key_records TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.encryption_key_records TO app_runtime;


--
-- Name: TABLE evaluation_cases; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.evaluation_cases TO anon;
GRANT ALL ON TABLE public.evaluation_cases TO authenticated;
GRANT ALL ON TABLE public.evaluation_cases TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.evaluation_cases TO app_runtime;


--
-- Name: TABLE evaluation_results; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.evaluation_results TO anon;
GRANT ALL ON TABLE public.evaluation_results TO authenticated;
GRANT ALL ON TABLE public.evaluation_results TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.evaluation_results TO app_runtime;


--
-- Name: TABLE evaluation_suites; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.evaluation_suites TO anon;
GRANT ALL ON TABLE public.evaluation_suites TO authenticated;
GRANT ALL ON TABLE public.evaluation_suites TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.evaluation_suites TO app_runtime;


--
-- Name: TABLE evidence_custody_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.evidence_custody_events TO anon;
GRANT ALL ON TABLE public.evidence_custody_events TO authenticated;
GRANT ALL ON TABLE public.evidence_custody_events TO service_role;
GRANT SELECT,INSERT ON TABLE public.evidence_custody_events TO app_runtime;


--
-- Name: TABLE evidence_expiry_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.evidence_expiry_events TO anon;
GRANT ALL ON TABLE public.evidence_expiry_events TO authenticated;
GRANT ALL ON TABLE public.evidence_expiry_events TO service_role;
GRANT SELECT,INSERT ON TABLE public.evidence_expiry_events TO app_runtime;


--
-- Name: TABLE evidence_links; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.evidence_links TO anon;
GRANT ALL ON TABLE public.evidence_links TO authenticated;
GRANT ALL ON TABLE public.evidence_links TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.evidence_links TO app_runtime;


--
-- Name: TABLE evidence_objects; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.evidence_objects TO anon;
GRANT ALL ON TABLE public.evidence_objects TO authenticated;
GRANT ALL ON TABLE public.evidence_objects TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.evidence_objects TO app_runtime;


--
-- Name: TABLE evidence_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.evidence_requests TO anon;
GRANT ALL ON TABLE public.evidence_requests TO authenticated;
GRANT ALL ON TABLE public.evidence_requests TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.evidence_requests TO app_runtime;


--
-- Name: TABLE evidence_reviews; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.evidence_reviews TO anon;
GRANT ALL ON TABLE public.evidence_reviews TO authenticated;
GRANT ALL ON TABLE public.evidence_reviews TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.evidence_reviews TO app_runtime;


--
-- Name: TABLE evidence_samples; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.evidence_samples TO anon;
GRANT ALL ON TABLE public.evidence_samples TO authenticated;
GRANT ALL ON TABLE public.evidence_samples TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.evidence_samples TO app_runtime;


--
-- Name: TABLE evidence_versions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.evidence_versions TO anon;
GRANT ALL ON TABLE public.evidence_versions TO authenticated;
GRANT ALL ON TABLE public.evidence_versions TO service_role;
GRANT SELECT,INSERT ON TABLE public.evidence_versions TO app_runtime;


--
-- Name: TABLE export_manifests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.export_manifests TO anon;
GRANT ALL ON TABLE public.export_manifests TO authenticated;
GRANT ALL ON TABLE public.export_manifests TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.export_manifests TO app_runtime;


--
-- Name: TABLE findings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.findings TO anon;
GRANT ALL ON TABLE public.findings TO authenticated;
GRANT ALL ON TABLE public.findings TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.findings TO app_runtime;


--
-- Name: TABLE framework_content_packs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.framework_content_packs TO anon;
GRANT ALL ON TABLE public.framework_content_packs TO authenticated;
GRANT ALL ON TABLE public.framework_content_packs TO service_role;
GRANT SELECT,DELETE ON TABLE public.framework_content_packs TO app_runtime;


--
-- Name: TABLE framework_diff_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.framework_diff_items TO anon;
GRANT ALL ON TABLE public.framework_diff_items TO authenticated;
GRANT ALL ON TABLE public.framework_diff_items TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.framework_diff_items TO app_runtime;


--
-- Name: TABLE framework_diffs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.framework_diffs TO anon;
GRANT ALL ON TABLE public.framework_diffs TO authenticated;
GRANT ALL ON TABLE public.framework_diffs TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.framework_diffs TO app_runtime;


--
-- Name: TABLE framework_requirements; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.framework_requirements TO anon;
GRANT ALL ON TABLE public.framework_requirements TO authenticated;
GRANT ALL ON TABLE public.framework_requirements TO service_role;
GRANT SELECT,DELETE ON TABLE public.framework_requirements TO app_runtime;


--
-- Name: TABLE framework_update_impacts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.framework_update_impacts TO anon;
GRANT ALL ON TABLE public.framework_update_impacts TO authenticated;
GRANT ALL ON TABLE public.framework_update_impacts TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.framework_update_impacts TO app_runtime;


--
-- Name: TABLE framework_versions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.framework_versions TO anon;
GRANT ALL ON TABLE public.framework_versions TO authenticated;
GRANT ALL ON TABLE public.framework_versions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.framework_versions TO app_runtime;


--
-- Name: TABLE frameworks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.frameworks TO anon;
GRANT ALL ON TABLE public.frameworks TO authenticated;
GRANT ALL ON TABLE public.frameworks TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.frameworks TO app_runtime;


--
-- Name: TABLE generation_citations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.generation_citations TO anon;
GRANT ALL ON TABLE public.generation_citations TO authenticated;
GRANT ALL ON TABLE public.generation_citations TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.generation_citations TO app_runtime;


--
-- Name: TABLE grc_workspaces; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.grc_workspaces TO anon;
GRANT ALL ON TABLE public.grc_workspaces TO authenticated;
GRANT ALL ON TABLE public.grc_workspaces TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.grc_workspaces TO app_runtime;


--
-- Name: TABLE harmonized_controls; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.harmonized_controls TO anon;
GRANT ALL ON TABLE public.harmonized_controls TO authenticated;
GRANT ALL ON TABLE public.harmonized_controls TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.harmonized_controls TO app_runtime;


--
-- Name: TABLE identity_role_grants; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.identity_role_grants TO anon;
GRANT ALL ON TABLE public.identity_role_grants TO authenticated;
GRANT ALL ON TABLE public.identity_role_grants TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.identity_role_grants TO app_runtime;


--
-- Name: TABLE identity_roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.identity_roles TO anon;
GRANT ALL ON TABLE public.identity_roles TO authenticated;
GRANT ALL ON TABLE public.identity_roles TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.identity_roles TO app_runtime;


--
-- Name: TABLE identity_service_accounts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.identity_service_accounts TO anon;
GRANT ALL ON TABLE public.identity_service_accounts TO authenticated;
GRANT ALL ON TABLE public.identity_service_accounts TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.identity_service_accounts TO app_runtime;


--
-- Name: TABLE identity_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.identity_sessions TO anon;
GRANT ALL ON TABLE public.identity_sessions TO authenticated;
GRANT ALL ON TABLE public.identity_sessions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.identity_sessions TO app_runtime;


--
-- Name: TABLE identity_tenants; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.identity_tenants TO anon;
GRANT ALL ON TABLE public.identity_tenants TO authenticated;
GRANT ALL ON TABLE public.identity_tenants TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.identity_tenants TO app_runtime;


--
-- Name: TABLE identity_users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.identity_users TO anon;
GRANT ALL ON TABLE public.identity_users TO authenticated;
GRANT ALL ON TABLE public.identity_users TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.identity_users TO app_runtime;


--
-- Name: TABLE identity_workspace_delegations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.identity_workspace_delegations TO anon;
GRANT ALL ON TABLE public.identity_workspace_delegations TO authenticated;
GRANT ALL ON TABLE public.identity_workspace_delegations TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.identity_workspace_delegations TO app_runtime;


--
-- Name: TABLE incident_assessments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.incident_assessments TO anon;
GRANT ALL ON TABLE public.incident_assessments TO authenticated;
GRANT ALL ON TABLE public.incident_assessments TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.incident_assessments TO app_runtime;


--
-- Name: TABLE incident_notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.incident_notifications TO anon;
GRANT ALL ON TABLE public.incident_notifications TO authenticated;
GRANT ALL ON TABLE public.incident_notifications TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.incident_notifications TO app_runtime;


--
-- Name: TABLE knowledge_chunks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.knowledge_chunks TO anon;
GRANT ALL ON TABLE public.knowledge_chunks TO authenticated;
GRANT ALL ON TABLE public.knowledge_chunks TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.knowledge_chunks TO app_runtime;


--
-- Name: TABLE lawful_bases; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lawful_bases TO anon;
GRANT ALL ON TABLE public.lawful_bases TO authenticated;
GRANT ALL ON TABLE public.lawful_bases TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.lawful_bases TO app_runtime;


--
-- Name: TABLE legal_hold_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.legal_hold_items TO anon;
GRANT ALL ON TABLE public.legal_hold_items TO authenticated;
GRANT ALL ON TABLE public.legal_hold_items TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.legal_hold_items TO app_runtime;


--
-- Name: TABLE legal_holds; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.legal_holds TO anon;
GRANT ALL ON TABLE public.legal_holds TO authenticated;
GRANT ALL ON TABLE public.legal_holds TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.legal_holds TO app_runtime;


--
-- Name: TABLE malware_scan_results; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.malware_scan_results TO anon;
GRANT ALL ON TABLE public.malware_scan_results TO authenticated;
GRANT ALL ON TABLE public.malware_scan_results TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.malware_scan_results TO app_runtime;


--
-- Name: TABLE mapping_conflicts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mapping_conflicts TO anon;
GRANT ALL ON TABLE public.mapping_conflicts TO authenticated;
GRANT ALL ON TABLE public.mapping_conflicts TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.mapping_conflicts TO app_runtime;


--
-- Name: TABLE mapping_reviews; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mapping_reviews TO anon;
GRANT ALL ON TABLE public.mapping_reviews TO authenticated;
GRANT ALL ON TABLE public.mapping_reviews TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.mapping_reviews TO app_runtime;


--
-- Name: TABLE mapping_versions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mapping_versions TO anon;
GRANT ALL ON TABLE public.mapping_versions TO authenticated;
GRANT ALL ON TABLE public.mapping_versions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.mapping_versions TO app_runtime;


--
-- Name: TABLE outbox_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.outbox_events TO anon;
GRANT ALL ON TABLE public.outbox_events TO authenticated;
GRANT ALL ON TABLE public.outbox_events TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.outbox_events TO app_runtime;


--
-- Name: TABLE policies; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.policies TO anon;
GRANT ALL ON TABLE public.policies TO authenticated;
GRANT ALL ON TABLE public.policies TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.policies TO app_runtime;


--
-- Name: TABLE policy_attestations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.policy_attestations TO anon;
GRANT ALL ON TABLE public.policy_attestations TO authenticated;
GRANT ALL ON TABLE public.policy_attestations TO service_role;
GRANT SELECT,INSERT ON TABLE public.policy_attestations TO app_runtime;


--
-- Name: TABLE policy_control_links; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.policy_control_links TO anon;
GRANT ALL ON TABLE public.policy_control_links TO authenticated;
GRANT ALL ON TABLE public.policy_control_links TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.policy_control_links TO app_runtime;


--
-- Name: TABLE policy_versions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.policy_versions TO anon;
GRANT ALL ON TABLE public.policy_versions TO authenticated;
GRANT ALL ON TABLE public.policy_versions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.policy_versions TO app_runtime;


--
-- Name: TABLE privacy_incidents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.privacy_incidents TO anon;
GRANT ALL ON TABLE public.privacy_incidents TO authenticated;
GRANT ALL ON TABLE public.privacy_incidents TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.privacy_incidents TO app_runtime;


--
-- Name: TABLE privacy_notice_versions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.privacy_notice_versions TO anon;
GRANT ALL ON TABLE public.privacy_notice_versions TO authenticated;
GRANT ALL ON TABLE public.privacy_notice_versions TO service_role;
GRANT SELECT,INSERT ON TABLE public.privacy_notice_versions TO app_runtime;


--
-- Name: TABLE privacy_notices; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.privacy_notices TO anon;
GRANT ALL ON TABLE public.privacy_notices TO authenticated;
GRANT ALL ON TABLE public.privacy_notices TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.privacy_notices TO app_runtime;


--
-- Name: TABLE privacy_rights_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.privacy_rights_requests TO anon;
GRANT ALL ON TABLE public.privacy_rights_requests TO authenticated;
GRANT ALL ON TABLE public.privacy_rights_requests TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.privacy_rights_requests TO app_runtime;


--
-- Name: TABLE processing_activities; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.processing_activities TO anon;
GRANT ALL ON TABLE public.processing_activities TO authenticated;
GRANT ALL ON TABLE public.processing_activities TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.processing_activities TO app_runtime;


--
-- Name: TABLE processing_inventory_links; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.processing_inventory_links TO anon;
GRANT ALL ON TABLE public.processing_inventory_links TO authenticated;
GRANT ALL ON TABLE public.processing_inventory_links TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.processing_inventory_links TO app_runtime;


--
-- Name: TABLE processing_purposes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.processing_purposes TO anon;
GRANT ALL ON TABLE public.processing_purposes TO authenticated;
GRANT ALL ON TABLE public.processing_purposes TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.processing_purposes TO app_runtime;


--
-- Name: TABLE processing_recipients; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.processing_recipients TO anon;
GRANT ALL ON TABLE public.processing_recipients TO authenticated;
GRANT ALL ON TABLE public.processing_recipients TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.processing_recipients TO app_runtime;


--
-- Name: TABLE product_assurance_evidence; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.product_assurance_evidence TO anon;
GRANT ALL ON TABLE public.product_assurance_evidence TO authenticated;
GRANT ALL ON TABLE public.product_assurance_evidence TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.product_assurance_evidence TO app_runtime;


--
-- Name: TABLE purposes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.purposes TO anon;
GRANT ALL ON TABLE public.purposes TO authenticated;
GRANT ALL ON TABLE public.purposes TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.purposes TO app_runtime;


--
-- Name: TABLE question_sets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.question_sets TO anon;
GRANT ALL ON TABLE public.question_sets TO authenticated;
GRANT ALL ON TABLE public.question_sets TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.question_sets TO app_runtime;


--
-- Name: TABLE question_versions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.question_versions TO anon;
GRANT ALL ON TABLE public.question_versions TO authenticated;
GRANT ALL ON TABLE public.question_versions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.question_versions TO app_runtime;


--
-- Name: TABLE rate_limit_policies; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rate_limit_policies TO anon;
GRANT ALL ON TABLE public.rate_limit_policies TO authenticated;
GRANT ALL ON TABLE public.rate_limit_policies TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.rate_limit_policies TO app_runtime;


--
-- Name: TABLE recipients; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.recipients TO anon;
GRANT ALL ON TABLE public.recipients TO authenticated;
GRANT ALL ON TABLE public.recipients TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.recipients TO app_runtime;


--
-- Name: TABLE remediation_tasks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.remediation_tasks TO anon;
GRANT ALL ON TABLE public.remediation_tasks TO authenticated;
GRANT ALL ON TABLE public.remediation_tasks TO service_role;
GRANT SELECT,DELETE ON TABLE public.remediation_tasks TO app_runtime;


--
-- Name: TABLE report_exports; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.report_exports TO anon;
GRANT ALL ON TABLE public.report_exports TO authenticated;
GRANT ALL ON TABLE public.report_exports TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.report_exports TO app_runtime;


--
-- Name: TABLE report_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.report_templates TO anon;
GRANT ALL ON TABLE public.report_templates TO authenticated;
GRANT ALL ON TABLE public.report_templates TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.report_templates TO app_runtime;


--
-- Name: TABLE requirement_instances; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.requirement_instances TO anon;
GRANT ALL ON TABLE public.requirement_instances TO authenticated;
GRANT ALL ON TABLE public.requirement_instances TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.requirement_instances TO app_runtime;


--
-- Name: TABLE retention_assignments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.retention_assignments TO anon;
GRANT ALL ON TABLE public.retention_assignments TO authenticated;
GRANT ALL ON TABLE public.retention_assignments TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.retention_assignments TO app_runtime;


--
-- Name: TABLE retention_rules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.retention_rules TO anon;
GRANT ALL ON TABLE public.retention_rules TO authenticated;
GRANT ALL ON TABLE public.retention_rules TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.retention_rules TO app_runtime;


--
-- Name: TABLE retention_schedules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.retention_schedules TO anon;
GRANT ALL ON TABLE public.retention_schedules TO authenticated;
GRANT ALL ON TABLE public.retention_schedules TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.retention_schedules TO app_runtime;


--
-- Name: TABLE retrieval_runs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.retrieval_runs TO anon;
GRANT ALL ON TABLE public.retrieval_runs TO authenticated;
GRANT ALL ON TABLE public.retrieval_runs TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.retrieval_runs TO app_runtime;


--
-- Name: TABLE retrieved_chunks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.retrieved_chunks TO anon;
GRANT ALL ON TABLE public.retrieved_chunks TO authenticated;
GRANT ALL ON TABLE public.retrieved_chunks TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.retrieved_chunks TO app_runtime;


--
-- Name: TABLE review_decisions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.review_decisions TO anon;
GRANT ALL ON TABLE public.review_decisions TO authenticated;
GRANT ALL ON TABLE public.review_decisions TO service_role;
GRANT SELECT,INSERT ON TABLE public.review_decisions TO app_runtime;


--
-- Name: TABLE rights_request_tasks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rights_request_tasks TO anon;
GRANT ALL ON TABLE public.rights_request_tasks TO authenticated;
GRANT ALL ON TABLE public.rights_request_tasks TO service_role;
GRANT SELECT,DELETE ON TABLE public.rights_request_tasks TO app_runtime;


--
-- Name: TABLE risk_acceptance_reviews; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.risk_acceptance_reviews TO anon;
GRANT ALL ON TABLE public.risk_acceptance_reviews TO authenticated;
GRANT ALL ON TABLE public.risk_acceptance_reviews TO service_role;
GRANT SELECT,INSERT ON TABLE public.risk_acceptance_reviews TO app_runtime;


--
-- Name: TABLE risk_acceptances; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.risk_acceptances TO anon;
GRANT ALL ON TABLE public.risk_acceptances TO authenticated;
GRANT ALL ON TABLE public.risk_acceptances TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.risk_acceptances TO app_runtime;


--
-- Name: TABLE risk_links; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.risk_links TO anon;
GRANT ALL ON TABLE public.risk_links TO authenticated;
GRANT ALL ON TABLE public.risk_links TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.risk_links TO app_runtime;


--
-- Name: TABLE risk_models; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.risk_models TO anon;
GRANT ALL ON TABLE public.risk_models TO authenticated;
GRANT ALL ON TABLE public.risk_models TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.risk_models TO app_runtime;


--
-- Name: TABLE risk_treatments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.risk_treatments TO anon;
GRANT ALL ON TABLE public.risk_treatments TO authenticated;
GRANT ALL ON TABLE public.risk_treatments TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.risk_treatments TO app_runtime;


--
-- Name: TABLE risks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.risks TO anon;
GRANT ALL ON TABLE public.risks TO authenticated;
GRANT ALL ON TABLE public.risks TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.risks TO app_runtime;


--
-- Name: TABLE safety_checks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.safety_checks TO anon;
GRANT ALL ON TABLE public.safety_checks TO authenticated;
GRANT ALL ON TABLE public.safety_checks TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.safety_checks TO app_runtime;


--
-- Name: TABLE sdlc_release_gates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sdlc_release_gates TO anon;
GRANT ALL ON TABLE public.sdlc_release_gates TO authenticated;
GRANT ALL ON TABLE public.sdlc_release_gates TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sdlc_release_gates TO app_runtime;


--
-- Name: TABLE siem_export_records; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.siem_export_records TO anon;
GRANT ALL ON TABLE public.siem_export_records TO authenticated;
GRANT ALL ON TABLE public.siem_export_records TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.siem_export_records TO app_runtime;


--
-- Name: TABLE systems_assets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.systems_assets TO anon;
GRANT ALL ON TABLE public.systems_assets TO authenticated;
GRANT ALL ON TABLE public.systems_assets TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.systems_assets TO app_runtime;


--
-- Name: TABLE tenant_catalog_subscriptions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tenant_catalog_subscriptions TO anon;
GRANT ALL ON TABLE public.tenant_catalog_subscriptions TO authenticated;
GRANT ALL ON TABLE public.tenant_catalog_subscriptions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.tenant_catalog_subscriptions TO app_runtime;


--
-- Name: TABLE test_procedures; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.test_procedures TO anon;
GRANT ALL ON TABLE public.test_procedures TO authenticated;
GRANT ALL ON TABLE public.test_procedures TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.test_procedures TO app_runtime;


--
-- Name: TABLE transfers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.transfers TO anon;
GRANT ALL ON TABLE public.transfers TO authenticated;
GRANT ALL ON TABLE public.transfers TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.transfers TO app_runtime;


--
-- Name: TABLE trust_center_artifacts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.trust_center_artifacts TO anon;
GRANT ALL ON TABLE public.trust_center_artifacts TO authenticated;
GRANT ALL ON TABLE public.trust_center_artifacts TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.trust_center_artifacts TO app_runtime;


--
-- Name: TABLE universal_tasks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.universal_tasks TO anon;
GRANT ALL ON TABLE public.universal_tasks TO authenticated;
GRANT ALL ON TABLE public.universal_tasks TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.universal_tasks TO app_runtime;


--
-- Name: TABLE upload_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.upload_sessions TO anon;
GRANT ALL ON TABLE public.upload_sessions TO authenticated;
GRANT ALL ON TABLE public.upload_sessions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.upload_sessions TO app_runtime;


--
-- Name: TABLE vendor_assessments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.vendor_assessments TO anon;
GRANT ALL ON TABLE public.vendor_assessments TO authenticated;
GRANT ALL ON TABLE public.vendor_assessments TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.vendor_assessments TO app_runtime;


--
-- Name: TABLE vendor_findings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.vendor_findings TO anon;
GRANT ALL ON TABLE public.vendor_findings TO authenticated;
GRANT ALL ON TABLE public.vendor_findings TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.vendor_findings TO app_runtime;


--
-- Name: TABLE vendors; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.vendors TO anon;
GRANT ALL ON TABLE public.vendors TO authenticated;
GRANT ALL ON TABLE public.vendors TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.vendors TO app_runtime;


--
-- Name: TABLE webhook_contracts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.webhook_contracts TO anon;
GRANT ALL ON TABLE public.webhook_contracts TO authenticated;
GRANT ALL ON TABLE public.webhook_contracts TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.webhook_contracts TO app_runtime;


--
-- Name: TABLE webhook_deliveries; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.webhook_deliveries TO anon;
GRANT ALL ON TABLE public.webhook_deliveries TO authenticated;
GRANT ALL ON TABLE public.webhook_deliveries TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.webhook_deliveries TO app_runtime;


--
-- Name: TABLE messages; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.messages TO postgres;
GRANT ALL ON TABLE realtime.messages TO dashboard_user;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO service_role;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.schema_migrations TO postgres;
GRANT ALL ON TABLE realtime.schema_migrations TO dashboard_user;
GRANT SELECT ON TABLE realtime.schema_migrations TO anon;
GRANT SELECT ON TABLE realtime.schema_migrations TO authenticated;
GRANT SELECT ON TABLE realtime.schema_migrations TO service_role;
GRANT ALL ON TABLE realtime.schema_migrations TO supabase_realtime_admin;


--
-- Name: TABLE subscription; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.subscription TO postgres;
GRANT ALL ON TABLE realtime.subscription TO dashboard_user;
GRANT SELECT ON TABLE realtime.subscription TO anon;
GRANT SELECT ON TABLE realtime.subscription TO authenticated;
GRANT SELECT ON TABLE realtime.subscription TO service_role;
GRANT ALL ON TABLE realtime.subscription TO supabase_realtime_admin;


--
-- Name: SEQUENCE subscription_id_seq; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO postgres;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO dashboard_user;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO anon;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO service_role;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO supabase_realtime_admin;


--
-- Name: TABLE buckets; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.buckets FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.buckets TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.buckets TO service_role;
GRANT ALL ON TABLE storage.buckets TO authenticated;
GRANT ALL ON TABLE storage.buckets TO anon;
GRANT ALL ON TABLE storage.buckets TO postgres WITH GRANT OPTION;


--
-- Name: TABLE buckets_analytics; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets_analytics TO service_role;
GRANT ALL ON TABLE storage.buckets_analytics TO authenticated;
GRANT ALL ON TABLE storage.buckets_analytics TO anon;


--
-- Name: TABLE buckets_vectors; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.buckets_vectors TO service_role;
GRANT SELECT ON TABLE storage.buckets_vectors TO authenticated;
GRANT SELECT ON TABLE storage.buckets_vectors TO anon;


--
-- Name: TABLE objects; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.objects FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.objects TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.objects TO service_role;
GRANT ALL ON TABLE storage.objects TO authenticated;
GRANT ALL ON TABLE storage.objects TO anon;
GRANT ALL ON TABLE storage.objects TO postgres WITH GRANT OPTION;


--
-- Name: TABLE s3_multipart_uploads; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO anon;


--
-- Name: TABLE s3_multipart_uploads_parts; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads_parts TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO anon;


--
-- Name: TABLE vector_indexes; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.vector_indexes TO service_role;
GRANT SELECT ON TABLE storage.vector_indexes TO authenticated;
GRANT SELECT ON TABLE storage.vector_indexes TO anon;


--
-- Name: TABLE secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.secrets TO service_role;


--
-- Name: TABLE decrypted_secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.decrypted_secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.decrypted_secrets TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON FUNCTIONS TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON TABLES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,USAGE ON SEQUENCES TO app_runtime;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO service_role;


--
-- Name: ensure_rls; Type: EVENT TRIGGER; Schema: -; Owner: postgres
--

CREATE EVENT TRIGGER ensure_rls ON ddl_command_end
         WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
   EXECUTE FUNCTION public.rls_auto_enable();


ALTER EVENT TRIGGER ensure_rls OWNER TO postgres;

--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


ALTER EVENT TRIGGER issue_graphql_placeholder OWNER TO supabase_admin;

--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


ALTER EVENT TRIGGER issue_pg_cron_access OWNER TO supabase_admin;

--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


ALTER EVENT TRIGGER issue_pg_graphql_access OWNER TO supabase_admin;

--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


ALTER EVENT TRIGGER issue_pg_net_access OWNER TO supabase_admin;

--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


ALTER EVENT TRIGGER pgrst_ddl_watch OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


ALTER EVENT TRIGGER pgrst_drop_watch OWNER TO supabase_admin;

--
-- PostgreSQL database dump complete
--

