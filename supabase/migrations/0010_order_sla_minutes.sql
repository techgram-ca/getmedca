-- ---------------------------------------------------------------------
-- 0010 · The SLA an order was actually given
--
-- The response window lived only in platform_settings, so the pharmacy's
-- countdown was a hardcoded 30 minutes and never followed the admin's setting.
--
-- Reading the current setting at render time would still be wrong: the timer is
-- scheduled on Inngest when the order is activated, so an order already waiting
-- keeps the window it started with. Changing the setting from 30 to 20 would
-- make every in-flight countdown claim a deadline the timer will not honour.
--
-- So the window is snapshotted onto the order, like the delivery price is, and
-- the countdown reads that. Null means the order predates this column and the
-- current platform setting is the best guess available.
-- ---------------------------------------------------------------------
alter table public.orders
  add column sla_minutes int
    constraint orders_sla_minutes_positive check (sla_minutes is null or sla_minutes > 0);

-- ---------------------------------------------------------------------
-- The notification templates said "30 minutes" in their text, so an admin who
-- changed the window still had orders telling pharmacies thirty. They now take
-- a {slaMinutes} placeholder.
--
-- Only templates still holding the original wording are rewritten, matched on
-- the exact text: anything an admin has edited is theirs, and is left alone.
-- ---------------------------------------------------------------------
update public.notification_templates set template_text =
  'GetMed: New {orderType} order {orderId} for {pharmacyName} from {patientName}. Please respond within {slaMinutes} minutes.'
where event_type = 'order.new' and channel = 'sms'
  and template_text = 'GetMed: New {orderType} order {orderId} for {pharmacyName} from {patientName}. Please respond within 30 minutes.';

update public.notification_templates set
  subject = 'New order {orderId} — respond within {slaMinutes} minutes',
  template_text = replace(template_text, 'within 30 minutes', 'within {slaMinutes} minutes')
where event_type = 'order.new' and channel = 'email'
  and subject = 'New order {orderId} — respond within 30 minutes';

update public.notification_templates set template_text =
  'GetMed ALERT: Order {orderId} at {pharmacyName} was not accepted in {slaMinutes} min. Patient {patientName} {patientPhone}.'
where event_type = 'order.timed_out' and channel = 'sms'
  and template_text = 'GetMed ALERT: Order {orderId} at {pharmacyName} was not accepted in 30 min. Patient {patientName} {patientPhone}.';

update public.notification_templates set template_text =
  replace(template_text, 'was not accepted within 30 minutes.', 'was not accepted within {slaMinutes} minutes.')
where event_type = 'order.timed_out' and channel = 'email'
  and template_text like '%was not accepted within 30 minutes.%';
