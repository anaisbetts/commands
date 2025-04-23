## Commands - a React Hooks library for writing async code

```sh
npm i -S @anaisbetts/commands
```

### Installation

This package has a peer dependency on React (versions 16.8.0 through 19.x are supported):

```sh
npm i -S @anaisbetts/commands react
```

Commands are a new primitive for writing React components that invoke asynchronous methods easily. If you've ever tried to write a bunch of ugly useEffect/useState code to manage onClicks, this is much better and easier!

Commands also automatically ensure that only one invocation of the method is running concurrently, and makes it really easy to write pending and error states.

Here's an example:

```tsx
export default function PokemonLookupPage() {
  const [pokemon, setPokemon] = useState("")

  const [doSearch, data] = useCommand(async () => {
    if (!pokemon || pokemon.length < 3) {
      return []
    }

    return await fetchPokemonByName(pokemon)
  }, [pokemon]);

  // Map our pending result to React content
  const searchResult = useResult(data, {
    ok: (results) = (<>
      <h2>Pokemon found!</h2>
      <ul>
        {results.map(r => <li>{r.Name} - {r.Information}</li>)}
      </ul>
      </>),
    err: (e) => <h2>Failed to fetch Pokemon!</h2>,
    pending: () => <h2>Searching...</h2>
  }, [])

  // NB: doSearch will automatically call preventDefault for us, we don't
  // have to do this ourselves
  return (<main>
    <form onSubmit={doSearch}>
      <input type="text"
        value={pokemon}
        onChange={(e) => setPokemon(e.target.value)} />

      <button type="submit" disabled={data.isPending()}>Search for Pokemon</button>
    </form>

    {searchResult}

  </main>
}
```

### Result Class

`Result` is the current result of a pending asynchronous operation, with states: Ok, Error, and Pending, similar to other languages like Kotlin and Rust's "Result" class

- `ok` - Creates a Result object with a successful value.
- `err` - Creates a Result object representing an error.
- `pending` - Creates a pending Result.
- `fromPromise` - Boxes a Promise into a Result, capturing errors into a Result.

### Instance Methods

- `isOk` - Checks if the result is Ok.
- `isErr` - Checks if the result is an Error.
- `isPending` - Checks if the result is Pending.
- `ok` - Gets the value if the Result is Ok.
- `err` - Gets the error if the result is an Error.
- `isUndefined` - Checks if the Result is an undefined value.
- `okOr` - Gets the Ok value or a default value if the result is not Ok.
- `expect` - Expects the result to be Ok and returns the value, throwing if it is not.
- `expectErr` - Expects the result to be an Error and returns the error, throwing if it is not.
- `map` - Transforms the result by applying a function to the Ok value.
- `mapOrElse` - Unboxes the Result by applying different functions based on the Result type.
- `mapErr` - Transforms the result by applying a function to the Err value.

## What else does this do?

This library is also a grab-bag of all the code I keep copy-pasting into different projects, but this time, it's all documented:

- `useObservable` - A React hook that consumes an RxJS Observable and returns its latest result.
- `usePromise` - A React hook that consumes a Promise and returns its latest result, respecting dependencies similar to useEffect.
- `fromCancellablePromise` - Converts a Promise to an Observable, allowing the Promise handler to signal cancellation.
- `retryPromise` - Retries a promise function a specified number of times.
- `timeout` - Wraps a promise with a timeout.
- `delay` - Delays the execution of a function by the specified number of milliseconds.
- `unawaited` - Executes a promise without awaiting its resolution.
- `promiseFinally` - Executes a block of code after a promise is settled, whether it is fulfilled or rejected.
- `asyncMap` - Maps an array of values to a new array of values using an asynchronous selector function.
- `asyncReduce` - Like reduce, but each selected item is a Promise that is resolved.
