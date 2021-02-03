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

### REST Examples

```bash
# save a record (file should contain id, globalId, name, content)
curl localhost:3000/users/somewhere -d @jsonFile

# save a record using just the id and content
curl localhost:3000/users/somewhere/12345/content -X PUT -d '{"prop":"test"}'

# load a record
curl localhost:3000/users/somewhere/12345

# load a record's history of changes
curl localhost:3000/users/somewhere/12345/history

# load records by global id and system name
curl localhost:3000/users/somewhere?globalId=4ebc7386-f87b-4e9a-8592-f7b40977d119

# list record references in all systems with the same global id
curl localhost:3000/users?globalId=4ebc7386-f87b-4e9a-8592-f7b40977d119
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

