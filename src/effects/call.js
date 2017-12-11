import invariant from 'invariant';
import isFunction from 'lodash/isFunction';
import { fn as isGeneratorFunction } from 'is-generator';

export const TYPE = '__YIELD_EFFECT_CALL__';

export function processor(effect, { dispatch, effectGeneratorProcessor }) {
  const { func, args } = effect.payload;

  invariant(isFunction(func), `"effect.payload.func" must be a function, but received ${func}`);

  let promise;
  if (isGeneratorFunction(func)) {
    // func is an effect generator
    promise = effectGeneratorProcessor(func(...args), { dispatch });
  } else {
    promise = func(...args);
    if (!promise.then) {
      promise = Promise.resolve(promise);
    }
  }

  return promise;
}

export default function call(func, ...args) {
  invariant(isFunction(func), `"func" argument must be a function, but received ${func}`);

  return {
    type: TYPE,
    payload: {
      func,
      args,
    },
  };
}
