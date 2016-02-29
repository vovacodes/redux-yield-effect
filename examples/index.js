import 'babel-polyfill';
import { createStore, applyMiddleware } from 'redux';

import { createYieldEffectMiddleware } from '../';
import put from '../lib/effects/put';
import call from '../lib/effects/call';
import fork from '../lib/effects/fork';
import join from '../lib/effects/join';

const noopReducer = (state = {}, action) => state;

const simpleActionLoggerMiddleware = () => (next) => (action) => {
  console.log('Received action:', action);
  console.log('========================');
  return next(action);
};

const store = createStore(
    noopReducer,
    applyMiddleware(createYieldEffectMiddleware(), simpleActionLoggerMiddleware)
);

// dispatch business logic coroutine
store.dispatch(orderProduct('PRDCT_ID_1122', 'USR_ID_9999'))
    .then(
        (order) => console.log('orderProduct result:', order),
        (error) => console.error('order failed with error', error)
    );


// main business logic coroutine
function* orderProduct(productId, userId) {
  // load user address and product price in the background
  const fetchUserAddressFromDBTask = yield fork(fetchUserAddressFromDB, userId);
  const fetchProductPriceFromDBTask = yield fork(fetchProductPriceFromDB, userId);

  try {
    // reserve the product
    yield call(reserveProduct, productId);

    // fetch user payment information
    const userPaymentDetails = yield call(fetchUserPaymentDetails, userId);
    yield put({ type: 'UPDATE_USER_CARD_NUMBER', payload: userPaymentDetails.cardNumber });

    // make the payment
    const { price } = yield join(fetchProductPriceFromDBTask);
    yield call(makePayment, userPaymentDetails.cardNumber, price);

    // add shipping address and complete order
    const { address } = yield join(fetchUserAddressFromDBTask);
    yield put({ type: 'UPDATE_USER_ADDRESS', payload: address });
    const order = yield call(completeOrder, productId, userId, address);
    yield put({ type: 'COMPLETE_ORDER', payload: order.orderId });

    return order;
  } catch (error) {
    // cancel product reservation and report error
    yield call(cancelProductReservation, productId);
    yield put({ type: 'ORDER_FAILED', error });

    // re-throw error to the caller
    throw error;
  }
}

// payment coroutine
function* makePayment(cardNumber, amount) {
  const validationResult = yield call(validateCard, cardNumber);

  if (validationResult.status !== 'success') {
    throw new Error(`card number ${cardNumber} is not valid`);
  }

  yield put({ type: 'CARD_VALIDATION_SUCCESS' });
  yield call(pay, cardNumber, amount);
  yield put({ type: 'PAYMENT_COMPLETE' });
}

// mock API services

function fetchUserAddressFromDB(userId) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ userId, address: 'Stationsplein, 1012 AB Amsterdam, Netherlands' }), 2000);
  });
}

function fetchProductPriceFromDB(productId) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ productId, price: 24.99 }), 2000);
  });
}

function reserveProduct(productId) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ productId, status: 'reserved' }), 1500);
  });
}

function cancelProductReservation(productId) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ productId, status: 'success' }), 500);
  });
}

function fetchUserPaymentDetails(userId) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ userId, cardNumber: 1111222233334444 }), 1000);
  });
}

function validateCard(cardNumber) {
  return Promise.resolve({ cardNumber, status: (Math.random() > 0.5) ? 'success' : 'failure' });
}

function pay(cardNumber, amount) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), 1000);
  });
}

function completeOrder(productId, userId, address) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ orderId: 'ORD_ID_4242', productId, userId, address }), 1000);
  });
}
