export const TYPE = '__YIELD_EFFECT_PUT__';

export function processor(effect, { dispatch }) {
  const { action } = effect.payload;

  return Promise.resolve().then(() => dispatch(action));
}

export default function put(action) {
  return {
    type: TYPE,
    payload: {
      action,
    },
  };
}
