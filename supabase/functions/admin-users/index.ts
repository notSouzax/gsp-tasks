// Edge Function: gestión de usuarios por el superadmin
// Ubicación: supabase/functions/admin-users/index.ts
//
// Crea usuarios (auth + perfil) usando la service role key, pero SOLO si quien
// llama es el superadmin (se verifica con su JWT contra profiles.is_superadmin).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Falta autorización')

        // Cliente con el JWT del que llama, para identificarlo
        const caller = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } },
        })
        const { data: { user }, error: authError } = await caller.auth.getUser()
        if (authError || !user) throw new Error('No autenticado')

        // Cliente con service role para operaciones administrativas
        const admin = createClient(supabaseUrl, serviceKey)

        // Verificar que el que llama es superadmin
        const { data: prof, error: profErr } = await admin
            .from('profiles')
            .select('is_superadmin')
            .eq('id', user.id)
            .single()
        if (profErr || !prof?.is_superadmin) throw new Error('No autorizado')

        const body = await req.json()
        const action = body.action || 'create_user'

        if (action === 'create_user') {
            const { email, password, full_name } = body
            if (!email || !password) throw new Error('Email y contraseña son obligatorios')
            if (String(password).length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres')

            const { data: created, error: createErr } = await admin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: {
                    full_name: full_name || email.split('@')[0],
                    avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(full_name || email)}&background=random`,
                },
            })
            if (createErr) throw createErr

            const newId = created.user.id
            // Crear/actualizar el perfil
            await admin.from('profiles').upsert({
                id: newId,
                email,
                full_name: full_name || email.split('@')[0],
                role: 'user',
            })

            return new Response(JSON.stringify({ success: true, user_id: newId }), {
                headers: { ...CORS, 'Content-Type': 'application/json' },
            })
        }

        if (action === 'delete_user') {
            const { user_id } = body
            if (!user_id) throw new Error('Falta user_id')
            if (user_id === user.id) throw new Error('No puedes eliminarte a ti mismo')
            const { error: delErr } = await admin.auth.admin.deleteUser(user_id)
            if (delErr) throw delErr
            return new Response(JSON.stringify({ success: true }), {
                headers: { ...CORS, 'Content-Type': 'application/json' },
            })
        }

        throw new Error('Acción no soportada')
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 400,
            headers: { ...CORS, 'Content-Type': 'application/json' },
        })
    }
})
