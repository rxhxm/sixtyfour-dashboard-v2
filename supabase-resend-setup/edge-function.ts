// Supabase Edge Function: add-to-resend
// File: supabase/functions/add-to-resend/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const { email, name } = await req.json();
    
    // Validate input
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid email' }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    console.log(`📧 Syncing to Resend: ${email}`);
    
    const audienceId = '0c55c1d3-ba5f-4685-a8f5-2c77a5e8f4dc';
    const resendApiKey = Deno.env.get("SIGNUPS_RESEND");
    
    if (!resendApiKey) {
      console.error('❌ SIGNUPS_RESEND secret not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const response = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        email, 
        firstName: name || "", 
        unsubscribed: false 
      })
    });
    
    const responseData = await response.text();
    
    if (response.ok) {
      console.log(`✅ Added ${email} to Resend`);
    } else {
      console.error(`❌ Resend API error for ${email}:`, responseData);
    }
    
    return new Response(responseData, {
      status: response.status,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (e) {
    console.error('❌ Edge function error:', e);
    return new Response(
      JSON.stringify({ error: String(e) }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

