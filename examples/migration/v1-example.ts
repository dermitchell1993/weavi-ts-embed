/**
 * V1/V2 Example (OLD API - For Reference Only)
 * 
 * This shows the OLD way of using Weaviate client.
 * DO NOT use this in new projects!
 * 
 * This file is for comparison purposes only.
 */

// NOTE: This is pseudo-code showing the v1/v2 API style
// It won't actually run with the current embedded client

/*
import weaviate from 'weaviate-client';

async function oldWay() {
  // V1/V2: More verbose connection
  const client = weaviate.client({
    scheme: 'http',
    host: 'localhost:8080',
  });

  // V1/V2: Class-based approach (not collections)
  const className = 'Wine';

  // V1/V2: Create schema with class definition
  await client.schema
    .classCreator()
    .withClass({
      class: className,
      properties: [
        {
          name: 'name',
          dataType: ['text'],
        },
        {
          name: 'description',
          dataType: ['text'],
        },
      ],
    })
    .do();

  // V1/V2: Insert data using dataObject builder pattern
  const result = await client.data
    .creator()
    .withClassName(className)
    .withProperties({
      name: 'Chardonnay',
      description: 'A crisp white wine',
    })
    .do();

  console.log('Created object:', result);

  // V1/V2: Query using GraphQL-style builder
  const queryResult = await client.graphql
    .get()
    .withClassName(className)
    .withFields('name description')
    .do();

  console.log('Query results:', queryResult);

  // V1/V2: More complex queries
  const nearTextResult = await client.graphql
    .get()
    .withClassName(className)
    .withNearText({
      concepts: ['fruity wine'],
    })
    .withFields('name description')
    .withLimit(5)
    .do();
}
*/

export const v1Note = `
V1/V2 API Characteristics:
- Used schema.classCreator() and class-based terminology
- Builder pattern with .do() at the end of chains
- GraphQL-based queries with .graphql.get()
- More verbose and harder to type-check
- Separate methods for different operations
`;

console.log(v1Note);
console.log('\n⚠️ This is the OLD way - see v3-example.ts for the NEW way!');

