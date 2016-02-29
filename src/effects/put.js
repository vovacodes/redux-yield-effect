import invariant from 'invariant';
import isPlainObject from 'lodash/isPlainObject';

export const TYPE = 'YIELD_EFFECT_PUT';

export function processor(effect, { dispatch }) {
  const { action } = effect.payload;

  invariant(isPlainObject(action), `"put" only supports dispatching plain object actions, but received ${action}`);

  return Promise.resolve().then(() => {
    dispatch(action);
  });
}

export default function put(action) {
  return {
    type: TYPE,
    payload: {
      action
    }
  };
}
