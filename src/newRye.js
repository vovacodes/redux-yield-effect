import isGenerator from 'is-generator';
import { TYPE as PUT_EFFECT_TYPE, processor as putEffectProcessor } from './effects/put';
import { TYPE as CALL_EFFECT_TYPE, processor as callEffectProcessor } from './effects/call';
import { TYPE as FORK_EFFECT_TYPE, processor as forkEffectProcessor } from './effects/fork';
import { TYPE as JOIN_EFFECT_TYPE, processor as joinEffectProcessor } from './effects/join';

import { endRyeGeneratorCreator, meta } from './endRyeGeneratorActionCreator';
import { getRyeHelpers } from './ryeHelpers';
import { removeValue } from './removeValue';

export const defaultEffectProcessors = {
  [PUT_EFFECT_TYPE]: putEffectProcessor,
  [CALL_EFFECT_TYPE]: callEffectProcessor,
  [FORK_EFFECT_TYPE]: forkEffectProcessor,
  [JOIN_EFFECT_TYPE]: joinEffectProcessor,
};

export const createRyeMiddleware = (customEffectProcessors = {}, activeGenerators = []) =>
  function RyeMiddleware({ dispatch }) {
    return next => action => {
      const i = isGenerator(action);
      if (!(action.meta === meta || i)) {
        return next(action);
      }

      if (action.type === endRyeGeneratorCreator.toString()) {
        removeValue(activeGenerators, action.payload);
        return next(action);
      } else {
        return getRyeHelpers({
          activeGenerators,
          effectProcessors: {
            ...defaultEffectProcessors,
            ...customEffectProcessors,
          },
          dispatch,
        }).effectGeneratorProcessor(action);
      }
    };
  };
