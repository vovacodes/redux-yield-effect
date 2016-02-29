import invariant from 'invariant';
import isFunction from 'lodash/isFunction';
import { fn as isGeneratorFunction } from 'is-generator';
import isPromise from 'is-promise';

export const TYPE = 'YIELD_EFFECT_FORK';

export function processor(effect, { dispatch, effectGeneratorProcessor }) {
  const { func, args } = effect.payload;

  invariant(isFunction(func), `"effect.payload.func" must be a function, but received ${func}`);

  let promise;
  if (isGeneratorFunction(func)) {
    // func is an effect generator
    promise = effectGeneratorProcessor(func(...args), { dispatch });
  } else {
    promise = func(...args);

    invariant(isPromise(promise), `"effect.payload.func" must return a promise, but received ${promise}`);
  }

  // wrap result of the function invocation into an object
  // to prevent middleware from waiting for it be resolved
  // before giving the control back to effect generator
  return Promise.resolve({ promise });
}

/**
 * Forks a function or a coroutine for non-blocking (middleware will not wait until it's done) execution
 *
 * @param {Function | GeneratorFunction} func
 * @param args
 * @returns {Effect}
 */
export default function fork(func, ...args) {
  return {
    type: TYPE,
    payload: {
      func,
      args
    }
  };
}
