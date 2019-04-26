import * as React from 'react';
import App from 'next/app';

import withData from '../lib/withData';

class EventsApp extends App {
  static async getInitialProps({ res, query }) {
    return {
      statusCode: res ? res.statusCode : 0
    };
  }

  render() {
    const { Component, pageProps, statusCode } = this.props;
    return <Component statusCode={statusCode} {...pageProps} />
  }
}

export default withData(EventsApp);
