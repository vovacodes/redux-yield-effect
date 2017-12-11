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

    it('should throw exception if `action` argument is not a object', () => {
      const notAction = 'I am not an action';

      expect(() => put(notAction)).toThrowError(/only supports dispatching plain objects/);
    });
  });

  // TODO: create a test for the effect processor.
  describe('effect processor', () => {
    // it('should dispatch the action passed to it', () => {
    // });
    // it('should return any value a middleware returned for dispatching the action', () => {
    // Jason: This well be important for another library I created and well upload later.
    // });
  });
});

