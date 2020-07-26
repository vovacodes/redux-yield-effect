import put, { TYPE } from './put';

const actionCreator = () => ({
  type: 'SAMPLE',
  a: 1,
});

describe('put', () => {
  describe('effect creator', () => {
    it('should return correct `effect` object', () => {
      const action = actionCreator();
      expect(put(action)).toEqual({
        type: TYPE,
        payload: {
          action,
        },
      });
    });
  });
});
