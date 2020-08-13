import isPromise from 'is-promise';
import call, { TYPE, processor } from './call';


describe('call', () => {
  describe('effect creator', () => {
    it('should return correct `effect` object', () => {
      const func = (a, b) => a * b;

      expect(call(func, 2, 3)).toEqual({
        type: TYPE,
        payload: {
          func,
          args: [2, 3],
        },
      });
    });
  });

  describe('effect processor', () => {
    it(
      'should call the generator function with the correct arguments and ' +
      'pass the created Generator object to "effectGeneratorProcessor" if `func` is a generator function',
      () => {
        const mockFunc = jest.fn();
        const generatorFunc = function* func(x, y) {
          mockFunc(x, y);
          yield x * y;
        };

        const effect = {
          TYPE,
          payload: {
            func: generatorFunc,
            args: [1, 2],
          },
        };

        const effectGeneratorProcessor = jest.fn(generator => Promise.resolve(generator.next().value));

        const resultPromise = processor(effect, { effectGeneratorProcessor });

        expect(mockFunc).toBeCalledWith(1, 2);
        expect(effectGeneratorProcessor).toHaveBeenCalledTimes(1);

        return resultPromise;
      },
    );

    it('should call the `effect.payload.func` with `effect.payload.args` if `func` is a function', () => {
      const mockFunc = jest.fn((x, y) => x * y);

      const effect = {
        TYPE,
        payload: {
          func: mockFunc,
          args: [3, 4],
        },
      };

      const resultPromise = processor(effect, {});

      expect(isPromise(resultPromise)).toBe(true);

      return resultPromise.then((result) => {
        expect(mockFunc).toBeCalledWith(3, 4);
        expect(result).toBe(12);
      });
    });
  });
});

