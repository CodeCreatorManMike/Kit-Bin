/** Data-protection frameworks and how Kit-Bin's architecture relates to each.
 *
 * IMPORTANT, read before editing:
 * There is no official GDPR logo, no official CCPA logo, and no HIPAA
 * certification body. Any "compliance badge" for these is self-asserted
 * decoration with no legal weight. So these entries are deliberately framed as
 * *explanations of how the site relates to each law*, never as certifications,
 * seals, or audit results.
 *
 * HIPAA in particular: Kit-Bin is not a covered entity or a business associate
 * and does not sign BAAs. Claiming HIPAA compliance would be false and would
 * invite users to put PHI through the site believing they had legal cover.
 * Do not soften the `limitation` text on that entry.
 *
 * If a real audit is ever completed or a certification is issued by a named
 * body, cite that body specifically rather than adding a generic badge. */

export interface Framework {
  id: string;
  short: string;
  name: string;
  region: string;
  /** One-line summary of the honest position. */
  summary: string;
  /** Why the local-processing architecture matters for this framework. */
  points: string[];
  /** The thing people get wrong about this framework and this site. */
  limitation: string;
  /** Hand-drawn icon key, resolved in ComplianceIcon.astro. */
  icon: 'shield' | 'opt-out' | 'health';
  accent: string;
}

export const frameworks: Framework[] = [
  {
    id: 'gdpr',
    short: 'GDPR',
    name: 'General Data Protection Regulation',
    region: 'United Kingdom and European Union',
    summary:
      'The files you process are never transmitted to Kit-Bin, so they are not personal data that Kit-Bin holds, processes, or could disclose.',
    points: [
      'Data minimisation is structural here rather than a policy promise. Your file is read into your browser\'s memory and the result is written back to your device. No copy is created on a server that would then need a retention schedule.',
      'There is no account system, so there is no name, email address, or password to store, breach, or export.',
      'Because Kit-Bin holds no file data and no account data, a subject access request or erasure request has nothing to return or delete. Nothing was collected in the first place.',
      'Your hosting provider records ordinary server request logs, such as IP address and user agent, as any website does. That is the realistic scope of data involved in visiting the site.',
      'No analytics or tracking script currently runs on the site, and no advertising cookies are set.',
    ],
    limitation:
      'GDPR has no official certification mark and no logo. This section explains how the site is built, it is not an audit result or a seal issued by a regulator.',
    icon: 'shield',
    accent: 'from-blue-400 to-indigo-400',
  },
  {
    id: 'ccpa',
    short: 'CCPA / CPRA',
    name: 'California Consumer Privacy Act, as amended by the CPRA',
    region: 'California, United States',
    summary:
      'Kit-Bin does not sell or share personal information, and the files you process never reach a Kit-Bin server to begin with.',
    points: [
      'No sale of personal information, and no sharing of it for cross-context behavioural advertising.',
      'No personal information is collected through an account, because there are no accounts.',
      'The contents of your files are not collected, so they cannot be sold, shared, or used to build a profile.',
      'The right to know, the right to delete, and the right to correct all apply to data a business holds. Kit-Bin holds no file contents and no account records.',
      'If advertising is enabled in future and it would involve sharing personal information, an opt-out mechanism will be added before that happens, and the privacy policy will be updated first.',
    ],
    limitation:
      'There is no official CCPA compliance logo. The one icon California regulations do specify is an opt-out control for businesses that sell or share personal information, which does not currently apply here.',
    icon: 'opt-out',
    accent: 'from-emerald-400 to-teal-400',
  },
  {
    id: 'hipaa',
    short: 'HIPAA',
    name: 'Health Insurance Portability and Accountability Act',
    region: 'United States',
    summary:
      'Kit-Bin is not a HIPAA covered entity or business associate and does not sign Business Associate Agreements. Read the limitation below before using it in any clinical workflow.',
    points: [
      'HIPAA obligations attach to covered entities, such as healthcare providers, health plans, and clearinghouses, and to their business associates under a signed Business Associate Agreement. Kit-Bin is a free public utility and is neither.',
      'What is relevant is the architecture rather than a certification. Because processing happens in your browser and the file is never transmitted, using Kit-Bin on a device is closer to using locally installed desktop software than to uploading a document to a third-party cloud service.',
      'No protected health information is transmitted to, received by, or stored by Kit-Bin, because no file content leaves the device.',
      'That does not by itself discharge your own obligations. Device encryption, workstation security, access controls, and your organisation\'s policies remain yours to satisfy.',
    ],
    limitation:
      'There is no HIPAA certification and no HIPAA compliance logo. No vendor can truthfully hold one. Anyone displaying a "HIPAA Certified" badge is asserting something that does not exist. If you handle PHI, confirm your intended use with your own privacy officer or counsel before relying on any third-party tool, including this one.',
    icon: 'health',
    accent: 'from-rose-400 to-orange-400',
  },
];
