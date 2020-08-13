import invariant from 'invariant';
import { fn as isGeneratorFunction } from 'is-generator';

export const TYPE = '__YIELD_EFFECT_FORK__';

export function processor(effect, { effectGeneratorProcessor }) {
  const { func, args } = effect.payload;

  if (isGeneratorFunction(func)) {
    return Promise.resolve(effectGeneratorProcessor(func(...args)));
  } else {
    // returning { result }, to mimic effectGeneratorProcessor.
    return Promise.resolve({ result: func(...args) });
  }
}

/**
 * Forks a function or a coroutine for non-blocking (middleware will not wait until it's done) execution
 *
 * @param {Function | GeneratorFunction} func
 * @param args
 * @returns {Effect}
 */
export default function fork(func, ...args) {
  invariant(typeof func === 'function', `"effect.payload.func" must be a function, but received ${func}`);

  return {
    type: TYPE,
    payload: {
      func,
      args,
    },
  };
}
