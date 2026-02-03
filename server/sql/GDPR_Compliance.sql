
-- ==================================================================================
-- ESQUEMA RGPD / LEGAL - CONSENTIMIENTO GRANULAR Y ROLES
-- ==================================================================================

-- 1. EXTENSIÓN DE PERFILES (Seguridad y Abuso)
-- Agregamos manejo de créditos, rol de administración y aceptación TOS básica.
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user', -- 'admin', 'user'
ADD COLUMN IF NOT EXISTS credits_remaining INT DEFAULT 1, -- One-shot demo
ADD COLUMN IF NOT EXISTS tos_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ DEFAULT NOW();

-- 2. TABLA DE CONSENTIMIENTOS LEGALES (GDPR AUDIT LOG)
-- Esta tabla es inmutable. Si el usuario cambia de opinión, se inserta una nueva fila.
-- Esto permite probar qué consintió el usuario en una fecha específica.
CREATE TABLE IF NOT EXISTS public.opt_in_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL, -- 'process_specific' (Este ATS), 'future_matching' (Reutilización)
    status BOOLEAN NOT NULL, -- TRUE (Aceptado), FALSE (Revocado)
    ip_address TEXT, -- Opcional: Para mayor prueba de origen
    source TEXT DEFAULT 'web_onboarding_v1',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indice para búsquedas rápidas de cumplimiento legal
CREATE INDEX IF NOT EXISTS idx_opt_in_user ON public.opt_in_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_opt_in_type ON public.opt_in_logs(consent_type);

-- 3. VISTA DE CANDIDATOS DISPONIBLES (SEGURO PARA RECLUTADORES)
-- Esta vista filtra automáticamente a usuarios que NO han dado consent para futuro.
-- Los reclutadores SOLO deben consultar esta vista, nunca la tabla raw de profiles.
CREATE OR REPLACE VIEW public.available_candidates AS
SELECT 
    p.id,
    p.email,
    p.role_title,
    p.role_industry,
    p.ats_score,
    p.level,
    p.last_active
FROM public.profiles p
JOIN (
    SELECT DISTINCT ON (user_id) user_id, status
    FROM public.opt_in_logs
    WHERE consent_type = 'future_matching'
    ORDER BY user_id, created_at DESC
) consent ON p.id = consent.user_id
WHERE consent.status = TRUE;

-- 4. FUNCIÓN PARA REGISTRAR CONSENTIMIENTO (RPC para llamar desde Frontend)
CREATE OR REPLACE FUNCTION public.log_consent(
    p_user_id UUID,
    p_consent_type TEXT,
    p_status BOOLEAN,
    p_source TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.opt_in_logs (user_id, consent_type, status, source)
    VALUES (p_user_id, p_consent_type, p_status, p_source);
    
    -- Actualizar last_interaction para evitar purgado automático
    UPDATE public.profiles 
    SET last_interaction_at = NOW() 
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
