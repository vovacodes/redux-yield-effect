export const TYPE = '__YIELD_EFFECT_JOIN__';

export function processor(effect) {
  const taskPromise = effect.payload.task.promise;

  return taskPromise;
}

export default function join(task) {
  return {
    type: TYPE,
    payload: {
      task,
    },
  };
}
