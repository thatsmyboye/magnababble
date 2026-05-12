-- Score increment helper — called server-side after round results
CREATE OR REPLACE FUNCTION increment_score(p_player_id UUID, p_amount INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE players
  SET score = score + p_amount
  WHERE id = p_player_id;
END;
$$;
