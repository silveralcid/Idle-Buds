exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE players DROP CONSTRAINT players_state_check;
    ALTER TABLE players ADD CONSTRAINT players_state_check CHECK (
      jsonb_typeof(state) = 'object' AND state ? 'version' AND state->'version' IN ('1'::jsonb, '2'::jsonb)
        AND state ? 'coins' AND jsonb_typeof(state->'coins') = 'number'
        AND (state->>'coins')::numeric BETWEEN 0 AND 1000000000
        AND (state->>'coins')::numeric = trunc((state->>'coins')::numeric)
    );
  `)
}

// Reverting cannot silently rewrite or delete newer player saves.
exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE players DROP CONSTRAINT players_state_check;
    ALTER TABLE players ADD CONSTRAINT players_state_check CHECK (
      jsonb_typeof(state) = 'object' AND state ? 'version' AND state->'version' = '1'::jsonb
        AND state ? 'coins' AND jsonb_typeof(state->'coins') = 'number'
        AND (state->>'coins')::numeric BETWEEN 0 AND 1000000000
        AND (state->>'coins')::numeric = trunc((state->>'coins')::numeric)
    );
  `)
}
