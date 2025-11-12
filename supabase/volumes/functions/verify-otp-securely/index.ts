// To invoke:
// curl 'http://localhost:<KONG_HTTP_PORT>/functions/v1/hello' \
//   --header 'Authorization: Bearer <anon/service_role API key>'


import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// create admin client, since auth not necessary
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

Deno.serve(async (req) => {
  // Handle CORDS preflight request
  // Needed for browser requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify request is valid
    const { req_type, email, token, captchaToken } = await req.json()
    if (!req_type || !email || !token || !captchaToken) {
      return new Response(JSON.stringify({ error: 'Bad request: Missing required fields.' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Prepare to validate turnstile token
    let formData = new FormData()
    formData.append('secret', Deno.env.get('CLOUDFLARE_SECRET_KEY') ?? '')
    formData.append('response', captchaToken)
    // Pass thru client ip address, better security checks
    formData.append('remoteip', req.headers.get('x-forwarded-for') ?? '')

    // Verify turnstile token
    const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
    const result = await fetch(url, {
      body: formData,
      method: 'POST',
    })
    const outcome = await result.json()

    // If captcha not valid, immediately reject request
    if (!outcome.success) {
      console.error('Invalid Turnstile token:', outcome['error-codes'])
      return new Response(JSON.stringify({ error: 'Invalid CAPTCHA token' }), {
        status: 403, // forbid/failed security req
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // If captcha valid, continue with request

    // Attempt to verify OTP
    const { data, error } = await supabase.auth.verifyOtp({
      type: req_type,
      email,
      token,
    })

    // return any supabase errors, caught by the catch block below...
    if (error) {
      throw error
    }

    // Return success!
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    // Log the full, detailed error for your server-side logs.
    // This is crucial for debugging.
    console.error('An error occurred in verify-otp-securely:', error);
  
    // For expected Supabase auth errors, pass thru
    if (error.name === 'AuthApiError') {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, // It's a client-side auth error.
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  
    // For all other unexpected errors, error 500..
    return new Response(JSON.stringify({ error: 'An internal server error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})