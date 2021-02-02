## Description

A caching tool designed to assist with integrations and automation pipelines.

1. Provide an API abstraction layer to save or load cached data to/from the DB.
2. Allow save and load cached data via Restful and GraphQL APIs.
3. Publish subscribable events with data differentials when cached data is written
    * Events would only be published if a record changed.
    * Includes the new values and changes from previous.
    * Differences are expressed using JSON Patch.


## Running the app

```bash
# development
cp .env.default .env
docker-compose up
```

## Test

```bash
# unit tests
docker-compose run --rm --no-deps api npm run test

# e2e tests
docker-compose run --rm api npm run test:e2e

# test coverage
docker-compose run --rm api npm run test:cov
```


## License

