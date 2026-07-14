// Deterministic assertions for the canonical six cognitive stats.
//
// Covers the stat vocabulary and levels, provider/Calling/seat data,
// resolution precedence, the deterministic instruction catalog, sparse
// guidance injection, mechanical Memory exposure versus input-policy
// eligibility, the responseLength/dissent migration, the approved Doctrine
// choreography overrides, and exact prompt snapshots. Pure shared code only:
// no browser, no Runner service, no network.

import {
  callingFlavourTexts,
  cognitiveInstructionCatalog,
  cognitiveStatKeys,
  composeStagePrompt,
  contributionTruncationNotice,
  councilCallings,
  councilProviders,
  councilSchemaVersion,
  defaultCouncilBudgets,
  defaultCouncilRules,
  defaultCouncilVariables,
  getCouncilCalling,
  getCouncilDoctrine,
  isCognitiveStatLevel,
  memoryExposureByLevel,
  neutralCognitiveStatLevel,
  neutralCognitiveStats,
  proseCognitiveStatKeys,
  providerCognitiveDefaults,
  providerFacingInstructionCatalog,
  renderCognitiveGuidance,
  resolveCognitiveStats,
  validateCouncilConfiguration,
  type CognitiveStatLevel,
  type CognitiveStats,
  type CouncilConfiguration,
  type CouncilContribution,
  type CouncilStage,
} from '../../shared/council/index.js';

let failureCount = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`PASS: ${label}`);
    return;
  }

  failureCount += 1;
  console.error(`FAIL: ${label}`);

  if (detail) {
    console.error(`  ${detail}`);
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const key of Object.getOwnPropertyNames(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }

  return value;
}

function contribution(stageId: string, callingId: string, providerId: string, text: string): CouncilContribution {
  return { stageId, calling: callingId, provider: providerId, text };
}

function makeStage(overrides: Partial<CouncilStage> & Pick<CouncilStage, 'id'>): CouncilStage {
  return {
    provider: 'chatgpt',
    calling: 'inquisitor',
    inputPolicy: 'full-record',
    failurePolicy: 'halt',
    ...overrides,
  };
}

function makeConfiguration(
  stages: CouncilStage[],
  extra: Partial<CouncilConfiguration> = {},
): CouncilConfiguration {
  return {
    schemaVersion: councilSchemaVersion,
    id: 'cognitive-test-council',
    name: 'Cognitive Test Council',
    rules: { ...defaultCouncilRules },
    variables: { ...defaultCouncilVariables },
    budgets: { ...defaultCouncilBudgets },
    stages,
    ...extra,
  };
}

const request = 'Compare two options for the weekly summary format and recommend one.';

function compose(stage: CouncilStage, priors: CouncilContribution[], extra: Partial<CouncilConfiguration> = {}) {
  return composeStagePrompt({
    configuration: makeConfiguration([stage], extra),
    stage,
    request,
    priorContributions: priors,
  });
}

// =========================================================================
// Schema and vocabulary
// =========================================================================
{
  assert(
    cognitiveStatKeys.length === 6 &&
    cognitiveStatKeys.join(',') === 'temperament,voice,conviction,dissent,depth,memory',
    'exactly six cognitive stat keys in canonical order',
    cognitiveStatKeys.join(','),
  );
  assert(
    ([0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const).every((level) => isCognitiveStatLevel(level)),
    'CognitiveStatLevel accepts exactly the ten integer levels 0-9',
  );
  assert(
    [-1, 10, 2.5, Number.NaN, '5', null, undefined, true].every((value) => !isCognitiveStatLevel(value)),
    'negatives, 10+, fractions, NaN, strings, and non-numbers are rejected as levels',
  );
  assert(neutralCognitiveStatLevel === 5, 'level 5 is the canonical neutral');
  assert(
    cognitiveStatKeys.every((key) => neutralCognitiveStats[key] === 5) &&
    Object.keys(neutralCognitiveStats).length === 6,
    'the system-neutral default is 5 on all six stats',
  );

  const validSeat = validateCouncilConfiguration(
    makeConfiguration([makeStage({ id: 's1', cognitiveOverrides: { memory: 0, dissent: 9 } })]),
  );
  assert(validSeat.valid, 'a stage with a partial cognitive override validates', JSON.stringify(validSeat.issues));

  const badLevels: unknown[] = [-1, 10, 2.5, Number.NaN, '5'];
  assert(
    badLevels.every((level) => {
      const result = validateCouncilConfiguration(
        makeConfiguration([makeStage({ id: 's1', cognitiveOverrides: { depth: level as CognitiveStatLevel } })]),
      );
      return !result.valid && result.issues.some((issue) => issue.path === 'stages[0].cognitiveOverrides.depth');
    }),
    'the validator rejects negative, 10+, fractional, NaN, and string levels',
  );
  const unknownKey = validateCouncilConfiguration(
    makeConfiguration([makeStage({ id: 's1', cognitiveOverrides: { temperature: 7 } as never })]),
  );
  assert(
    !unknownKey.valid && unknownKey.issues.some((issue) => issue.path === 'stages[0].cognitiveOverrides.temperature'),
    'the validator rejects unknown cognitive stat keys (closed object)',
  );

  assert(
    Object.values(providerCognitiveDefaults).every((defaults) =>
      cognitiveStatKeys.every((key) => isCognitiveStatLevel(defaults[key])) &&
      Object.keys(defaults).length === 6),
    'every provider cognitive default is complete across all six stats',
  );
  assert(
    councilCallings.every((calling) =>
      calling.cognitiveDefaults === undefined ||
      Object.entries(calling.cognitiveDefaults).every(([key, level]) =>
        (cognitiveStatKeys as readonly string[]).includes(key) && isCognitiveStatLevel(level))),
    'Calling cognitive defaults use only canonical keys and valid levels',
  );
  assert(
    councilCallings.every((calling) => Object.keys(calling.cognitiveDefaults ?? {}).length < 6),
    'Calling cognitive defaults are partial: no Calling populates all six dimensions',
  );
}

// =========================================================================
// Provider defaults (approved first calibration)
// =========================================================================
{
  const approved: Record<string, CognitiveStats> = {
    chatgpt: { temperament: 5, voice: 5, conviction: 5, dissent: 5, depth: 7, memory: 5 },
    claude: { temperament: 4, voice: 7, conviction: 4, dissent: 5, depth: 9, memory: 7 },
    gemini: { temperament: 7, voice: 7, conviction: 5, dissent: 4, depth: 7, memory: 7 },
    grok: { temperament: 9, voice: 5, conviction: 7, dissent: 9, depth: 5, memory: 5 },
    deepseek: { temperament: 4, voice: 5, conviction: 7, dissent: 5, depth: 9, memory: 5 },
    copilot: { temperament: 4, voice: 5, conviction: 5, dissent: 4, depth: 5, memory: 5 },
    perplexity: { temperament: 0, voice: 5, conviction: 5, dissent: 5, depth: 7, memory: 5 },
    reka: { temperament: 5, voice: 5, conviction: 4, dissent: 4, depth: 5, memory: 7 },
  };

  assert(
    Object.entries(approved).every(([providerId, expected]) =>
      JSON.stringify(providerCognitiveDefaults[providerId]) === JSON.stringify(expected)),
    'all eight approved AI engines carry their exact approved cognitive defaults',
  );
  assert(
    JSON.stringify(providerCognitiveDefaults.google) === JSON.stringify(neutralCognitiveStats),
    'Google explicitly uses neutral cognitive defaults (outside the eight-engine calibration)',
  );
  assert(
    councilProviders.every((provider) => providerCognitiveDefaults[provider.id] !== undefined),
    'every canonical provider has a cognitive default entry',
  );
}

// =========================================================================
// Resolution precedence: seat > Calling > provider > neutral
// =========================================================================
{
  assert(
    JSON.stringify(resolveCognitiveStats('no-such-provider', 'no-such-calling')) ===
    JSON.stringify(neutralCognitiveStats),
    'with no provider, Calling, or seat data, resolution is neutral 5s',
  );
  assert(
    JSON.stringify(resolveCognitiveStats('chatgpt', 'no-such-calling')) ===
    JSON.stringify({ ...neutralCognitiveStats, depth: 7 }),
    'provider defaults override neutral',
  );

  const claudeInquisitor = resolveCognitiveStats('claude', 'inquisitor');
  assert(
    claudeInquisitor.dissent === 9 && claudeInquisitor.depth === 8,
    'Calling defaults override provider defaults (Inquisitor dissent 9 and depth 8 over Claude)',
    JSON.stringify(claudeInquisitor),
  );
  assert(
    claudeInquisitor.voice === 7 && claudeInquisitor.temperament === 4 && claudeInquisitor.memory === 7,
    'dimensions without a Calling override preserve the provider value',
  );

  const seatOverridden = resolveCognitiveStats('claude', 'inquisitor', { dissent: 3, memory: 0 });
  assert(
    seatOverridden.dissent === 3 && seatOverridden.memory === 0,
    'Formation seat overrides take precedence over Calling and provider',
  );
  assert(
    seatOverridden.depth === 8 && seatOverridden.voice === 7,
    'dimensions without a seat override preserve the Calling/provider resolution',
  );
  assert(
    JSON.stringify(resolveCognitiveStats('claude', 'inquisitor', { dissent: 3 })) ===
    JSON.stringify(resolveCognitiveStats('claude', 'inquisitor', { dissent: 3 })),
    'resolution is deterministic',
  );

  const frozenOverrides = deepFreeze({ dissent: 2 as CognitiveStatLevel });
  const callingBefore = JSON.stringify(getCouncilCalling('inquisitor')!.cognitiveDefaults);
  resolveCognitiveStats('claude', 'inquisitor', frozenOverrides);
  assert(
    JSON.stringify(getCouncilCalling('inquisitor')!.cognitiveDefaults) === callingBefore &&
    frozenOverrides.dissent === 2,
    'resolution does not mutate its inputs',
  );

  // Suggested AI never participates: Sage suggests Claude (temperament 4),
  // but a Gemini seat resolves Gemini's temperament 7.
  assert(
    getCouncilCalling('sage')!.suggestedProvider === 'claude' &&
    resolveCognitiveStats('gemini', 'sage').temperament === 7,
    'Suggested AI is never resolved into cognitive stats; the assigned seat provider is authoritative',
  );
}

// =========================================================================
// Deterministic instruction catalog
// =========================================================================
{
  const lockedExtremes: Record<string, [string, string]> = {
    temperament: [
      'Prefer the most literal, constrained, and evidence-bound interpretation. Avoid speculative expansion unless it is necessary to answer the question.',
      'Push strongly beyond conventional interpretations. Explore bold, unusual, associative, and highly imaginative possibilities wherever they may reveal useful directions.',
    ],
    voice: [
      'State only the essential answer. Use the fewest words practical.',
      'Fully elaborate the contribution wherever meaningful substance exists. Explore details, nuance, implications, qualifications, and supporting reasoning extensively.',
    ],
    conviction: [
      'Treat every emerging conclusion as highly provisional. Readily revise or abandon it when another contribution offers useful evidence or reasoning.',
      'Commit strongly to the position you judge best supported and defend it rigorously. Revise only when competing reasoning materially defeats the case.',
    ],
    dissent: [
      'Prioritize harmony, constructive extension, and reconciliation. Seek compatible interpretations before emphasizing disagreement.',
      'Relentlessly search for substantive disagreement, weak assumptions, counterarguments, and failure points. Prioritize rigorous challenge over harmony.',
    ],
    depth: [
      'Identify the most consequential point quickly and avoid secondary analysis.',
      'Examine the problem exhaustively where useful. Trace assumptions, edge cases, interactions, downstream consequences, competing interpretations, and second-order effects in depth.',
    ],
  };

  assert(
    proseCognitiveStatKeys.join(',') === 'temperament,voice,conviction,dissent,depth',
    'the five prose-driven stats are catalogued in canonical order (Memory is mechanical)',
  );

  for (const stat of proseCognitiveStatKeys) {
    const entries = cognitiveInstructionCatalog[stat];
    assert(entries.length === 10, `${stat} catalog has exactly ten level entries`);
    assert(entries[5] === '', `${stat} level 5 emits no instruction`);
    assert(
      entries.every((text, level) => level === 5 || text.trim().length > 0),
      `${stat} emits non-empty deterministic text at every non-neutral level`,
    );
    assert(
      entries[0] === lockedExtremes[stat][0] && entries[9] === lockedExtremes[stat][9 - 8],
      `${stat} levels 0 and 9 match the exact locked wording`,
    );
    assert(
      !entries.some((text) => /\b\d+ out of \d+\b|=\s*\d/.test(text)),
      `${stat} instructions never interpolate raw stat numbers`,
    );
  }
}

// =========================================================================
// Sparse guidance injection
// =========================================================================
{
  const allNeutralOverride = { temperament: 5, voice: 5, conviction: 5, dissent: 5, depth: 5, memory: 5 } as const;

  assert(renderCognitiveGuidance({ ...neutralCognitiveStats }) === '', 'all-neutral stats render no guidance at all');
  assert(
    renderCognitiveGuidance({ ...neutralCognitiveStats, memory: 0 }) === '',
    'Memory alone never emits prose (its effect is mechanical)',
  );
  assert(
    renderCognitiveGuidance({ ...neutralCognitiveStats, voice: 3 }) ===
    'Cognitive guidance:\n- Favor brevity and focus tightly on the main points.',
    'one non-neutral stat emits exactly one instruction line',
  );

  const three = renderCognitiveGuidance({ ...neutralCognitiveStats, voice: 3, dissent: 8, depth: 8 });
  assert(
    three.split('\n').filter((line) => line.startsWith('- ')).length === 3 &&
    three.indexOf('brevity') < three.indexOf('adversarial examination') &&
    three.indexOf('adversarial examination') < three.indexOf('deep analysis'),
    'three non-neutral stats emit exactly three instructions in canonical stat order',
  );

  // Composition: a fully neutralized seat produces no guidance section.
  const neutralComposed = compose(
    makeStage({ id: 's1', provider: 'google', calling: 'sage', inputPolicy: 'original-only', cognitiveOverrides: { ...allNeutralOverride } }),
    [],
  );
  assert(
    !neutralComposed.prompt.includes('Cognitive guidance:'),
    'a neutral-resolved seat composes without any cognitive guidance section (no filler text)',
  );

  // Guidance stays a separate layer from Calling flavour text.
  const guided = compose(
    makeStage({ id: 's1', provider: 'google', calling: 'sage', inputPolicy: 'original-only' }),
    [],
  );
  assert(
    guided.prompt.includes(callingFlavourTexts.sage) &&
    guided.prompt.includes('Cognitive guidance:') &&
    guided.prompt.indexOf(callingFlavourTexts.sage) < guided.prompt.indexOf('Cognitive guidance:'),
    'cognitive guidance renders as its own section after Calling flavour text',
  );
  assert(
    Object.values(callingFlavourTexts).every((text) => !text.includes('Cognitive guidance:')),
    'canonical Calling flavour text storage contains no cognitive-stat wording',
  );
}

// =========================================================================
// Memory: mechanical exposure of input-policy-eligible material
// =========================================================================
{
  const priors = Array.from({ length: 8 }, (_, index) =>
    contribution(`c${index + 1}`, 'sage', 'claude', `Contribution number ${index + 1}.`));

  const withMemory = (memory: CognitiveStatLevel, policy: CouncilStage['inputPolicy'] = 'full-record', n?: number) =>
    compose(
      makeStage({
        id: 's1',
        inputPolicy: policy,
        ...(n !== undefined ? { inputPolicyN: n } : {}),
        cognitiveOverrides: { memory },
      }),
      priors,
    );

  const expectedByLevel: Array<[CognitiveStatLevel, string]> = [
    [0, ''],
    [1, 'c8'],
    [2, 'c8'],
    [3, 'c8'],
    [4, 'c7,c8'],
    [5, 'c1,c2,c3,c4,c5,c6,c7,c8'],
    [6, 'c6,c7,c8'],
    [7, 'c5,c6,c7,c8'],
    [8, 'c3,c4,c5,c6,c7,c8'],
    [9, 'c1,c2,c3,c4,c5,c6,c7,c8'],
  ];

  for (const [level, expected] of expectedByLevel) {
    const composed = withMemory(level);
    assert(
      composed.memorySelectedContributionIds.join(',') === expected,
      `Memory ${level} exposes exactly [${expected || 'nothing'}] from full-record eligibility`,
      composed.memorySelectedContributionIds.join(','),
    );
  }

  assert(
    !withMemory(0).prompt.includes('CONTRIBUTION FROM'),
    'Memory 0 composes zero prior contributions into the prompt',
  );
  assert(
    withMemory(5).prompt === withMemory(9).prompt,
    'Memory 9 exposes all eligible contributions: identical to neutral for current input policies',
  );
  assert(
    withMemory(5).eligibleContributionIds.join(',') === 'c1,c2,c3,c4,c5,c6,c7,c8' &&
    withMemory(5).includedContributionIds.join(',') === 'c1,c2,c3,c4,c5,c6,c7,c8',
    'Memory 5 preserves the input policy selection exactly (full-record regression)',
  );

  // Memory 5 pass-through equals legacy behavior for every input policy.
  const legacyExpectations: Array<[CouncilStage['inputPolicy'], number | undefined, string, boolean]> = [
    ['original-only', undefined, '', true],
    ['previous-only', undefined, 'c8', false],
    ['previous-plus-original', undefined, 'c8', true],
    ['last-n', 3, 'c6,c7,c8', true],
    ['full-record', undefined, 'c1,c2,c3,c4,c5,c6,c7,c8', true],
    ['independent-round', undefined, '', true],
  ];

  for (const [policy, n, expectedIds, includesRequest] of legacyExpectations) {
    const composed = withMemory(5, policy, n);
    assert(
      composed.memorySelectedContributionIds.join(',') === expectedIds &&
      composed.includedContributionIds.join(',') === expectedIds &&
      composed.prompt.includes('--- ORIGINAL USER REQUEST ---') === includesRequest,
      `Memory 5 preserves pre-cognitive ${policy} behavior exactly`,
      composed.memorySelectedContributionIds.join(','),
    );
  }

  // Memory never expands eligibility beyond the input policy.
  assert(
    withMemory(9, 'previous-only').memorySelectedContributionIds.join(',') === 'c8' &&
    !withMemory(9, 'previous-only').prompt.includes('--- ORIGINAL USER REQUEST ---'),
    'previous-only still maxes at one contribution at Memory 9, and request inclusion stays policy-owned',
  );
  assert(
    withMemory(9, 'previous-plus-original').memorySelectedContributionIds.join(',') === 'c8',
    'previous-plus-original cannot expose more than its eligible set even at Memory 9',
  );
  assert(
    withMemory(9, 'last-n', 2).memorySelectedContributionIds.join(',') === 'c7,c8' &&
    withMemory(7, 'last-n', 2).memorySelectedContributionIds.join(',') === 'c7,c8',
    'last-n still maxes at N regardless of a larger Memory allowance',
  );
  assert(
    ([0, 5, 9] as const).every((level) =>
      withMemory(level, 'independent-round').memorySelectedContributionIds.length === 0),
    'independent-round exposes zero prior contributions at every Memory level',
  );

  // Tightened per-contribution caps at Memory 1-3.
  const longText = 'A'.repeat(3000);
  const longPrior = [contribution('long-1', 'sage', 'claude', longText)];
  const capComposed = (memory: CognitiveStatLevel) =>
    compose(makeStage({ id: 's1', cognitiveOverrides: { memory } }), longPrior);

  const quarter = capComposed(1);
  assert(
    quarter.truncatedContributionIds.join(',') === 'long-1' &&
    quarter.prompt.includes(contributionTruncationNotice) &&
    !quarter.prompt.includes('A'.repeat(1001)) &&
    quarter.prompt.includes('A'.repeat(900)),
    'Memory 1 caps the newest eligible contribution to a quarter of perContributionChars',
  );
  const half = capComposed(2);
  assert(
    half.truncatedContributionIds.join(',') === 'long-1' &&
    !half.prompt.includes('A'.repeat(2001)) &&
    half.prompt.includes('A'.repeat(1900)),
    'Memory 2 caps the newest eligible contribution to half of perContributionChars',
  );
  const normalCap = capComposed(3);
  assert(
    normalCap.truncatedContributionIds.length === 0 && normalCap.prompt.includes(longText),
    'Memory 3 exposes the newest eligible contribution at the normal per-contribution cap',
  );

  // Budget guarantees remain intact after Memory filtering.
  const tightStage = makeStage({ id: 's1', cognitiveOverrides: { memory: 8 } });
  const tight = composeStagePrompt({
    configuration: makeConfiguration([tightStage], { budgets: { perContributionChars: 200, totalPromptChars: 2200 } }),
    stage: tightStage,
    request,
    priorContributions: Array.from({ length: 8 }, (_, index) =>
      contribution(`c${index + 1}`, 'sage', 'claude', 'B'.repeat(500))),
  });
  assert(
    tight.prompt.length <= 2200 &&
    tight.memorySelectedContributionIds.length === 6 &&
    tight.includedContributionIds.length < 6,
    'total-budget and truncation guarantees hold after Memory filtering (oldest exposed drop first)',
    `len=${tight.prompt.length} selected=${tight.memorySelectedContributionIds.length} included=${tight.includedContributionIds.length}`,
  );
}

// =========================================================================
// Migration: Voice supersedes responseLength; ten-level Dissent supersedes
// the three-level variable; Calling intensity stays independent
// =========================================================================
{
  assert(
    JSON.stringify(Object.keys(defaultCouncilVariables)) === JSON.stringify(['roleIntensity', 'inputMode']),
    'responseLength and three-level dissent are no longer council variables',
  );

  const legacySentences = [
    'Keep your response brief: a short paragraph or a compact list.',
    'Use a moderate response length: cover the essentials without padding.',
    'A longer, more detailed response is welcome where the substance justifies it.',
    'Favor building on the prior material constructively where it holds up.',
    'Balance building on the prior material with honest challenge where it is weak.',
    'Actively challenge the prior material; prioritize finding weaknesses over agreement.',
  ];
  assert(
    legacySentences.every((sentence) => !providerFacingInstructionCatalog.includes(sentence)),
    'no legacy responseLength or three-level dissent sentence survives in the instruction catalog',
  );

  // Calling intensity remains a separate mechanism: light framing plus
  // non-neutral cognitive guidance coexist in one prompt.
  const lightStage = makeStage({
    id: 's1',
    provider: 'claude',
    calling: 'inquisitor',
    inputPolicy: 'original-only',
    variableOverrides: { roleIntensity: 'light' },
  });
  const lightComposed = compose(lightStage, []);
  assert(
    lightComposed.prompt.includes('Approach this from the perspective of a Skeptic / Critical Reviewer.') &&
    !lightComposed.prompt.includes('have not yet earned acceptance') &&
    lightComposed.prompt.includes('Cognitive guidance:'),
    'Calling intensity (light vs full flavour) remains independent of cognitive stats',
  );
}

// =========================================================================
// Approved Doctrine choreography overrides
// =========================================================================
{
  const resolvedFor = (stage: CouncilStage) =>
    resolveCognitiveStats(stage.provider, stage.calling, stage.cognitiveOverrides);

  const dreamLab = getCouncilDoctrine('dream-lab')!.build();
  assert(
    dreamLab.stages[2].calling === 'wild-mage' &&
    JSON.stringify(dreamLab.stages[2].cognitiveOverrides) === JSON.stringify({ temperament: 9 }) &&
    resolvedFor(dreamLab.stages[2]).temperament === 9,
    'Dream Lab first Wild Mage resolves temperament 9',
  );
  assert(
    dreamLab.stages[3].calling === 'wild-mage' &&
    JSON.stringify(dreamLab.stages[3].cognitiveOverrides) === JSON.stringify({ temperament: 9, memory: 9 }) &&
    resolvedFor(dreamLab.stages[3]).temperament === 9 &&
    resolvedFor(dreamLab.stages[3]).memory === 9,
    'Dream Lab second Wild Mage resolves temperament 9 and memory 9',
  );
  assert(
    resolvedFor(dreamLab.stages[2]).memory === 5 &&
    dreamLab.stages.every((stage, index) => index === 2 || index === 3 || stage.cognitiveOverrides === undefined),
    'only the second Wild Mage carries the memory 9 override; no other Dream Lab seat is stat-tuned',
  );

  const trialByFire = getCouncilDoctrine('trial-by-fire')!.build();
  assert(
    trialByFire.stages[4].calling === 'saboteur' &&
    resolvedFor(trialByFire.stages[4]).memory === 9 &&
    resolvedFor(trialByFire.stages[4]).dissent === 9,
    'Trial by Fire second Saboteur resolves memory 9 and dissent 9',
  );
  assert(
    trialByFire.stages[2].calling === 'saboteur' &&
    trialByFire.stages[2].cognitiveOverrides === undefined &&
    resolvedFor(trialByFire.stages[2]).memory === 5,
    'only the second Saboteur carries the Memory override (repeated Callings are not blanket-tuned)',
  );

  const oraclesTable = getCouncilDoctrine('oracles-table')!.build();
  assert(
    oraclesTable.stages[4].calling === 'oracle' &&
    oraclesTable.stages[3].calling === 'oracle' &&
    oraclesTable.stages[3].cognitiveOverrides === undefined &&
    resolvedFor(oraclesTable.stages[4]).memory === 9 &&
    resolvedFor(oraclesTable.stages[4]).depth === 9,
    "Oracle's Table second Oracle resolves memory 9 and depth 9 (first Oracle untouched)",
  );

  const socratic = getCouncilDoctrine('socratic-circle')!.build();
  assert(
    socratic.stages[1].calling === 'sage' &&
    socratic.stages[0].cognitiveOverrides === undefined &&
    resolvedFor(socratic.stages[1]).memory === 9 &&
    resolvedFor(socratic.stages[1]).depth === 9,
    'Socratic Circle second Sage resolves memory 9 and depth 9 (first Sage untouched)',
  );

  for (const size of [4, 12]) {
    const crown = getCouncilDoctrine('crown-council')!.build({ size });
    assert(
      crown.stages.every((stage) =>
        JSON.stringify(stage.cognitiveOverrides) === JSON.stringify({ memory: 0 }) &&
        resolvedFor(stage).memory === 0),
      `every Crown Council seat (size ${size}) resolves memory 0, overriding any provider default`,
    );
  }

  assert(
    councilDoctrinesAllValid(),
    'every Doctrine still builds a schema-valid configuration with cognitive overrides present',
  );

  function councilDoctrinesAllValid(): boolean {
    return ['dream-lab', 'trial-by-fire', 'oracles-table', 'socratic-circle', 'crown-council']
      .every((id) => validateCouncilConfiguration(getCouncilDoctrine(id)!.build()).valid);
  }
}

// =========================================================================
// Exact prompt snapshots
// =========================================================================
{
  // Sparse snapshot: Google (neutral provider) + Sage with its two Calling
  // defaults neutralized by the seat -> fully neutral resolution, so the
  // prompt carries no cognitive guidance section at all.
  const sparseStage = makeStage({
    id: 's1',
    provider: 'google',
    calling: 'sage',
    inputPolicy: 'original-only',
    cognitiveOverrides: { conviction: 5, depth: 5 },
  });
  const sparse = compose(sparseStage, []);
  const sparseExpected = [
    'You are one participant in a structured multi-participant review council, acting as its Clarifier / Socratic Examiner.',
    '',
    callingFlavourTexts.sage,
    '',
    'Treat this as one step in a running discussion and build on what came before.',
    '',
    'Respond in whatever form best serves the request.',
    '',
    '--- ORIGINAL USER REQUEST ---',
    request,
    '--- END ORIGINAL USER REQUEST ---',
  ].join('\n');

  assert(
    sparse.prompt === sparseExpected,
    'snapshot: a neutral-resolved seat composes the exact sparse prompt with no guidance section',
    `got:\n${sparse.prompt}`,
  );
  assert(
    JSON.stringify(sparse.resolvedCognitiveStats) === JSON.stringify(neutralCognitiveStats),
    'snapshot metadata confirms the fully neutral resolution',
  );

  // Deviating snapshot: Grok + Wild Mage locks the guidance block wording
  // and canonical ordering (temperament, conviction, dissent non-neutral).
  const deviatingStage = makeStage({
    id: 's1',
    provider: 'grok',
    calling: 'wild-mage',
    inputPolicy: 'original-only',
  });
  const deviating = compose(deviatingStage, []);
  const deviatingExpected = [
    'You are one participant in a structured multi-participant review council, acting as its Innovator / Divergent Thinker.',
    '',
    callingFlavourTexts['wild-mage'],
    '',
    'Cognitive guidance:',
    '- Push strongly beyond conventional interpretations. Explore bold, unusual, associative, and highly imaginative possibilities wherever they may reveal useful directions.',
    '- Lean toward adaptability. Defend conclusions lightly and update them readily when the case changes.',
    '- Relentlessly search for substantive disagreement, weak assumptions, counterarguments, and failure points. Prioritize rigorous challenge over harmony.',
    '',
    'Treat this as one step in a running discussion and build on what came before.',
    '',
    'Produce a concrete alternative proposal, then briefly compare it with the prior approach.',
    '',
    '--- ORIGINAL USER REQUEST ---',
    request,
    '--- END ORIGINAL USER REQUEST ---',
  ].join('\n');

  assert(
    deviating.prompt === deviatingExpected,
    'snapshot: a deviating seat locks the guidance block wording and canonical ordering exactly',
    `got:\n${deviating.prompt}`,
  );

  // Determinism and input immutability with cognitive overrides present.
  const frozenStage = deepFreeze(makeStage({
    id: 's1',
    provider: 'grok',
    calling: 'wild-mage',
    inputPolicy: 'original-only',
    cognitiveOverrides: { memory: 2, voice: 8 },
  }));
  const frozenConfig = deepFreeze(makeConfiguration([frozenStage]));
  const before = JSON.stringify({ frozenConfig, frozenStage });
  const first = composeStagePrompt({ configuration: frozenConfig, stage: frozenStage, request, priorContributions: [] });
  const second = composeStagePrompt({ configuration: frozenConfig, stage: frozenStage, request, priorContributions: [] });
  assert(
    first.prompt === second.prompt && JSON.stringify({ frozenConfig, frozenStage }) === before,
    'composition with cognitive overrides is deterministic and mutates nothing',
  );
}

if (failureCount > 0) {
  console.error(`\n${failureCount} cognitive stat assertion(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('\nAll cognitive stat assertions passed.');
}
