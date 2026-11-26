exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE accounts (
      id uuid PRIMARY KEY,
      username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{3,24}$'),
      password_hash text NOT NULL,
      banned_at timestamptz,
      session_generation integer NOT NULL DEFAULT 0 CHECK (session_generation >= 0),
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE players (
      account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
      state jsonb NOT NULL CHECK (
        jsonb_typeof(state) = 'object' AND state ? 'version' AND state->'version' = '1'::jsonb
          AND state ? 'coins' AND jsonb_typeof(state->'coins') = 'number'
          AND (state->>'coins')::numeric BETWEEN 0 AND 1000000000
          AND (state->>'coins')::numeric = trunc((state->>'coins')::numeric)
      ),
      foreground_at bigint CHECK (foreground_at >= 0 AND foreground_at <= (state->>'lastAt')::bigint),
      pending_summary jsonb CHECK (jsonb_typeof(pending_summary) = 'object'),
      rating integer NOT NULL DEFAULT 1000 CHECK (rating BETWEEN 100 AND 3000),
      ranked_wins integer NOT NULL DEFAULT 0 CHECK (ranked_wins >= 0)
    );

    CREATE TABLE sessions (
      token_hash text PRIMARY KEY,
      account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL,
      generation integer NOT NULL CHECK (generation >= 0),
      revoked_at timestamptz
    );
    CREATE INDEX sessions_account ON sessions(account_id);

    CREATE TABLE command_receipts (
      account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      command_id uuid NOT NULL,
      fingerprint text NOT NULL,
      status_code smallint NOT NULL CHECK (status_code BETWEEN 200 AND 499),
      response jsonb NOT NULL,
      PRIMARY KEY (account_id, command_id)
    );

    CREATE TABLE market_listings (
      id uuid PRIMARY KEY,
      owner_id uuid NOT NULL REFERENCES accounts(id),
      side text NOT NULL CHECK (side IN ('buy', 'sell')),
      asset_kind text NOT NULL CHECK (asset_kind IN ('item', 'bud', 'gear')),
      item_id text,
      instance_id text,
      instance jsonb,
      remaining integer NOT NULL CHECK (remaining BETWEEN 0 AND 1000),
      unit_price integer NOT NULL CHECK (unit_price BETWEEN 1 AND 1000000),
      created_at timestamptz NOT NULL,
      CHECK (
        (asset_kind = 'item' AND item_id IS NOT NULL AND instance_id IS NULL AND instance IS NULL)
        OR
        (side = 'sell' AND asset_kind IN ('bud', 'gear') AND remaining <= 1
          AND item_id IS NULL AND instance_id IS NOT NULL AND instance IS NOT NULL)
      )
    );
    CREATE UNIQUE INDEX market_unique_open_instance ON market_listings(asset_kind, instance_id)
      WHERE remaining > 0 AND instance_id IS NOT NULL;
    CREATE INDEX market_open ON market_listings(created_at DESC) WHERE remaining > 0;
    CREATE INDEX market_owner_open ON market_listings(owner_id) WHERE remaining > 0;

    CREATE TABLE market_fills (
      id uuid PRIMARY KEY,
      listing_id uuid NOT NULL REFERENCES market_listings(id),
      taker_id uuid NOT NULL REFERENCES accounts(id),
      quantity integer NOT NULL CHECK (quantity > 0),
      gross integer NOT NULL CHECK (gross > 0),
      tax integer NOT NULL CHECK (tax >= 0 AND tax <= gross),
      filled_at timestamptz NOT NULL
    );

    CREATE TABLE store_stock (
      item_id text PRIMARY KEY,
      quantity integer NOT NULL CHECK (quantity >= 0),
      restocked_at timestamptz NOT NULL
    );

    CREATE TABLE chat_messages (
      id uuid PRIMARY KEY,
      sender_id uuid NOT NULL REFERENCES accounts(id),
      body text NOT NULL CHECK (length(body) BETWEEN 1 AND 240),
      sent_at timestamptz NOT NULL,
      hidden_at timestamptz
    );
    CREATE INDEX chat_recent ON chat_messages(sent_at DESC) WHERE hidden_at IS NULL;
    CREATE INDEX chat_sender_recent ON chat_messages(sender_id, sent_at DESC);

    CREATE TABLE chat_reports (
      message_id uuid NOT NULL REFERENCES chat_messages(id),
      reporter_id uuid NOT NULL REFERENCES accounts(id),
      reason text NOT NULL CHECK (length(reason) BETWEEN 1 AND 120),
      reported_at timestamptz NOT NULL,
      PRIMARY KEY (message_id, reporter_id)
    );

    CREATE TABLE social_controls (
      account_id uuid NOT NULL REFERENCES accounts(id),
      target_id uuid NOT NULL REFERENCES accounts(id),
      kind text NOT NULL CHECK (kind IN ('block', 'mute')),
      PRIMARY KEY (account_id, target_id, kind),
      CHECK (account_id != target_id)
    );

    CREATE TABLE friendships (
      account_a uuid NOT NULL REFERENCES accounts(id),
      account_b uuid NOT NULL REFERENCES accounts(id),
      requester_id uuid NOT NULL REFERENCES accounts(id),
      accepted boolean NOT NULL DEFAULT false,
      PRIMARY KEY (account_a, account_b),
      CHECK (account_a < account_b),
      CHECK (requester_id IN (account_a, account_b))
    );

    CREATE TABLE clans (
      id uuid PRIMARY KEY,
      name text NOT NULL UNIQUE CHECK (name ~ '^[a-z0-9 _-]{3,24}$'),
      contributions integer NOT NULL DEFAULT 0 CHECK (contributions BETWEEN 0 AND 40)
    );
    CREATE TABLE clan_members (
      account_id uuid PRIMARY KEY REFERENCES accounts(id),
      clan_id uuid NOT NULL REFERENCES clans(id),
      contributed integer NOT NULL DEFAULT 0 CHECK (contributed BETWEEN 0 AND 40)
    );
    CREATE INDEX clan_members_by_clan ON clan_members(clan_id);
    CREATE TABLE clan_contributions (
      id uuid PRIMARY KEY,
      account_id uuid NOT NULL REFERENCES accounts(id),
      clan_id uuid NOT NULL REFERENCES clans(id),
      quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 40),
      contributed_at timestamptz NOT NULL
    );

    CREATE TABLE pvp_defenses (
      account_id uuid PRIMARY KEY REFERENCES accounts(id),
      team jsonb NOT NULL,
      rules_version integer NOT NULL,
      progression integer NOT NULL CHECK (progression BETWEEN 1 AND 3),
      strength integer NOT NULL CHECK (strength > 0),
      published_at timestamptz NOT NULL
    );

    CREATE TABLE pvp_matches (
      id uuid PRIMARY KEY,
      attacker_id uuid NOT NULL REFERENCES accounts(id),
      defender_id uuid NOT NULL REFERENCES accounts(id),
      attacker_team jsonb NOT NULL,
      defender_team jsonb NOT NULL,
      rules_version integer NOT NULL,
      seed text NOT NULL,
      result jsonb NOT NULL,
      attacker_change integer NOT NULL,
      defender_change integer NOT NULL,
      played_at timestamptz NOT NULL,
      CHECK (attacker_id != defender_id)
    );
    CREATE INDEX pvp_attacker_history ON pvp_matches(attacker_id, played_at DESC);
    CREATE INDEX pvp_defender_history ON pvp_matches(defender_id, played_at DESC);
    CREATE INDEX pvp_rating ON players(rating DESC);
  `)
}

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE pvp_matches, pvp_defenses, clan_contributions, clan_members, clans,
      friendships, social_controls, chat_reports, chat_messages, store_stock,
      market_fills, market_listings, command_receipts, sessions, players, accounts
  `)
}
