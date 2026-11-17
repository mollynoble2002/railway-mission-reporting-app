/**
 * URGENT GUIDANCE AND CONTACTS: PROTOTYPE PLACEHOLDER CONTENT.
 *
 * This content has NOT been approved by Railway Mission. It exists so the component can be
 * demonstrated. Before any real use:
 *  - Railway Mission provides the official wording and contact details;
 *  - an approver is recorded in `approvedBy`, and `status` changes to 'approved';
 *  - contacts with no number stay blank rather than being guessed.
 *
 * Do not add Railway Mission telephone numbers, email addresses or escalation routes here
 * unless they have been supplied and approved.
 */

export interface GuidanceContact {
  id: string;
  label: string;
  /** null = not yet supplied. The UI shows "Not yet supplied" rather than a guess. */
  number: string | null;
  note?: string;
}

export interface GuidanceConfig {
  status: 'prototype_placeholder' | 'approved';
  approvedBy: string | null;
  approvedOn: string | null;
  intro: string;
  steps: string[];
  disclaimer: string;
  contacts: GuidanceContact[];
}

export const URGENT_GUIDANCE: GuidanceConfig = {
  status: 'prototype_placeholder',
  approvedBy: null,
  approvedOn: null,
  intro: '[PROTOTYPE PLACEHOLDER: NOT APPROVED] If someone is in immediate danger, act on established procedures first.',
  steps: [
    '[PLACEHOLDER] Make sure the person is safe, and that anyone around is safe.',
    '[PLACEHOLDER] Follow your Railway Mission escalation procedure.',
    '[PLACEHOLDER] Ask railway staff or British Transport Police for help where appropriate.',
    '[PLACEHOLDER] Record the report afterwards, when it is safe to do so.',
  ],
  disclaimer:
    'This digital form does not replace calling emergency services, British Transport Police, or the Railway Mission safeguarding and escalation contact where immediate action is required.',
  contacts: [
    {
      id: 'emergency',
      label: 'Emergency services',
      number: '999',
      note: 'Standard UK emergency number, shown as prototype text.',
    },
    { id: 'btp', label: 'British Transport Police', number: null, note: 'Number to be supplied.' },
    {
      id: 'rm_escalation',
      label: 'Railway Mission safeguarding / escalation contact',
      number: null,
      note: 'To be supplied and approved by Railway Mission.',
    },
  ],
};
