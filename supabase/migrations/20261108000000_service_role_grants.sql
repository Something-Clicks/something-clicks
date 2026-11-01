-- The form store (contact, referral-partner and application submissions, form
-- events, rate limits) goes through Supabase's Data API as service_role. This
-- project was created without the default table grants for service_role, so
-- those calls failed with "permission denied". Grant exactly what the store
-- needs, on exactly those tables. anon and authenticated stay locked out.
grant select, insert, update, delete on table
  network_applications,
  referral_partner_interests,
  contact_messages,
  form_events,
  rate_limits
to service_role;
