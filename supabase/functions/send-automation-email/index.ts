// Supabase Edge Function para enviar emails
// Ubicación: supabase/functions/send-automation-email/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
    // CORS headers
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            }
        })
    }

    try {
        // Verificar autenticación
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing authorization header')
        }

        // Crear cliente de Supabase para verificar usuario
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: {
                headers: { Authorization: authHeader },
            },
        })

        // Verificar usuario autenticado
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            throw new Error('Unauthorized')
        }

        // Obtener datos del body
        const { to, subject, html, text, from } = await req.json()

        if (!to || !subject || (!html && !text)) {
            throw new Error('Missing required fields: to, subject, and html or text')
        }

        // Preparar payload para Resend
        // Usar delivered@resend.dev que es el email de test que siempre funciona en free tier
        const payload = {
            from: from || 'Acme <delivered@resend.dev>',
            to: Array.isArray(to) ? to : [to],
            subject,
        }

        // Resend requiere al menos text o html
        if (html) {
            payload.html = html
            payload.text = text || '' // Texto alternativo opcional
        } else if (text) {
            payload.text = text
        } else {
            throw new Error('Either html or text must be provided')
        }

        // Debug logging
        console.log('About to call Resend API')
        console.log('API Key exists:', !!RESEND_API_KEY)
        console.log('API Key first/last chars:', RESEND_API_KEY ? `${RESEND_API_KEY.substring(0, 7)}...${RESEND_API_KEY.substring(RESEND_API_KEY.length - 4)}` : 'NONE')
        console.log('Payload:', JSON.stringify(payload, null, 2))

        // Enviar email usando Resend
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Resend API error:', errorText)
            console.error('API Key exists:', !!RESEND_API_KEY)
            console.error('Request was:', { from: from || 'Kanban Automations <onboarding@resend.dev>', to, subject })
            throw new Error(`Resend API error (${response.status}): ${errorText}`)
        }

        const data = await response.json()

        return new Response(
            JSON.stringify({
                success: true,
                emailId: data.id,
                message: 'Email sent successfully'
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            },
        )
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            },
        )
    }
})
