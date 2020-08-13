import { endRyeGeneratorCreator } from './endRyeGeneratorActionCreator';

export const getRyeHelpers = ({ dispatch, activeGenerators, effectProcessors }) => {
  const { effectGeneratorProcessor, recursivelyProcessGenerator, processEffect } = {
    effectGeneratorProcessor: generator => {
      activeGenerators.push(generator);

      return {
        endGeneratorAction: endRyeGeneratorCreator(generator),
        result: recursivelyProcessGenerator(generator, {}),
      };
    },

    recursivelyProcessGenerator: async (generator, prevYield) => {
      if (prevYield.done) return Promise.resolve(prevYield.value);

      // TODO: need to identify effects better, than { type } existing
      if (!prevYield.value?.type) {
        return recursivelyProcessGenerator(generator, generator.next(prevYield.value));
      } else {
        return processEffect(generator, prevYield.value);
      }
    },

    processEffect: async (generator, effect) => {
      const effectPromise = effectProcessors[effect.type](effect, { dispatch, effectGeneratorProcessor });
      return effectPromise.then(
        result => recursivelyProcessGenerator(generator, generator.next(result)),
        error => recursivelyProcessGenerator(generator, generator.throw(error)),
      );
    },
  };
  return { effectGeneratorProcessor, recursivelyProcessGenerator, processEffect };
};
