'use strict';

const { getHomeyContext } = require('../homey/client');
const { formatTable } = require('../format/output');

async function list(ctx) {
  const { homeyApi } = await getHomeyContext({ homeyId: ctx.options.homeyId });
  const flowsMap = await homeyApi.flow.getFlows();
  const advancedFlowsMap = await homeyApi.flow.getAdvancedFlows();

  const flows = Object.values(flowsMap).map(flow => ({
    id: flow.id,
    name: flow.name,
    type: 'flow',
    enabled: flow.enabled,
    triggerable: flow.triggerable,
    broken: flow.broken,
  }));

  const advancedFlows = Object.values(advancedFlowsMap).map(flow => ({
    id: flow.id,
    name: flow.name,
    type: 'advanced',
    enabled: flow.enabled,
    triggerable: flow.triggerable,
    broken: flow.broken,
  }));

  const all = [...flows, ...advancedFlows];

  ctx.print({ flows: all }, payload => {
    if (!payload.flows.length) return 'No flows found.';
    return formatTable(payload.flows, ['id', 'name', 'type', 'enabled', 'triggerable', 'broken']);
  });
}

async function get(ctx, args) {
  const flowId = args[0];
  if (!flowId) throw new Error('Usage: homey-cli flows get <flowId>');

  const { homeyApi } = await getHomeyContext({ homeyId: ctx.options.homeyId });
  const flowsMap = await homeyApi.flow.getFlows();
  const advancedFlowsMap = await homeyApi.flow.getAdvancedFlows();

  if (flowsMap[flowId]) {
    ctx.print({ type: 'flow', flow: flowsMap[flowId] }, payload => `${payload.flow.name} (${payload.flow.id})`);
    return;
  }

  if (advancedFlowsMap[flowId]) {
    ctx.print({ type: 'advanced', flow: advancedFlowsMap[flowId] }, payload => `${payload.flow.name} (${payload.flow.id})`);
    return;
  }

  throw new Error(`Flow not found: ${flowId}`);
}

function findFlowsByName(flows, name) {
  const lower = name.toLowerCase();
  return flows.filter(flow => flow.name.toLowerCase() === lower);
}

async function trigger(ctx, args) {
  const flowId = args[0];
  if (!flowId) throw new Error('Usage: homey-cli flows trigger <flowId>');

  const { homeyApi } = await getHomeyContext({ homeyId: ctx.options.homeyId });
  const flowsMap = await homeyApi.flow.getFlows();
  const advancedFlowsMap = await homeyApi.flow.getAdvancedFlows();

  if (flowsMap[flowId]) {
    const flow = flowsMap[flowId];
    if (flow.triggerable === false) {
      throw new Error(`Flow ${flow.name} (${flow.id}) is not triggerable.`);
    }

    if (ctx.options.dryRun) {
      ctx.print({ id: flow.id, type: 'flow', dryRun: true }, () => `Dry run: would trigger flow ${flow.name} (${flow.id})`);
      return;
    }

    await homeyApi.flow.triggerFlow({ id: flow.id });
    ctx.print({ id: flow.id, type: 'flow', status: 'ok' }, () => `Triggered flow ${flow.name} (${flow.id})`);
    return;
  }

  if (advancedFlowsMap[flowId]) {
    const flow = advancedFlowsMap[flowId];
    if (flow.triggerable === false) {
      throw new Error(`Advanced flow ${flow.name} (${flow.id}) is not triggerable.`);
    }

    if (ctx.options.dryRun) {
      ctx.print({ id: flow.id, type: 'advanced', dryRun: true }, () => `Dry run: would trigger advanced flow ${flow.name} (${flow.id})`);
      return;
    }

    await homeyApi.flow.triggerAdvancedFlow({ id: flow.id });
    ctx.print({ id: flow.id, type: 'advanced', status: 'ok' }, () => `Triggered advanced flow ${flow.name} (${flow.id})`);
    return;
  }

  throw new Error(`Flow not found: ${flowId}`);
}

async function triggerByName(ctx, args) {
  const name = args.join(' ').trim();
  if (!name) throw new Error('Usage: homey-cli flows trigger-by-name "<flow name>"');

  const { homeyApi } = await getHomeyContext({ homeyId: ctx.options.homeyId });
  const flowsMap = await homeyApi.flow.getFlows();
  const advancedFlowsMap = await homeyApi.flow.getAdvancedFlows();

  const all = [
    ...Object.values(flowsMap).map(flow => ({ type: 'flow', flow })),
    ...Object.values(advancedFlowsMap).map(flow => ({ type: 'advanced', flow })),
  ];

  const matches = all.filter(entry => entry.flow.name.toLowerCase() === name.toLowerCase());

  if (matches.length === 0) {
    throw new Error(`No flows found with name: ${name}`);
  }

  if (matches.length > 1 && ctx.options.strict) {
    const ids = matches.map(match => `${match.flow.name} (${match.flow.id})`).join(', ');
    throw new Error(`Multiple flows match "${name}": ${ids}`);
  }

  const [match] = matches;
  await trigger(ctx, [match.flow.id]);
}

module.exports = {
  list,
  get,
  trigger,
  triggerByName,
};
