-- 1. Tabela de códigos de afiliado
CREATE TABLE public.affiliate_codes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL,
  code        text        UNIQUE NOT NULL,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "influencer_select_own" ON public.affiliate_codes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admin_all" ON public.affiliate_codes
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 2. Tabela de referrals
CREATE TABLE public.referrals (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_code_id     uuid        NOT NULL REFERENCES public.affiliate_codes(id) ON DELETE CASCADE,
  referred_user_id      uuid,
  trial_start           timestamptz,
  trial_end             timestamptz,
  converted_at          timestamptz,
  stripe_subscription_id text       UNIQUE,
  plan                  text,
  status                text        NOT NULL DEFAULT 'pending',
  created_at            timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "influencer_select_own" ON public.referrals
  FOR SELECT USING (
    affiliate_code_id IN (
      SELECT id FROM public.affiliate_codes WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "admin_all" ON public.referrals
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 3. Tabela de comissões
CREATE TABLE public.affiliate_commissions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_code_id uuid        NOT NULL REFERENCES public.affiliate_codes(id) ON DELETE CASCADE,
  referral_id       uuid        NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  month             date        NOT NULL,
  amount_cents      integer     NOT NULL,
  status            text        NOT NULL DEFAULT 'pending',
  paid_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referral_id, month)
);
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "influencer_select_own" ON public.affiliate_commissions
  FOR SELECT USING (
    affiliate_code_id IN (
      SELECT id FROM public.affiliate_codes WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "admin_all" ON public.affiliate_commissions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 4. Adicionar referred_by em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by text;