-- Removes everything supabase/demo/bolton-pharmacies.sql created.
--
-- Scoped by the DEMO-10% license number, which only the demo rows carry, so a
-- real pharmacy registered in Bolton is never caught by this. Child rows go
-- with the pharmacy through on delete cascade.
--
-- An order placed against a demo pharmacy would block the delete, which is the
-- right outcome: that is real data, and it should be looked at rather than
-- quietly removed. Delete those orders first if they were test orders too.

begin;

delete from public.pharmacies where license_number like 'DEMO-10%';

commit;

select count(*) as demo_pharmacies_remaining
from public.pharmacies where license_number like 'DEMO-10%';
