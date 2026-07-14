-- Fix RLS Policies for Security
-- This migration restricts access to sensitive tables from anonymous users

-- Disable SELECT for anon on sensitive tables
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Restrict trading data
ALTER TABLE public.trading_positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own trading positions" ON public.trading_positions FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.trading_signals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own trading signals" ON public.trading_signals FOR SELECT USING (auth.uid() = user_id);

-- Restrict user preferences and settings
ALTER TABLE public.user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own preferences" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.user_marketplace_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_marketplace_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own marketplace preferences" ON public.user_marketplace_preferences FOR SELECT USING (auth.uid() = user_id);

-- Restrict user analytics
ALTER TABLE public.user_analytics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own analytics" ON public.user_analytics FOR SELECT USING (auth.uid() = user_id);

-- Restrict user documents
ALTER TABLE public.user_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own documents" ON public.user_documents FOR SELECT USING (auth.uid() = user_id);

-- Restrict user security scores
ALTER TABLE public.user_security_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_security_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own security scores" ON public.user_security_scores FOR SELECT USING (auth.uid() = user_id);

-- Restrict user reputation
ALTER TABLE public.user_reputation DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reputation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reputation" ON public.user_reputation FOR SELECT USING (auth.uid() = user_id);

-- Restrict user connections and blocks
ALTER TABLE public.user_connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own connections" ON public.user_connections FOR SELECT USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

ALTER TABLE public.user_blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own blocks" ON public.user_blocks FOR SELECT USING (auth.uid() = user_id OR auth.uid() = blocked_user_id);

-- Restrict user devices
ALTER TABLE public.user_devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own devices" ON public.user_devices FOR SELECT USING (auth.uid() = user_id);

-- Restrict user presence
ALTER TABLE public.user_presence DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own presence" ON public.user_presence FOR SELECT USING (auth.uid() = user_id);

-- Restrict transacoes
ALTER TABLE public.transacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON public.transacoes FOR SELECT USING (auth.uid() = user_id);

-- Restrict trust scores
ALTER TABLE public.trust_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own trust score" ON public.trust_scores FOR SELECT USING (auth.uid() = user_id);

-- Restrict user interests
ALTER TABLE public.user_interests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own interests" ON public.user_interests FOR SELECT USING (auth.uid() = user_id);

-- Restrict user market preferences
ALTER TABLE public.user_market_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_market_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own market preferences" ON public.user_market_preferences FOR SELECT USING (auth.uid() = user_id);

-- Restrict user services
ALTER TABLE public.user_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own services" ON public.user_services FOR SELECT USING (auth.uid() = user_id);

-- Restrict user reports
ALTER TABLE public.user_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reports" ON public.user_reports FOR SELECT USING (auth.uid() = user_id);

-- Restrict verifications
ALTER TABLE public.verifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own verifications" ON public.verifications FOR SELECT USING (auth.uid() = user_id);

-- Restrict worker registry
ALTER TABLE public.worker_registry DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workers can view own registry" ON public.worker_registry FOR SELECT USING (auth.uid() = user_id);

-- Restrict workflow definitions
ALTER TABLE public.workflow_definitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own workflows" ON public.workflow_definitions FOR SELECT USING (auth.uid() = created_by);
