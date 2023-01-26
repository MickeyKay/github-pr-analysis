# github-pr-analysis
Minimal script/instructions to get PR/review info via the GitHub GraphQL API


### Instructions
1. Run the following query in [GitHub's GraphQL Explorer](https://docs.github.com/en/graphql/overview/explorer). Update `query` as needed to configure the target repo and PR creation date filtering.
	```
	{
	  search(
	    type: ISSUE,
	    query: "repo:NerdWallet/front-page is:pr created:<2022-12-31",
	    first: 100
	  ) {
	    pageInfo {
	      startCursor
	      hasNextPage
	      endCursor
	    }
	    edges {
	      node {
	        ... on PullRequest {
	          author {
	            login
	          }
	          repository {
	            name
	          }
	          title
	          number
	          createdAt
	          totalCommentsCount
	          comments(first: 100, orderBy: {field: UPDATED_AT, direction: DESC}) {
	            nodes {
	              author {
	                login
	              }
	              body
	            }
	          }
	          reviews(first: 45) {
	            nodes {
	              author {login}
	              comments(first: 100) {
	                nodes {
	                  author {login}
	                  body
	                }
	              }
	              state
	            }
	          }
	        }
	      }
	    }
	  }
	}
	```
1. Copy/paste/save the query response into a new `/data/{app-name}.json` file (e.g. `/data/front-page.json`).
1. Repeat steps 1-2 for all repos you'd like to analyze.
1. Run `node extract-pr-stats`

This will generate two artifacts:
1. `analysis.csv` - A comma-separated export that can be imported into a spreadsheet tool for further analysis.
1. `pr-data.json` - A consolidated aggregation of all PR data from the various `/data/*` files in one easy-to-parse object.

### Configuration options
The following variables can be configured in `extract-pr-stats.js`:
| Variable | Description |
| -------- | ----------- |
| `USERS_TO_ANALYZE` | GitHub users to include in the analysis (other users will be omitted). Will include all users if left empty. |
