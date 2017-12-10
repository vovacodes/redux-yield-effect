import invariant from 'invariant';
import isGenerator from 'is-generator';
import isPromise from 'is-promise';
import { TYPE as PUT_EFFECT_TYPE, processor as putEffectProcessor } from './effects/put';
import { TYPE as CALL_EFFECT_TYPE, processor as callEffectProcessor } from './effects/call';
import { TYPE as FORK_EFFECT_TYPE, processor as forkEffectProcessor } from './effects/fork';
import { TYPE as JOIN_EFFECT_TYPE, processor as joinEffectProcessor } from './effects/join';

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

  const effectGeneratorProcessor = createEffectGeneratorProcessor(effectProcessors);

  return function yieldEffectMiddleware({ dispatch }) {
    return (next) => (action) => {
      if (!isGenerator(action)) {
        return next(action);
      }

      return effectGeneratorProcessor(action, { dispatch });
    };
  };
}

function createEffectGeneratorProcessor(effectProcessors) {
  return function effectGeneratorProcessor(effectGenerator, { dispatch }) {
    return Promise.resolve(handlePreviousEffectResult());

    function handlePreviousEffectResult(prevEffectResult) {
      const { value, done } = effectGenerator.next(prevEffectResult);

      if (done) {
        return value; // we consumed all effects, finishing
      }

      return processEffect(value);
    }

    function handlePreviousEffectError(prevEffectError) {
      const { value, done } = effectGenerator.throw(prevEffectError);

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
  };
}
