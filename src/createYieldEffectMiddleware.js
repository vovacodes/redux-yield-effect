import invariant from 'invariant';
import isGenerator from 'is-generator';
import isPromise from 'is-promise';
import { TYPE as PUT_EFFECT_TYPE, processor as putEffectProcessor } from './effects/put';
import { TYPE as CALL_EFFECT_TYPE, processor as callEffectProcessor } from './effects/call';
import { TYPE as FORK_EFFECT_TYPE, processor as forkEffectProcessor } from './effects/fork';
import { TYPE as JOIN_EFFECT_TYPE, processor as joinEffectProcessor } from './effects/join';

const meta = 'reduxYieldEffectMiddleware';
const getYieldEffectMiddleware = (activeGenerators, effectGeneratorProcessor) =>
  function yieldEffectMiddleware({ dispatch }) {
    return (next) => (action) => {
      if (!action.meta !== meta || !isGenerator(action)) {
        return next(action);
      }

      if (action.type === endRyeGeneratorCreator.toString()) {
        delete activeGenerators[action.payload.id];
        return action;
      } else {
        const endRyeGeneratorAction = effectGeneratorProcessor(action, { dispatch });
        activeGenerators[endRyeGeneratorAction.id] = action;
        return endRyeGeneratorAction;
      }
    };
  };

/**
 *
 * @param customEffectProcessors - object where keys are effectTypes and values are effectProcessors
 * @returns {function} yieldEffectMiddleware
 */
export default function createYieldEffectMiddleware(customEffectProcessors = {}) {
  const effectProcessors = {
    [PUT_EFFECT_TYPE]: putEffectProcessor,
    [CALL_EFFECT_TYPE]: callEffectProcessor,
    [FORK_EFFECT_TYPE]: forkEffectProcessor,
    [JOIN_EFFECT_TYPE]: joinEffectProcessor,
    ...customEffectProcessors,
  };

  const activeGenerators = {};
  const handlePreviousEffectResult = createHandlePreviousEffectResult(activeGenerators);
  const effectGeneratorProcessor = createEffectGeneratorProcessor(effectProcessors, activeGenerators, handlePreviousEffectResult);

  return getYieldEffectMiddleware(activeGenerators, effectGeneratorProcessor);
}

// TODO: activeGenerators is a sideEffect. This is terrible, but I think a LOT of refactoring is necessary to get this to work
export function createEffectGeneratorProcessor(effectProcessors, activeGenerators, handlePreviousEffectResult) {
  return function effectGeneratorProcessor(generatorAction, { dispatch }) {
    // This id can be used to end the generator prematurely.
    const action = endRyeGeneratorCreator();

    // Note: we don't return the result of the generator.
    // Either use the redux store to store information from the generator
    // Or create an effect to extract a value from the generator
    handlePreviousEffectResult(generatorAction, action);
    return action;
  };
}

const createHandlePreviousEffectResult = (activeGenerators) =>
  function handlePreviousEffectResult(generatorAction, action, prevEffectResult) {
    if (!activeGenerators[action.id]) return generatorAction.return().value;
    const { value, done } = generatorAction.next(prevEffectResult);

    if (done) {
      return value; // we consumed all effects, finishing
    }

    return processEffect(value);
  };

// Note: throw takes precedence over ending the generator.
// ie. a thrown generator doesn't need to be in the activeGenerators list, to continue yielding.
function handlePreviousEffectError(prevEffectError) {
  const { value, done } = generatorAction.throw(prevEffectError);

  if (done) {
    return value; // we consumed all effects, finishing
  }

  return processEffect(value);
}

function processEffect(effect) {
  const effectProcessor = effectProcessors[effect.type];

  invariant(effectProcessor, `cannot find effect processor for effect with type: ${effect.type}`);

  const result = effectProcessor(effect, { dispatch, effectGeneratorProcessor });

  invariant(isPromise(result), `effect processor should always return promise, but received: ${result}`);

  return result.then(
    handlePreviousEffectResult,
    handlePreviousEffectError,
  );
}


let i = 0;
const type = 'endRyeGenerator';
export function endRyeGeneratorCreator(id) {
  // TODO: add nullish coalescing (update js stuff) [current 0 will still use i, which is incorrect]
  return { type, payload: { id: id || ++i }, meta };
}
endRyeGeneratorCreator.toString = () => type;
