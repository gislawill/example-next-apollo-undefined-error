import * as React from 'react';
import { ApolloProvider, getDataFromTree } from 'react-apollo';
import Head from 'next/head';

import initApollo from './initApollo';

// Gets the display name of a JSX component for dev tools
function getComponentDisplayName(Component) {
  return Component.displayName || Component.name || 'Unknown';
}

export default ComposedComponent =>
  class WithData extends React.Component {
    static displayName = `WithData(${getComponentDisplayName(ComposedComponent)})`;

    static async getInitialProps({ ctx, router }) {
      // Initial serverState with apollo (empty)
      let serverState = { apollo: {} };

      let apolloError = null;
      // Evaluate the composed component's getInitialProps()
      let composedInitialProps = {};
      if (ComposedComponent.getInitialProps) {
        composedInitialProps = await ComposedComponent.getInitialProps(ctx);
      }

      // Run all GraphQL queries in the component tree
      // and extract the resulting data
      if (!process.browser) {
        const apollo = initApollo(serverState);
        // Provide the `url` prop data in case a GraphQL query uses it
        const url = { query: ctx.query, pathname: ctx.pathname };
        try {
          // Run all GraphQL queries
          await getDataFromTree(
            <ApolloProvider client={apollo}>
              <ComposedComponent url={url} router={router} {...composedInitialProps} />
            </ApolloProvider>
          );

        } catch (error) {
          if (error.graphQLErrors && error.graphQLErrors.length) {
            apolloError = {
              ...error.graphQLErrors[0],
              type: 'graphQl error',
              stack: error.stack
            };
          } else if (error.networkError) {
            console.log('networkError')
            apolloError = {
              code: status || 500,
              type: 'networkError',
              message: statusText,
              parseError,
              stack: error.stack
            };
          } else if (error.queryErrors && error.queryErrors.length) {
            apolloError = {
              type: 'queryError',
              code: 500,
              message: 'unknown',
              stack: error.stack
            };
          } else {
            console.log('errors', error)
          }

          // Prevent Apollo Client GraphQL errors from crashing SSR.
          // Handle them in components via the data.error prop:
          // http://dev.apollodata.com/react/api-queries.html#graphql-query-data-error
        }
        // getDataFromTree does not call componentWillUnmount
        // head side effect therefore need to be cleared manually
        Head.rewind();

        // Extract query data from the Apollo store
        serverState = {
          apollo: {
            data: apollo.cache.extract()
          }
        };
      }
      return {
        apolloError,
        serverState,
        ...composedInitialProps
      };
    }

    constructor(props) {
      super(props);
      this.apollo = initApollo(this.props.serverState.apollo.data);
    }

    render() {
      return (
        <ApolloProvider client={this.apollo}>
          <ComposedComponent {...this.props} />
        </ApolloProvider>
      );
    }
  };
