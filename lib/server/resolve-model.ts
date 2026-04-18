/**
 * Shared model resolution utilities for API routes.
 *
 * Post-BYOK-purge: clients never supply keys or base URLs. All resolution
 * flows through serverConfig + provider-config.ts YAML/env. Callers pass
 * only the model string (and optional providerType hint).
 */

import type { NextRequest } from 'next/server';
import { getModel, parseModelString, type ModelWithInfo } from '@/lib/ai/providers';
import { resolveApiKey, resolveBaseUrl, resolveProxy } from '@/lib/server/provider-config';

export interface ResolvedModel extends ModelWithInfo {
  /** Original model string (e.g. "openai/gpt-4o-mini") */
  modelString: string;
  /** Resolved provider ID (e.g. "openai", "ollama") */
  providerId: string;
  /** Effective API key after server-side resolution */
  apiKey: string;
}

/**
 * Resolve a language model from a model string.
 *
 * Accepts only the model string and optional providerType hint. Key and base
 * URL are always resolved server-side via serverConfig / provider-config YAML.
 */
export function resolveModel(params: {
  modelString?: string;
  providerType?: string;
}): ResolvedModel {
  const modelString = params.modelString || process.env.DEFAULT_MODEL || 'gpt-4o-mini';
  const { providerId, modelId } = parseModelString(modelString);

  const apiKey = resolveApiKey(providerId);
  const baseUrl = resolveBaseUrl(providerId);
  const proxy = resolveProxy(providerId);
  const { model, modelInfo } = getModel({
    providerId,
    modelId,
    apiKey,
    baseUrl,
    proxy,
    providerType: params.providerType as 'openai' | 'anthropic' | 'google' | undefined,
  });

  return { model, modelInfo, modelString, providerId, apiKey };
}

/**
 * Resolve a language model from standard request headers.
 *
 * Reads only model routing hints from headers. Keys never flow through
 * client-controlled headers post-BYOK-purge.
 */
export function resolveModelFromHeaders(req: NextRequest): ResolvedModel {
  return resolveModel({
    modelString: req.headers.get('x-model') || undefined,
    providerType: req.headers.get('x-provider-type') || undefined,
  });
}
