import isGenerator from 'is-generator';
import { getRyeHelpers } from './ryeHelpers';
import { endRyeGeneratorCreator } from './endRyeGeneratorActionCreator';
import * as removeValueO from './removeValue';

import { createRyeMiddleware, defaultEffectProcessors } from './newRye';

jest.mock('./removeValue');
jest.mock('./ryeHelpers');
jest.mock('is-generator', () => ({
  __esModule: true,
  default: jest.fn(() => true),
}));

const dispatch = 'dispatch';
const mockStore = { dispatch };

describe('createRyeMiddleware', () => {
  it('should return the next(action) if not a generator', () => {
    isGenerator.mockImplementationOnce(() => false);
    const next = a => a + 'b';
    const value = 'a';
    const result = createRyeMiddleware()(mockStore)(next)(value);
    expect(result).toBe('ab');
  });

  it('should remove generator from activeGenerators when endRyeGenerator is action', () => {
    // TODO: do i really have to use an object? It's so ugly.
    const removeValueSpy = jest.spyOn(removeValueO, 'removeValue');
    const action = endRyeGeneratorCreator();
    const next = next => ({ next });
    const activeGenerators = [1];
    const result = createRyeMiddleware(undefined, activeGenerators)(mockStore)(next)(action);

    expect(removeValueSpy).toHaveBeenCalledWith(activeGenerators, action.payload);
    expect(result).toEqual(next(action));
  });

  it('should call effectGeneratorProcessor of getRyeHelpers', () => {
    const extraEffectProcessors = { mockEffect: 'mock' };
    const activeGenerators = [1];
    const generator = 'generatorAction';
    getRyeHelpers.mockImplementationOnce(({ activeGenerators, effectProcessors }) => ({
      effectGeneratorProcessor: generator => ({ generator, effectProcessors, activeGenerators }),
    }));

    const result = createRyeMiddleware(extraEffectProcessors, activeGenerators)(mockStore)()(generator);

    expect(result).toEqual({
      generator,
      effectProcessors: {
        ...defaultEffectProcessors,
        ...extraEffectProcessors,
      },
      activeGenerators,
    });
  });
});
