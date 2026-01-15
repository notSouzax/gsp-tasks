// Test simple de Resend para diagnosticar el problema
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
    // CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            }
        })
    }

    try {
        console.log('API Key exists:', !!RESEND_API_KEY)
        console.log('API Key length:', RESEND_API_KEY?.length)

        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY not configured')
        }

        // Test simple: enviar a un email fijo
        const payload = {
            from: 'Kanban Automations <onboarding@resend.dev>',
            to: ['sozinho2004@gmail.com'],
            subject: 'Test desde Diagnostic Function',
            text: 'Este es un email de prueba para diagnosticar el problema.',
        }

        console.log('Sending payload:', JSON.stringify(payload, null, 2))

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })

        const responseText = await response.text()
        console.log('Resend response status:', response.status)
        console.log('Resend response:', responseText)

        if (!response.ok) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Resend error (${response.status}): ${responseText}`,
                    hasApiKey: !!RESEND_API_KEY,
                    apiKeyLength: RESEND_API_KEY?.length,
                }),
                {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                }
            )
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Email sent successfully',
                response: responseText,
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        )
    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
                hasApiKey: !!RESEND_API_KEY,
            }),
            {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        )
    }
})
