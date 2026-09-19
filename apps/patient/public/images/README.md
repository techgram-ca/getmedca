# Patient site imagery

Drop image files into this folder (`apps/patient/public/images/`) using the exact
file names below. They are served at `/images/<name>` and picked up on the next
deploy — no code change is needed.

Every slot degrades to a branded placeholder until the file exists, so the site
stays presentable while artwork is being prepared.

| File name | Used on | Suggested size | Notes |
| --- | --- | --- | --- |
| `hero.png` | Home page hero | 1200 × 900 (4:3) | Delivery / patient receiving medication. Shown beside the address search. |
| `order.png` | Home · How it works, step 1 | 800 × 800 (square) | Uploading a prescription. |
| `verification.png` | Home · How it works, step 2 | 800 × 800 (square) | Pharmacist checking an order. |
| `delivery.png` | Home · How it works, step 3 | 800 × 800 (square) | Driver at the door. |
| `user-1.jpg` … `user-4.jpg` | Home hero, social proof row | 128 × 128 (square) | Small round avatars. Use licensed or consented photos only. |
| `consultation.jpg` | Consultations page hero | 1200 × 900 (4:3) | Pharmacist speaking with a patient. |
| `about.png` | About page hero | 1200 × 900 (4:3) | Team or pharmacy interior. |
| `faq.png` | FAQ page hero | 1200 × 900 (4:3) | Support / help illustration. |

Guidelines
- Keep each file under about 400 KB. Large PNGs slow the page down; export
  photographs as JPEG and illustrations as PNG or WebP.
- WebP works too: save as `hero.webp` and update the `src` in
  `src/components/home-hero.tsx` if you prefer that format.
- Use images you have the rights to. Patient-facing healthcare imagery should
  look Canadian and inclusive.

Pharmacy logos, cover photos, pharmacist portraits and gallery images are **not**
uploaded here. Each pharmacy uploads its own from the pharmacy dashboard, and
they are stored privately in Supabase Storage.

## Status

Uploaded: `hero.png`, `order.png`, `verification.png`, `delivery.png`,
`user-1.jpg`–`user-4.jpg`, `consultation.jpg`, `pharmacy.png`.

Still missing, so those slots show a plain gradient:
- `about.png` — About page hero
- `faq.png` — FAQ page hero

`pharmacy.png` is used as the cover photo on a pharmacy's public page when that
pharmacy has not uploaded one of its own.
