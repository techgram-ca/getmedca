import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@getmed/ui";
import { getLaunchState } from "@/lib/launch";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How GetMed collects, uses, stores and shares your personal and health information, and the rights you have over it under PHIPA and PIPEDA.",
};

/**
 * The date the wording below last changed. Bump it whenever the substance of
 * the policy changes — a policy whose "last updated" is older than its own
 * text is worse than none, because it is a statement about a version that no
 * longer exists.
 */
const LAST_UPDATED = "10 October 2026";

// One inbox. A policy that points at an address nobody reads is worse
// than one pointing at the address people already answer.
const SUPPORT_EMAIL = "support@getmed.ca";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-bold tracking-tight text-ink-950 sm:text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-[0.975rem] leading-[1.75] text-ink-600">{children}</div>
    </section>
  );
}

const CONTENTS = [
  ["who-we-are", "Who we are"],
  ["what-we-collect", "What we collect"],
  ["why-we-collect", "Why we collect it"],
  ["consent", "Your consent"],
  ["who-we-share-with", "Who we share it with"],
  ["where-it-lives", "Where your information is stored"],
  ["how-long", "How long we keep it"],
  ["how-we-protect", "How we protect it"],
  ["your-rights", "Your rights"],
  ["cookies", "Cookies and tracking"],
  ["children", "Children"],
  ["changes", "Changes to this policy"],
  ["contact", "Contact and complaints"],
] as const;

export default async function PrivacyPage() {
  // Before launch the site layout drops its header and footer, which would
  // leave this page with no way back to anywhere. The read is memoised per
  // request and the layout has already made it, so this costs nothing.
  const { launched } = await getLaunchState();

  return (
    <div className="min-h-screen bg-ink-50">
      {!launched ? (
        <div className="mx-auto max-w-[820px] px-6 pt-10">
          <Link href="/" className="inline-block no-underline"><Logo /></Link>
        </div>
      ) : null}

      <section className="mx-auto max-w-[820px] px-6 pb-10 pt-14">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-1.5 text-xs font-semibold text-brand-600">
          <ShieldCheck className="size-3.5" />
          Privacy
        </div>
        <h1 className="text-[clamp(2rem,5vw,3.2rem)] font-extrabold leading-[1.15] tracking-tight text-ink-950">
          Privacy <span className="text-brand-600">Policy</span>
        </h1>
        <p className="mt-4 text-[1.05rem] leading-[1.7] text-ink-500">
          GetMed handles prescriptions, so most of what you give us is health information. This page says plainly what
          we collect, why, who else sees it, and what you can ask us to do with it.
        </p>
        <p className="mt-4 text-sm text-ink-400">Last updated {LAST_UPDATED}</p>
      </section>

      <section className="mx-auto max-w-[820px] px-6 pb-8">
        <nav aria-label="On this page" className="surface rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">On this page</p>
          <ul className="mt-3 grid list-none gap-x-6 gap-y-2 sm:grid-cols-2">
            {CONTENTS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="text-sm text-brand-700 no-underline hover:underline">{label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </section>

      <section className="mx-auto max-w-[820px] space-y-10 px-6 pb-24">
        <Section id="who-we-are" title="Who we are">
          <p>
            GetMed Pharmacy Network (&ldquo;GetMed&rdquo;, &ldquo;we&rdquo;) operates a platform that connects patients
            in Ontario with licensed pharmacies and arranges delivery of their prescriptions.
          </p>
          <p>
            We are not a pharmacy and we do not dispense medication. Your prescription is filled by the licensed
            pharmacy you choose, which is a health information custodian in its own right under Ontario&rsquo;s{" "}
            <em>Personal Health Information Protection Act</em> (PHIPA). In handling your health information on that
            pharmacy&rsquo;s behalf we act as its service provider, and our own handling of personal information is also
            governed by the federal <em>Personal Information Protection and Electronic Documents Act</em> (PIPEDA).
          </p>
          <p>
            This means two things worth knowing. The pharmacy answers for the clinical record it keeps about you; we
            answer for the platform that carried your request to it and brought the medication to your door.
          </p>
        </Section>

        <Section id="what-we-collect" title="What we collect">
          <p>We collect only what an order or a consultation actually needs.</p>

          <p className="font-semibold text-ink-900">When you place an order</p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>Your name, phone number and, where the pharmacy requires it, your date of birth.</li>
            <li>The delivery address, its approximate map coordinates, and any delivery notes you add.</li>
            <li>A photo or file of your prescription, if you upload one.</li>
            <li>Allergies you tell us about, so the pharmacy and driver can handle the order safely.</li>
            <li>
              Your Ontario health card number and version, and private insurance details, only when the pharmacy needs
              them to bill your coverage.
            </li>
            <li>
              For a transfer, the name and contact details of the pharmacy you are transferring from, and the
              prescription number.
            </li>
          </ul>

          <p className="font-semibold text-ink-900">When you request a consultation</p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>Your name and phone number, the topic you want to discuss, when you would like to be called back, and
              anything you choose to write in the description.</li>
          </ul>

          <p className="font-semibold text-ink-900">Automatically, as the order moves</p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              A one-time code sent to your phone to confirm the number is yours, and the time it was confirmed.
            </li>
            <li>The time you gave consent, recorded with the order.</li>
            <li>Status history: when the pharmacy accepted it, when a driver collected it, when it arrived.</li>
            <li>
              At the door, a delivery photo and a signature, as proof the medication reached the right person.
            </li>
            <li>Basic technical records needed to run the service securely, such as rate-limiting counters.</li>
          </ul>

          <p>
            We do not ask for, and have no use for, information about you that is not connected to filling or
            delivering your prescription.
          </p>
        </Section>

        <Section id="why-we-collect" title="Why we collect it">
          <p>Each piece of information above exists for one of five reasons, and no others:</p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li><strong>To fill your prescription.</strong> The pharmacy cannot dispense without it.</li>
            <li><strong>To deliver it.</strong> A driver needs an address, a name and a phone number.</li>
            <li><strong>To confirm it is really you.</strong> Hence the code sent to your phone.</li>
            <li><strong>To bill your coverage</strong>, where you have asked the pharmacy to do that.</li>
            <li><strong>To keep a record</strong> that a controlled or refrigerated medication was handled correctly
              and reached you.</li>
          </ul>
          <p>
            We do not sell your information. We do not share it with advertisers, data brokers or insurers who are not
            already party to your claim. We do not use your health information to market anything to you.
          </p>
        </Section>

        <Section id="consent" title="Your consent">
          <p>
            Sharing prescription details with a pharmacy requires your express consent under PHIPA. We ask for it before
            an order is placed, and we record the moment you give it alongside the order, so there is never a question
            about whether it was given.
          </p>
          <p>
            You can withdraw consent at any time by contacting us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-brand-700 hover:underline">{SUPPORT_EMAIL}</a>.
            Withdrawing it stops any further use of your information by GetMed, but it cannot undo a delivery already
            made, and it does not reach back into the pharmacy&rsquo;s own clinical record, which that pharmacy is
            required by law to keep. We will tell you plainly which parts we can act on and which you need to raise with
            the pharmacy.
          </p>
        </Section>

        <Section id="who-we-share-with" title="Who we share it with">
          <p>Your information goes to four kinds of recipient, and each one gets only the part it needs.</p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              <strong>The pharmacy you chose.</strong> It sees your order in full, because it needs the whole thing to
              dispense safely. A pharmacy you did not choose sees nothing.
            </li>
            <li>
              <strong>The driver assigned to your delivery.</strong> They see your name, phone number, address and the
              handling instructions for the bag. They do not see your prescription, your health card, your insurance
              details or your allergies.
            </li>
            <li>
              <strong>GetMed staff</strong>, where it is needed to run the service, investigate a failed delivery or
              answer a support request.
            </li>
            <li>
              <strong>Service providers</strong> that make the platform work: hosting and database infrastructure,
              text-message and email delivery, address lookup and route distance, and bot protection. They act on our
              instructions and are not permitted to use your information for their own purposes.
            </li>
          </ul>
          <p>
            We may also disclose information where the law requires it — a court order, or a legal obligation on us or
            on the pharmacy. We will not hand over more than the request actually compels.
          </p>
        </Section>

        <Section id="where-it-lives" title="Where your information is stored">
          <p>
            Your orders, consultations and uploaded documents are stored in Canada, in data centres in the Montreal
            region.
          </p>
          <p>
            Some of the service providers described above operate outside Canada, and a limited amount of information
            passes through them in the course of doing their job — your phone number in order to send you a text, your
            email address in order to send you an email, a postal code or address in order to look it up on a map. Your
            prescription, your health card and your insurance documents are not sent to any of them. While information
            is outside Canada it may be accessible to the authorities of that country under their own laws.
          </p>
        </Section>

        <Section id="how-long" title="How long we keep it">
          <p>
            We keep order and consultation records for as long as we need them to run the service, resolve disputes and
            meet our legal obligations, and no longer. Prescription images, health card images and insurance documents
            are the most sensitive thing we hold and are kept only for as long as the order and any billing or audit
            period attached to it require.
          </p>
          <p>
            Your pharmacy keeps its own clinical record of what it dispensed to you, for the period Ontario law requires
            of pharmacies. That record is the pharmacy&rsquo;s and is not ours to delete.
          </p>
        </Section>

        <Section id="how-we-protect" title="How we protect it">
          <ul className="ml-5 list-disc space-y-1.5">
            <li>Everything you send us travels over an encrypted connection, and is encrypted where it is stored.</li>
            <li>
              Prescription, health card, insurance and proof-of-delivery files sit in private storage. They are never
              reachable by a public link; access is granted through short-lived signed links issued only to someone
              already entitled to see that file.
            </li>
            <li>
              Access is enforced in the database itself, not only in the application, so a pharmacy can reach its own
              orders and no one else&rsquo;s.
            </li>
            <li>Your phone number is confirmed with a one-time code before an order can be placed in your name.</li>
          </ul>
          <p>
            No system is perfectly secure. If a breach ever occurs that creates a real risk of significant harm to you,
            we will notify you and the appropriate regulators as the law requires.
          </p>
        </Section>

        <Section id="your-rights" title="Your rights">
          <p>You can ask us to:</p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>Tell you what information we hold about you, and give you a copy.</li>
            <li>Correct anything that is wrong.</li>
            <li>Delete what we are not required to keep.</li>
            <li>Explain how a particular piece of information was used or who it went to.</li>
            <li>Withdraw your consent, as described above.</li>
          </ul>
          <p>
            Write to{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-brand-700 hover:underline">{SUPPORT_EMAIL}</a>{" "}
            and we will respond within 30 days. If we need longer, or we have to refuse part of a request, we will tell
            you why. There is no charge for a reasonable request.
          </p>
          <p>
            Requests about the clinical record your pharmacy keeps should go to that pharmacy, which is the custodian of
            it. We will help you work out who to ask if that is not obvious.
          </p>
        </Section>

        <Section id="cookies" title="Cookies and tracking">
          <p>
            We use cookies only to keep you signed in and to keep your session secure. We do not run advertising
            trackers, and we do not use third-party analytics that profile you across other websites.
          </p>
        </Section>

        <Section id="children" title="Children">
          <p>
            GetMed is intended for adults. A parent or guardian may place an order for a child in their care, and the
            information they give us about that child is treated exactly as this policy describes.
          </p>
        </Section>

        <Section id="changes" title="Changes to this policy">
          <p>
            If we change how we handle your information, we will update this page and change the date at the top. Where
            a change is significant, we will tell you directly rather than relying on you to notice.
          </p>
        </Section>

        <Section id="contact" title="Contact and complaints">
          <p>
            Privacy questions and requests, and anything else:{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-brand-700 hover:underline">{SUPPORT_EMAIL}</a>,
            or through our <Link href="/contact" className="font-medium text-brand-700 hover:underline">contact page</Link>.
            Mark a privacy request as such in the subject line and it will be routed to the right person.
          </p>
          <p>
            If you are not satisfied with how we have handled a privacy matter, you can complain to the Information and
            Privacy Commissioner of Ontario about health information, or to the Office of the Privacy Commissioner of
            Canada about personal information more generally. We would rather hear from you first, but you do not have
            to come to us before going to them.
          </p>
        </Section>
      </section>
    </div>
  );
}
