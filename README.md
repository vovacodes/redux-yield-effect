# redux-yield-effect
_Declarative side-effects for redux with generators_

__redux-yield-effect__ middleware allows to write action creators as easily testable side-effect free generators.

It provides extensible set of operators which allow to describe any possible side effect (API service call, action dispatch, etc.) as a plain javascript object that is handled and executed on the level of middleware, so that user code remains side-effect free.


