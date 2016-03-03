# redux-yield-effect
_Declarative side-effects for redux with generators_

__redux-yield-effect__ middleware allows to write action creators as easily testable side-effect free generators.

It provides extensible set of operators which allow to describe any possible side effect (API service call, action dispatch, etc.) as a plain javascript object that is handled and executed on the level of middleware, so that user code remains side-effect free.

## Usage

Check complete example [here](https://github.com/wizardzloy/redux-yield-effect/blob/master/examples/index.js)

````js
import { createStore, applyMiddleware } from 'redux';
import { createYieldEffectMiddleware } from 'redux-yield-effect';
import { put, call, fork, join } from 'redux-yield-effect/lib/effects';


const store = createStore(
    rootReducer,
    applyMiddleware(createYieldEffectMiddleware()) // apply redux-yield-effect middleware
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
    // here we "join" the result of the previously called function "fetchProductPriceFromDB", so wait until it is done
    const { price } = yield join(fetchProductPriceFromDBTask);
    // here we "call" a coroutine (another generator that yields declarative effects)
    yield call(makePayment, userPaymentDetails.cardNumber, price);

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
function* makePayment(cardNumber, amount) {
  const validationResult = yield call(validateCard, cardNumber);

  if (validationResult.status !== 'success') {
    throw new Error(`card number ${cardNumber} is not valid`);
  }

  yield put({ type: 'CARD_VALIDATION_SUCCESS' });
  yield call(pay, cardNumber, amount);
  yield put({ type: 'PAYMENT_COMPLETE' });
}
````

## How it works
Each effect creator (`put`, `call`, etc.) instead of performing real side effect returns just a plain object that describes the effect.
For example `call(myApiService, 123, 'foo')` will produce:
````js
{ 
  type: 'YIELD_EFFECT_CALL',
  payload: {
    func: myApiService,
    args: [123, 'foo']
  }
}
````
When `yield`ed from an action creator this effect description is picked up by the middleware and handed over to a corresponding effect processor based on the `type` property. Effect processor performs that side effect and the eventual result/error of it is returned/thrown back to the action creator at the place the effect was `yield`ed from.

This approach allows developer to write pure action creators that may define complex async execution flow yet being trivial to test.
