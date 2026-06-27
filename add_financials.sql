ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS comment TEXT;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_method_check CHECK (method IN ('EFT','Card','SnapScan','PayFast','Ozow','Wallet'));

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS payment_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10,2) DEFAULT 0.00;

CREATE OR REPLACE FUNCTION admin_log_payment(
  p_client_id UUID,
  p_job_id UUID,
  p_amount NUMERIC,
  p_method TEXT,
  p_comment TEXT
) RETURNS VOID AS $$
BEGIN
  IF get_my_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can log payments.';
  END IF;

  IF p_job_id IS NULL THEN
    INSERT INTO public.payments (client_id, job_id, amount, method, status, paid_at, comment)
    VALUES (p_client_id, NULL, p_amount, p_method, 'cleared', NOW(), p_comment);
    
    UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount WHERE id = p_client_id;
  
  ELSIF p_method = 'Wallet' THEN
    IF COALESCE((SELECT wallet_balance FROM public.profiles WHERE id = p_client_id), 0) < p_amount THEN
      RAISE EXCEPTION 'Insufficient wallet balance.';
    END IF;

    INSERT INTO public.payments (client_id, job_id, amount, method, status, paid_at, comment)
    VALUES (p_client_id, p_job_id, p_amount, p_method, 'cleared', NOW(), p_comment);

    UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance, 0) - p_amount WHERE id = p_client_id;

  ELSE
    INSERT INTO public.payments (client_id, job_id, amount, method, status, paid_at, comment)
    VALUES (p_client_id, p_job_id, p_amount, p_method, 'cleared', NOW(), p_comment);
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
