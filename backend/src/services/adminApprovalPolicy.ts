import { config } from '../config.js';
import type { ContentType } from '../types.js';

import type { AdminApprovalActionType } from './adminApprovals.js';

export type AdminApprovalRisk = 'low' | 'medium' | 'high' | 'critical';

export interface AdminApprovalPolicyRule {
  enabled: boolean;
  risk: AdminApprovalRisk;
  bypassRoles: string[];
  minTargets: number;
  contentTypes?: ContentType[];
}

type PolicyMatrix = Record<AdminApprovalActionType, AdminApprovalPolicyRule>;

const DEFAULT_POLICY_MATRIX = (): PolicyMatrix => {
  const enabledByDefault = config.adminDualApprovalRequired;
  return {
    announcement_publish: {
      enabled: enabledByDefault,
      risk: 'high',
      bypassRoles: [],
      minTargets: 1,
    },
    announcement_bulk_publish: {
      enabled: enabledByDefault,
      risk: 'critical',
      bypassRoles: [],
      minTargets: 1,
    },
    announcement_delete: {
      enabled: enabledByDefault,
      risk: 'critical',
      bypassRoles: [],
      minTargets: 1,
    },
  };
};

const isApprovalRisk = (value: unknown): value is AdminApprovalRisk => {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'critical';
};

const parseContentTypes = (value: unknown): ContentType[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const allowed = new Set<ContentType>(['job', 'result', 'admit-card', 'syllabus', 'answer-key', 'admission']);
  const types = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry): entry is ContentType => allowed.has(entry as ContentType));
  return types.length > 0 ? types : undefined;
};

const buildPolicyMatrix = (): PolicyMatrix => {
  const defaults = DEFAULT_POLICY_MATRIX();
  const overrides = config.adminApprovalPolicyMatrix;

  (Object.keys(defaults) as AdminApprovalActionType[]).forEach((actionType) => {
    const raw = overrides?.[actionType];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;

    const nextRule = { ...defaults[actionType] };
    if (typeof raw.enabled === 'boolean') {
      nextRule.enabled = raw.enabled;
    }
    if (isApprovalRisk(raw.risk)) {
      nextRule.risk = raw.risk;
    }
    if (Array.isArray(raw.bypassRoles)) {
      nextRule.bypassRoles = raw.bypassRoles.filter((entry: unknown): entry is string => typeof entry === 'string');
    }
    if (typeof raw.minTargets === 'number' && Number.isFinite(raw.minTargets)) {
      nextRule.minTargets = Math.max(1, Math.floor(raw.minTargets));
    }
    const contentTypes = parseContentTypes(raw.contentTypes);
    if (contentTypes) {
      nextRule.contentTypes = contentTypes;
    }

    defaults[actionType] = nextRule;
  });

  return defaults;
};

const policyMatrix = buildPolicyMatrix();

const extractPayloadContentTypes = (payload?: Record<string, any>): ContentType[] => {
  if (!payload) return [];
  const direct = typeof payload.type === 'string' ? [payload.type] : [];
  const list = Array.isArray(payload.types)
    ? payload.types.filter((entry): entry is string => typeof entry === 'string')
    : [];
  return [...direct, ...list] as ContentType[];
};

export const getAdminApprovalPolicyMatrix = (): PolicyMatrix => ({ ...policyMatrix });

export const evaluateAdminApprovalRequirement = (input: {
  actionType: AdminApprovalActionType;
  actorRole?: string;
  targetIds: string[];
  payload?: Record<string, any>;
}): { required: boolean; risk: AdminApprovalRisk; reason: string; rule: AdminApprovalPolicyRule } => {
  const rule = policyMatrix[input.actionType];
  if (!rule) {
    return {
      required: false,
      risk: 'low',
      reason: 'policy_not_found',
      rule: {
        enabled: false,
        risk: 'low',
        bypassRoles: [],
        minTargets: 1,
      },
    };
  }
  if (!rule.enabled) {
    return { required: false, risk: rule.risk, reason: 'policy_disabled', rule };
  }
  if (input.actorRole && rule.bypassRoles.includes(input.actorRole)) {
    return { required: false, risk: rule.risk, reason: 'role_bypassed', rule };
  }
  if (input.targetIds.length < rule.minTargets) {
    return { required: false, risk: rule.risk, reason: 'target_threshold_not_met', rule };
  }
  if (rule.contentTypes?.length) {
    const contentTypes = extractPayloadContentTypes(input.payload);
    if (!contentTypes.some((type) => rule.contentTypes?.includes(type))) {
      return { required: false, risk: rule.risk, reason: 'content_type_not_matched', rule };
    }
  }
  return { required: true, risk: rule.risk, reason: 'approval_required', rule };
};
