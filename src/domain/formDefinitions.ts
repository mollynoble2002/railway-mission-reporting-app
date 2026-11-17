import type { FormDefinition, ReportKind } from './types';

/**
 * PLACEHOLDER FIELD DEFINITIONS.
 *
 * Railway Mission has not yet supplied the real fields for these forms (clarification C4).
 * Every label below is prefixed with "[PLACEHOLDER]" on purpose. Do not treat these as the
 * official questions. Replace the `fields` arrays with the approved field lists and set
 * `fieldSource: 'approved'` and a new `schemaVersion` when they arrive.
 */
export const FORM_DEFINITIONS: Record<ReportKind, FormDefinition> = {
  support_interaction: {
    kind: 'support_interaction',
    schemaVersion: 0,
    title: 'Support Interaction Form',
    shortTitle: 'Support interaction',
    description: 'Record a welfare or pastoral support interaction.',
    fieldSource: 'placeholder',
    fields: [
      {
        id: 'interactionDate',
        label: '[PLACEHOLDER] Date of interaction',
        type: 'date',
        required: true,
      },
      {
        id: 'locationText',
        label: '[PLACEHOLDER] Location (free text)',
        type: 'text',
        required: true,
        maxLength: 120,
        helpText: 'Synthetic placeholder. Do not enter a real location.',
      },
      {
        id: 'interactionType',
        label: '[PLACEHOLDER] Type of interaction',
        type: 'select',
        required: true,
        options: [
          { value: 'type_a', label: '[PLACEHOLDER] Option A' },
          { value: 'type_b', label: '[PLACEHOLDER] Option B' },
          { value: 'type_c', label: '[PLACEHOLDER] Option C' },
        ],
      },
      {
        id: 'supportNotes',
        label: '[PLACEHOLDER] Support provided (notes)',
        type: 'textarea',
        maxLength: 1000,
        helpText: 'Synthetic placeholder. Do not enter real personal or welfare information.',
      },
    ],
  },

  btp_visit: {
    kind: 'btp_visit',
    schemaVersion: 0,
    title: 'BTP Visits Log',
    shortTitle: 'BTP visit',
    description: 'Log a visit to British Transport Police.',
    fieldSource: 'placeholder',
    fields: [
      {
        id: 'visitDate',
        label: '[PLACEHOLDER] Date of visit',
        type: 'date',
        required: true,
      },
      {
        id: 'stationText',
        label: '[PLACEHOLDER] Station or location (free text)',
        type: 'text',
        required: true,
        maxLength: 120,
      },
      {
        id: 'visitType',
        label: '[PLACEHOLDER] Type of visit',
        type: 'select',
        required: true,
        options: [
          { value: 'type_a', label: '[PLACEHOLDER] Option A' },
          { value: 'type_b', label: '[PLACEHOLDER] Option B' },
        ],
      },
      {
        id: 'visitNotes',
        label: '[PLACEHOLDER] Notes',
        type: 'textarea',
        maxLength: 1000,
      },
    ],
  },

  network_rail_visit: {
    kind: 'network_rail_visit',
    schemaVersion: 0,
    title: 'Network Rail Visits Log',
    shortTitle: 'Network Rail visit',
    description: 'Log a visit to a Network Rail location.',
    fieldSource: 'placeholder',
    fields: [
      {
        id: 'visitDate',
        label: '[PLACEHOLDER] Date of visit',
        type: 'date',
        required: true,
      },
      {
        id: 'locationText',
        label: '[PLACEHOLDER] Location (free text)',
        type: 'text',
        required: true,
        maxLength: 120,
      },
      {
        id: 'numberOfEngagements',
        label: '[PLACEHOLDER] Number of engagements',
        type: 'number',
        required: true,
        min: 0,
        max: 999,
        helpText: 'Count only. Do not record names.',
      },
      {
        id: 'generalThemes',
        label: '[PLACEHOLDER] General themes',
        type: 'multiselect',
        options: [
          { value: 'theme_a', label: '[PLACEHOLDER] Theme A' },
          { value: 'theme_b', label: '[PLACEHOLDER] Theme B' },
          { value: 'theme_c', label: '[PLACEHOLDER] Theme C' },
        ],
      },
      {
        id: 'followUpRequired',
        label: '[PLACEHOLDER] Follow-up required',
        type: 'checkbox',
      },
      {
        id: 'visitNotes',
        label: '[PLACEHOLDER] Notes',
        type: 'textarea',
        maxLength: 1000,
      },
    ],
  },
};

export const REPORT_KINDS = Object.keys(FORM_DEFINITIONS) as ReportKind[];

export function getFormDefinition(kind: string): FormDefinition | undefined {
  return (FORM_DEFINITIONS as Record<string, FormDefinition | undefined>)[kind];
}
