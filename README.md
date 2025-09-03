# Triteia

A data storage tool designed to assist with integrations and automation pipelines.

1. Provide an API abstraction layer to save or load cached data to/from the DB.
2. Allow save and load cached data via Restful and GraphQL APIs.
3. Publish subscribable events with data differentials when cached data is written
    * Events will only be published if the record content changed or the event was named.
    * Includes the saved result and changes from previous.
    * Differences are expressed using JSON Patch.


## Deployment Options

[Terraform module for K8s deployment](https://github.com/augustine-institute/triteia/tree/main/tf/k8s)


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

## Document Structure

*   **collection:** The real-world type that's represented in multiple systems. This is the table name in the database. (ex: users, products, orders)
*   **globalId:** Your org-wide id for the real-world thing, which connects records across systems (ex: email, sku, uuid)
*   **system:** One of the places records are stored (ex: Accounting, Online-Store, YourApp)
*   **id:** The system-specific id for the record (ex: 1234, Some-ID)
*   **name:** A human readable name
*   **date:** A date for the record, if any is relevant
*   **content:** The record data that's stored in that system (Generally, this is the reponse from that system's api when loading the record.)
*   **createdAt:** When the record was added to Triteia
*   **updatedAt:** When the record was last updated in Triteia
*   **deletedAt:** A soft-delete timestamp that causes records to be hidden, unless specifically requested

## API Endpoint Summary

| Endpoint                                                  | Method | Description                                     |
| --------------------------------------------------------- | ------ | ----------------------------------------------- |
| `/`                                                       | GET    | Root endpoint - API overview                    |
| `/health`                                                 | GET    | Health check                                    |
| `/graphql`                                                | GET    | GraphQL interface                               |
| `/collections`                                            | POST   | Initialize a new collection                     |
| `/collections/:collection`                                | POST   | Save a document                                 |
| `/collections/:collection/:system?`                       | GET    | List documents                                  |
| `/collections/:collection/:system/:id`                    | GET    | Load a specific document                        |
| `/collections/:collection/:system/:id`                    | DELETE | Delete a document                               |
| `/collections/:collection/:system/:id/content`            | GET    | Load content only                               |
| `/collections/:collection/:system/:id/content`            | PUT    | Save content only                               |
| `/collections/:collection/:system/:id/related/:reqSystem?`| GET    | List related documents                          |
| `/history/:collection/:system/:id`                        | GET    | Retrieve full event history                     |

## Health Check Endpoint

**GET `/health`**

*   **Description:**  Performs a health check on the application and its dependencies.  This endpoint is intended for monitoring and automated health checks.
*   **Example Request:**
    ```bash
    curl http://localhost:3000/health
    ```
*   **Response:**  A `HealthCheckResult` object indicating the status of the application.
*   **Notes:**  Critical for automated deployment and monitoring.

## GraphQL Endpoint

**GET/POST `/graphql`**

*   **Description:**  This the GraphQL interface that mirrors the REST functionality.
*   **Types:**
    * [Collection](src/schema/collection.graphql)
    * [Document](src/schema/document.graphql)
    * [Event](src/schema/event.graphql)
*   **Operations:**
    * [Mutations](src/schema/mutations.graphql)
    * [Queries](src/schema/queries.graphql)

## Collection Endpoints (Data Management)

### Initialize Collection

**POST `/collections`**

*   **Description:** Initializes a new collection. Requires an ID.
*   **Body:**
    ```json
    { "id": "table_name" }
    ```
*   **Example Request:**
    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{"id": "users"}' http://localhost:3000/collections
    ```
*   **Response:** A `Collection` object.
*   **Notes:**  Requires a unique collection ID.

### Save Document

**POST `/collections/:collection`**

*   **Description:** Saves a document to a specific collection.
*   **Parameters:**
    *   `collection` (required): The name of the collection.
*   **Body:**
    ```json
    {
      "system": "system-name",
      "id": "document-id",
      "globalId": "global-id-value",
      "name": "Document Name",
      "date": "2024-10-27T10:00:00.000Z",
      "content": { "key": "value" },
      "event": { "name": "custom-event" }
    }
    ```
*   **Example Request:**
    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{"system": "inventory", "id": "123", "globalId": "sku-123"}' http://localhost:3000/collections/products
    ```
*   **Response:** A `Document` object.
*   **Notes:**  `merge` option can be used (boolean).

### List Documents

**GET `/collections/:collection/:system?`**

*   **Description:** Lists records within a specific collection. Requires a global ID parameter.
*   **Parameters:**
    *   `collection` (required):  The name of the collection.
    *   `system` (optional): A system to filter by.
    *   `globalId` (required, query parameter):  The global ID to find records for.
*   **Example Request:**
    ```bash
    curl "http://localhost:3000/collections/products?globalId=sku-123"
    ```
*   **Response:** A `ListResponse` containing an array of `Document` objects.
*   **Notes:**  The `globalId` parameter is mandatory.  The `system` parameter is used to filter documents by the system they belong to.

### Load Document

**GET `/collections/:collection/:system/:id`**

*   **Description:**  Loads a specific document by its URI.
*   **Parameters:**
    *   `collection` (required): The name of the collection.
    *   `system` (required): The system the document belongs to.
    *   `id` (required): The ID of the document.
    *   `deleted` (optional, query parameter):  Whether to include deleted documents (boolean).
    *   `at` (optional, query parameter): Load document at a specific timestamp.
*   **Example Request:**
    ```bash
    curl "http://localhost:3000/collections/products/inventory/123"
    ```
*   **Response:** A `Document` object.
*   **Notes:** Essential for retrieving individual records.

### Delete Document

**DELETE `/collections/:collection/:system/:id`**

*   **Description:** Deletes a document, marking it as deleted.
*   **Parameters:**
    *   `collection` (required): The name of the collection.
    *   `system` (required): The system of the document.
    *   `id` (required): The ID of the document.
    *   `deletedAt` (optional, query parameter):  The timestamp indicating when the document was deleted.
*   **Example Request:**
    ```bash
    curl -X DELETE http://localhost:3000/collections/products/inventory/sku-123
    ```
*   **Response:** A `Document` object.

### Save Content

**PUT `/collections/:collection/:system/:id/content`**

*   **Description:**  Saves just the content of a record.
*   **Parameters:**  Same as `Load Collection` endpoint.
*   **Body:** A `Record<string, unknown>` object containing the content to save.
*   **Example Request:**
    ```bash
    curl -X PUT -H "Content-Type: application/json" -d '{"new_key": "new_value"}' http://localhost:3000/collections/products/inventory/sku-123/content
    ```
*   **Response:**  A `JsonPatch` array representing the changes made.

### Load Content

**GET `/collections/:collection/:system/:id/content`**

*   **Description:**  Loads just the content of the record, skipping cache metadata.
*   **Parameters:**  Same as `Load Collection` endpoint.
*   **Response:** A `Record<string, unknown>` object representing the content.

### List Related Documents

**GET `/collections/:collection/:system/:id/related/:reqSystem?`**

*   **Description:** Lists records that share the same global ID as another document.
*   **Parameters:**
    *   `collection` (required): The name of the collection.
    *   `system` (required): The system of the document.
    *   `id` (required): The ID of the document.
    *   `reqSystem` (optional, in URL): The system to search related documents in.
    *   `withContent` (optional, query parameter):  Whether to include content (boolean).
    *   `deleted` (optional, query parameter): Whether to include deleted documents (boolean).
*   **Response:** An array of `Document` objects.

### Load History

**GET `/history/:collection/:system/:id`**

*   **Description:** Retrieves the full history of changes for a specific document.
*   **Parameters:**
    *   `collection` (required): The name of the collection.
    *   `system` (required): The system of the document.
    *   `id` (required): The ID of the document.
    *   `page` (optional, query parameter):  Page number for pagination.
    *   `pageSize` (optional, query parameter): Number of events per page.
    *   `asc` (optional, query parameter): Sort events in ascending order (boolean).
*   **Response:** A `HistoryResponse` object.

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
