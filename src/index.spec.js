import { createStore, applyMiddleware } from 'redux';

import { createRyeMiddleware } from './newRye';
import { put, call, fork, join } from './effects/index';


const noopReducer = (state = {}) => state;
const store = createStore(
  noopReducer,
  applyMiddleware(createRyeMiddleware()),
);

describe('redux-yield-effect examples', () => {
  // main business logic coroutine
  function* orderProduct(productId, userId, isHappyPath) {
    // load user address and product price in the background
    // "fork" calls a function or a coroutine and continues execution without waiting for a result
    // we will "join" that result later
    const fetchUserAddressFromDBTask = yield fork(fetchUserAddressFromDB, userId);
    const fetchProductPriceFromDBTask = yield fork(fetchProductPriceFromDB, userId);

    try {
      // reserve the product
      // "call" calls a function or a coroutine and waits until it asynchronously resolves
      yield call(reserveProduct, productId);

      // fetch user payment information
      const userPaymentDetails = yield call(fetchUserPaymentDetails, userId);

      // "put" dispatches action
      yield put({ type: 'UPDATE_USER_CARD_NUMBER', payload: userPaymentDetails.cardNumber });

      // make the payment
      // here we "join" the result of the previously called
      // function "fetchProductPriceFromDB", so wait until it is done
      const { price } = yield join(fetchProductPriceFromDBTask);

      // here we "call" a coroutine (another generator that yields declarative effects)
      yield call(makePayment, userPaymentDetails.cardNumber, price, isHappyPath);

      // add shipping address and complete order
      const { address } = yield join(fetchUserAddressFromDBTask);
      yield put({ type: 'UPDATE_USER_ADDRESS', payload: address });
      const order = yield call(completeOrder, productId, userId, address);
      yield put({ type: 'COMPLETE_ORDER', payload: order.orderId });

      return order;
    } catch (error) {
      // if any of the yielded effects from the "try" block fails, we could catch that error here

      // cancel product reservation and report error
      yield call(cancelProductReservation, productId);
      yield put({ type: 'ORDER_FAILED', error });

      // re-throw error to the caller
      throw error;
    }
  }

  // payment coroutine
  function* makePayment(cardNumber, amount, isHappyPath) {
    const validationResult = (isHappyPath)
      ? yield call(validateCardThatWillSucceed, cardNumber)
      : yield call(validateCardThatWillFail, cardNumber);

    if (validationResult.status !== 'success') {
      throw new Error(`card number ${cardNumber} is not valid`);
    }

    yield put({ type: 'CARD_VALIDATION_SUCCESS' });

    yield call(pay, cardNumber, amount);

    yield put({ type: 'PAYMENT_COMPLETE' });
  }

  it('should return a resolved promise with the result of the successful business logic execution', async () => {
    const { result, endGeneratorAction } = store.dispatch(orderProduct('PRDCT_ID_1122', 'USR_ID_9999', true));

    expect(await result).toEqual({
      orderId: 'ORD_ID_4242',
      productId: 'PRDCT_ID_1122',
      userId: 'USR_ID_9999',
      address: 'Stationsplein, 1012 AB Amsterdam, Netherlands',
    });
  });

  it('should return a rejected promise with an error thrown during the execution of the business logic', async () => {
    try {
      await store.dispatch(orderProduct('PRDCT_ID_1122', 'USR_ID_9999', false));
    } catch (error) {
      expect(error.message).toMatch(/card number 1111222233334444 is not valid/);
    }
  });
});

// ===================================
// Mock services
// ===================================

function fetchUserAddressFromDB(userId) {
  return Promise.resolve({ userId, address: 'Stationsplein, 1012 AB Amsterdam, Netherlands' });
}

function fetchProductPriceFromDB(productId) {
  return Promise.resolve({ productId, price: 24.99 });
}

function reserveProduct(productId) {
  return Promise.resolve({ productId, status: 'reserved' });
}

function cancelProductReservation(productId) {
  return Promise.resolve({ productId, status: 'success' });
}

function fetchUserPaymentDetails(userId) {
  return Promise.resolve({ userId, cardNumber: 1111222233334444 });
}

function validateCardThatWillSucceed(cardNumber) {
  return Promise.resolve({ cardNumber, status: 'success' });
}

function validateCardThatWillFail(cardNumber) {
  return Promise.resolve({ cardNumber, status: 'failure' });
}

function pay(/* cardNumber, amount */) {
  return Promise.resolve();
}

function completeOrder(productId, userId, address) {
  return Promise.resolve({
    orderId: 'ORD_ID_4242',
    productId,
    userId,
    address,
  });
}
