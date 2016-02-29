import invariant from 'invariant';
import isPlainObject from 'lodash/isPlainObject';
import isPromise from 'is-promise';

export const TYPE = 'YIELD_EFFECT_JOIN';

export function processor(effect) {
  const { task } = effect.payload;

  invariant(isPlainObject(task), `"effect.payload.task" must be a plain object, but received ${task}`);

  const taskPromise = task.promise;

  invariant(isPromise(taskPromise), `"effect.payload.task.promise" must be a promise, but received ${taskPromise}`);

  return taskPromise;
}

export default function join(task) {
  return {
    type: TYPE,
    payload: {
      task
    }
  };
}
