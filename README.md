## Description

A caching tool designed to assist with integrations and automation pipelines.

1. Provide an API abstraction layer to save or load cached data to/from the DB.
2. Allow save and load cached data via Restful and GraphQL APIs.
3. Publish subscribable events with data differentials when cached data is written
    * Events will only be published if the record content changed or the event was named.
    * Includes the saved result and changes from previous.
    * Differences are expressed using JSON Patch.


## Deployment Options

[Terraform module for K8s deployment](tf/k8s)


## Development

```bash
cp .env.default .env
docker-compose up
```

### Tests

```bash
# unit tests
docker-compose run --rm --no-deps api npm run test

# e2e tests
docker-compose run --rm api npm run test:e2e

# test coverage
docker-compose run --rm api npm run test:cov
```


## REST Examples

```bash
# initialize a collection of users
curl localhost:3000/collections -H 'Content-type: application/json' -d '{"id":"users"}'

# save a record (file should contain system, id, globalId, name, content)
curl localhost:3000/collections/users -H 'Content-type: application/json' -d @jsonFile

# save a record using just the id and content
curl localhost:3000/collections/users/somewhere/12345/content -H 'Content-type: application/json' -X PUT -d '{"prop":"test"}'

# load a record
curl localhost:3000/collections/users/somewhere/12345

# load a record's history of changes
curl localhost:3000/history/users/somewhere/12345

# load records by global id and system name
curl localhost:3000/collections/users/somewhere?globalId=4ebc7386-f87b-4e9a-8592-f7b40977d119

# list record references in all systems with the same global id
curl localhost:3000/collections/users?globalId=4ebc7386-f87b-4e9a-8592-f7b40977d119
```
