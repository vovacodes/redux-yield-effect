# Rye Middleware
_Declarative side effects for redux with generators_

__RYE__ middleware allows to write action creators as easily testable side-effect free generators.

It provides extensible set of operators which allow to describe any possible side effect (API service call, action dispatch, etc.) as a plain javascript object that is handled and executed on the level of middleware, so that user code remains side-effect free.

## Distinction from Redux Yield Effect

The original author Valdimir made the awesome library Redux Yield Effect. I contributed a little. Now it's 3 years later and I want to make bigger changes and i don't want to bother the original author. Further, I wanted to add unit tests to my changes, but found it difficult with how the code was written. With this in mind, I decided to rewrite the core code of the library, so I could more cleanly unit test it.
No more anonymous inaccessible functions in functions.
The new feature that drove me to re-write the project was the ability to end generators early. So after a generator is dispatched, an action to end it early is returned. This is a breaking change:
 - the old library returned a promise of the returned value of the generator that was dispatched.
 - This new library returns an action that allows the user to end the generator early.

## Motivation

This library is strongly inspired by the awesome [__redux-saga__](https://github.com/yelouafi/redux-saga) project. Actually the API of the __redux-yield-effect__
almost completely copies one from the __redux-saga__. But even though these libs have a lot of similarities, they are
different in a very important aspect - the way of kicking off the effect generators. __redux-saga__ promotes the approach of 
long-running daemon processes that are listening to an action/event to start/resume execution, whereas in __redux-yield-effect__
you kick off the effect generator by simply dispatching it (approach similar to the __redux-thunk__).
You may read more about the motivation behind it [here](https://github.com/yelouafi/redux-saga/issues/123).

## Installation

`npm install --save redux-yield-effect`

## Usage

Check an example [here](https://github.com/wzrdzl/redux-yield-effect/blob/master/src/index.spec.js)

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

This approach allows developer to write pure action creators that may define complex business logic with async execution flow, yet being trivial to test.

## API

#### `createYieldEffectMiddleware(customEffectProcessors?): Function`
Creates _redux_ middleware that handles effect coroutines.
- `customEffectProcessors: { [effectType: string]: [effectProcessor: Function] }` - `optional` - object that specifies the  mapping between custom effect's type and effectProcessor function. This allows to create and use your own or third party effect creators with __redux-yield-effect__

### Effect creators

#### `call(func, ...args): Effect`
Creates an Effect that when performed should call `func` with `args` as arguments. When Effect `yield`ed, if `func` is a normal function, coroutine is suspended until the Promise returned by `func` fulfilled. If `func` is an effect coroutine then execution waits until coroutine returns.
- `func: Function = () => {Promise<any> | any} | GeneratorFunction` - function or effect coroutine
- `args: Array` - arguments to call `func` with

#### `fork(func, ...args): Effect`
Creates an Effect that when performed should call `func` with `args` as arguments. Unlike `call` doesn't suspend the execution flow, but instantly returns a Task object, that could further be used with `join` effect creator to get the result of function call.
- `func: Function = () => {Promise} | GeneratorFunction` - function or effect coroutine
- `args: Array` - arguments to call `func` with

#### `join(task): Effect`
Creates an Effect that when performed suspends the execution flow until previously forked `task` is finished.
- `task` - object returned from a previous `fork` call

#### `put(action): Effect`
Creates an Effect that when performed dispatches the `action` with redux's `store.dispatch` method.
- `action: Action` - action to dispatch

### Custom effect creators

It is possible to create your own custom effect creators. Let's learn how to make it by example
````js
// ======================== log.js ==========================
// In order to create a custom effect creator you need to define three things:

// 1. string constant, that represents the type of the Effect
export const TYPE = '__YIELD_EFFECT_LOG__';

// 2. effect creator - function that returns Effect description object
export default function log(message) {
    return {
        type: TYPE,
        payload: {
            message: message
        }
        
    };
}

// 3. effect processor - function that knows how to process certain Effect.
// It should always return Promise
export function processor(effect, { dispatch, effectGeneratorProcessor }) {
    const message = effect.payload.message;
    
    return Promise.resolve().then(() => { console.log(message); });
}

// ======================= main.js ==========================
import log, { TYPE as LOG_EFFECT_TYPE, processor as logEffectProcessor } from './log';
import { createStore, applyMiddleware } from 'redux';
import { createYieldEffectMiddleware } from 'redux-yield-effect';

// Now we should let middleware know how to handle our Effect:
const yieldEffectMiddleware = createYieldEffectMiddleware({
    [LOG_EFFECT_TYPE]: logEffectProcessor
});

const store = createStore(
    reducer,
    applyMiddleware(yieldEffectMiddleware) // apply redux-yield-effect middleware
);

store.dispatch(function* () {
    // now you can use your custom effect creator in your effect coroutine
    yield log('this will be logged in the "logEffectProcessor".');
});

````
