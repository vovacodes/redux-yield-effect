import invariant from 'invariant';
import { fn as isGeneratorFunction } from 'is-generator';

export const TYPE = '__YIELD_EFFECT_CALL__';

export function processor(effect, { effectGeneratorProcessor }) {
  const { func, args } = effect.payload;

  let promise;
  if (isGeneratorFunction(func)) {
    promise = effectGeneratorProcessor(func(...args)).result;
  } else {
    promise = Promise.resolve(func(...args));
  }

  return promise;
}

export default function call(func, ...args) {
  invariant(typeof func === 'function', `first argument must be a function, but received ${func} | ${typeof func}`);

  return {
    type: TYPE,
    payload: {
      func,
      args,
    },
  };
}
