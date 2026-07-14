// Council Configuration ("Council Scroll") schema and validator.
//
// Version separation:
// - The Maestriss application release version is owned by the root
//   package.json and the versioning system in Reference doc 12.
// - councilSchemaVersion below versions ONLY this configuration document
//   format. Saved Council Scrolls may outlive application releases.
// - Persisted run-record formats will carry their own version when
//   persistence is implemented; they are not defined in this slice.

import { getCouncilProvider } from './providers.js';
import { getCouncilRole } from './roles.js';

export const councilSchemaVersion = 1;

export type CouncilResponseLength = 'brief' | 'standard' | 'extended';
export type CouncilRoleIntensity = 'light' | 'full';
export type CouncilDissent = 'collaborative' | 'balanced' | 'adversarial';
export type CouncilInputMode = 'cumulative' | 'independent';

export type CouncilVariables = {
  responseLength: CouncilResponseLength;
  roleIntensity: CouncilRoleIntensity;
  dissent: CouncilDissent;
  inputMode: CouncilInputMode;
};

export type CouncilVariableOverrides = Partial<CouncilVariables>;

export type CouncilRules = {
  requireNovelContribution: boolean;
  requireDisagreement: boolean;
  forbidRepetition: boolean;
  labelEvidenceVsInference: boolean;
  preserveDissentInSynthesis: boolean;
  distinguishConsensusFromMinority: boolean;
  customRuleText?: string;
};

export type CouncilBudgets = {
  perContributionChars: number;
  totalPromptChars: number;
};

export type CouncilInputPolicy =
  | 'original-only'
  | 'previous-only'
  | 'previous-plus-original'
  | 'last-n'
  | 'full-record'
  | 'independent-round';

export type CouncilOutputPolicy =
  | 'free-response'
  | 'critique'
  | 'alternative-proposal'
  | 'fact-check-report'
  | 'synthesis'
  | 'recommendation'
  | 'final-answer';

export type CouncilFailurePolicy = 'halt' | 'retry-once' | 'skip-and-record';

export type CouncilStage = {
  id: string;
  provider: string;
  role: string;
  inputPolicy: CouncilInputPolicy;
  inputPolicyN?: number;
  outputPolicy?: CouncilOutputPolicy;
  variableOverrides?: CouncilVariableOverrides;
  failurePolicy: CouncilFailurePolicy;
  // Round membership is representable now; true round execution is a later
  // slice. Stages sharing a round value form an independent panel round.
  round?: string;
};

export type CouncilConfiguration = {
  schemaVersion: number;
  id: string;
  name: string;
  description?: string;
  presetId?: string;
  rules: CouncilRules;
  variables: CouncilVariables;
  budgets: CouncilBudgets;
  // Council-specific role flavour overrides: a compact record holding only
  // explicitly customized roles, keyed by role id. Roles absent from this
  // record use the canonical flavour text, so canonical defaults are never
  // duplicated into configurations. Override text is user-authored content:
  // it is validated structurally (known role, non-empty), but its wording is
  // the author's responsibility, like customRuleText.
  roleFlavourOverrides?: Record<string, string>;
  stages: CouncilStage[];
};

export const defaultCouncilVariables: CouncilVariables = {
  responseLength: 'standard',
  roleIntensity: 'full',
  dissent: 'balanced',
  inputMode: 'cumulative',
};

export const defaultCouncilRules: CouncilRules = {
  requireNovelContribution: false,
  requireDisagreement: false,
  forbidRepetition: false,
  labelEvidenceVsInference: false,
  preserveDissentInSynthesis: false,
  distinguishConsensusFromMinority: false,
};

export const defaultCouncilBudgets: CouncilBudgets = {
  perContributionChars: 4000,
  totalPromptChars: 12000,
};

const minPerContributionChars = 100;
const minTotalPromptChars = 500;
const maxTotalPromptChars = 100000;

const responseLengths: CouncilResponseLength[] = ['brief', 'standard', 'extended'];
const roleIntensities: CouncilRoleIntensity[] = ['light', 'full'];
const dissentLevels: CouncilDissent[] = ['collaborative', 'balanced', 'adversarial'];
const inputModes: CouncilInputMode[] = ['cumulative', 'independent'];
const inputPolicies: CouncilInputPolicy[] = [
  'original-only',
  'previous-only',
  'previous-plus-original',
  'last-n',
  'full-record',
  'independent-round',
];
const outputPolicies: CouncilOutputPolicy[] = [
  'free-response',
  'critique',
  'alternative-proposal',
  'fact-check-report',
  'synthesis',
  'recommendation',
  'final-answer',
];
const failurePolicies: CouncilFailurePolicy[] = ['halt', 'retry-once', 'skip-and-record'];

export type CouncilValidationIssue = {
  path: string;
  message: string;
};

export type CouncilValidationResult = {
  valid: boolean;
  issues: CouncilValidationIssue[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

function validateVariableOverrides(
  value: Record<string, unknown>,
  path: string,
  issues: CouncilValidationIssue[],
) {
  if ('responseLength' in value && !isOneOf(value.responseLength, responseLengths)) {
    issues.push({ path: `${path}.responseLength`, message: `Expected one of: ${responseLengths.join(', ')}.` });
  }
  if ('roleIntensity' in value && !isOneOf(value.roleIntensity, roleIntensities)) {
    issues.push({ path: `${path}.roleIntensity`, message: `Expected one of: ${roleIntensities.join(', ')}.` });
  }
  if ('dissent' in value && !isOneOf(value.dissent, dissentLevels)) {
    issues.push({ path: `${path}.dissent`, message: `Expected one of: ${dissentLevels.join(', ')}.` });
  }
  if ('inputMode' in value && !isOneOf(value.inputMode, inputModes)) {
    issues.push({ path: `${path}.inputMode`, message: `Expected one of: ${inputModes.join(', ')}.` });
  }
}

export function validateCouncilConfiguration(value: unknown): CouncilValidationResult {
  const issues: CouncilValidationIssue[] = [];

  if (!isRecord(value)) {
    return { valid: false, issues: [{ path: '', message: 'Council configuration must be an object.' }] };
  }

  if (value.schemaVersion !== councilSchemaVersion) {
    issues.push({
      path: 'schemaVersion',
      message: `Unsupported council schema version ${JSON.stringify(value.schemaVersion)}; this build supports version ${councilSchemaVersion}.`,
    });
  }

  if (!isNonEmptyString(value.id)) {
    issues.push({ path: 'id', message: 'Configuration id must be a non-empty string.' });
  }

  if (!isNonEmptyString(value.name)) {
    issues.push({ path: 'name', message: 'Configuration name must be a non-empty string.' });
  }

  if (!isRecord(value.rules)) {
    issues.push({ path: 'rules', message: 'rules must be an object.' });
  } else {
    for (const flag of Object.keys(defaultCouncilRules) as Array<keyof typeof defaultCouncilRules>) {
      if (typeof value.rules[flag] !== 'boolean') {
        issues.push({ path: `rules.${flag}`, message: 'Rule flag must be a boolean.' });
      }
    }
    if ('customRuleText' in value.rules &&
      value.rules.customRuleText !== undefined &&
      typeof value.rules.customRuleText !== 'string') {
      issues.push({ path: 'rules.customRuleText', message: 'customRuleText must be a string when provided.' });
    }
  }

  if (!isRecord(value.variables)) {
    issues.push({ path: 'variables', message: 'variables must be an object.' });
  } else {
    for (const key of ['responseLength', 'roleIntensity', 'dissent', 'inputMode']) {
      if (!(key in value.variables)) {
        issues.push({ path: `variables.${key}`, message: 'Global variable is required.' });
      }
    }
    validateVariableOverrides(value.variables, 'variables', issues);
  }

  if (!isRecord(value.budgets)) {
    issues.push({ path: 'budgets', message: 'budgets must be an object.' });
  } else {
    const per = value.budgets.perContributionChars;
    const total = value.budgets.totalPromptChars;

    if (typeof per !== 'number' || !Number.isInteger(per) || per < minPerContributionChars) {
      issues.push({
        path: 'budgets.perContributionChars',
        message: `perContributionChars must be an integer of at least ${minPerContributionChars}.`,
      });
    }
    if (typeof total !== 'number' || !Number.isInteger(total) || total < minTotalPromptChars || total > maxTotalPromptChars) {
      issues.push({
        path: 'budgets.totalPromptChars',
        message: `totalPromptChars must be an integer between ${minTotalPromptChars} and ${maxTotalPromptChars}.`,
      });
    }
    if (typeof per === 'number' && typeof total === 'number' && per > total) {
      issues.push({
        path: 'budgets',
        message: 'perContributionChars must not exceed totalPromptChars.',
      });
    }
  }

  if (value.roleFlavourOverrides !== undefined) {
    if (!isRecord(value.roleFlavourOverrides)) {
      issues.push({ path: 'roleFlavourOverrides', message: 'roleFlavourOverrides must be an object when provided.' });
    } else {
      for (const [roleId, text] of Object.entries(value.roleFlavourOverrides)) {
        if (!getCouncilRole(roleId)) {
          issues.push({
            path: `roleFlavourOverrides.${roleId}`,
            message: `Unknown role ${JSON.stringify(roleId)}; overrides must reference role library ids.`,
          });
        }

        if (!isNonEmptyString(text)) {
          issues.push({
            path: `roleFlavourOverrides.${roleId}`,
            message: 'Override flavour text must be a non-empty string.',
          });
        }
      }
    }
  }

  if (!Array.isArray(value.stages) || value.stages.length === 0) {
    issues.push({ path: 'stages', message: 'At least one stage is required.' });
  } else {
    const seenStageIds = new Set<string>();

    value.stages.forEach((stage, index) => {
      const path = `stages[${index}]`;

      if (!isRecord(stage)) {
        issues.push({ path, message: 'Stage must be an object.' });
        return;
      }

      if (!isNonEmptyString(stage.id)) {
        issues.push({ path: `${path}.id`, message: 'Stage id must be a non-empty string.' });
      } else if (seenStageIds.has(stage.id)) {
        issues.push({ path: `${path}.id`, message: `Duplicate stage id "${stage.id}".` });
      } else {
        seenStageIds.add(stage.id);
      }

      if (!isNonEmptyString(stage.provider) || !getCouncilProvider(stage.provider)) {
        issues.push({
          path: `${path}.provider`,
          message: `Unknown provider ${JSON.stringify(stage.provider)}; must be a canonical provider id.`,
        });
      }

      if (!isNonEmptyString(stage.role) || !getCouncilRole(stage.role)) {
        issues.push({
          path: `${path}.role`,
          message: `Unknown role ${JSON.stringify(stage.role)}; must be a role library id.`,
        });
      }

      if (!isOneOf(stage.inputPolicy, inputPolicies)) {
        issues.push({ path: `${path}.inputPolicy`, message: `Expected one of: ${inputPolicies.join(', ')}.` });
      } else if (stage.inputPolicy === 'last-n') {
        if (typeof stage.inputPolicyN !== 'number' || !Number.isInteger(stage.inputPolicyN) || stage.inputPolicyN < 1) {
          issues.push({ path: `${path}.inputPolicyN`, message: 'last-n requires inputPolicyN to be a positive integer.' });
        }
      } else if (stage.inputPolicyN !== undefined) {
        issues.push({ path: `${path}.inputPolicyN`, message: 'inputPolicyN is only valid with the last-n input policy.' });
      }

      if (stage.outputPolicy !== undefined && !isOneOf(stage.outputPolicy, outputPolicies)) {
        issues.push({ path: `${path}.outputPolicy`, message: `Expected one of: ${outputPolicies.join(', ')}.` });
      }

      if (stage.variableOverrides !== undefined) {
        if (!isRecord(stage.variableOverrides)) {
          issues.push({ path: `${path}.variableOverrides`, message: 'variableOverrides must be an object.' });
        } else {
          validateVariableOverrides(stage.variableOverrides, `${path}.variableOverrides`, issues);
        }
      }

      if (!isOneOf(stage.failurePolicy, failurePolicies)) {
        issues.push({ path: `${path}.failurePolicy`, message: `Expected one of: ${failurePolicies.join(', ')}.` });
      }

      if (stage.round !== undefined && !isNonEmptyString(stage.round)) {
        issues.push({ path: `${path}.round`, message: 'round must be a non-empty string when provided.' });
      }
    });
  }

  return { valid: issues.length === 0, issues };
}
