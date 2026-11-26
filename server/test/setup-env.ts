import 'dotenv/config';

const testUrl = process.env.TEST_DATABASE_URL;

if (!testUrl) {
  throw new Error('TEST_DATABASE_URL is required to run e2e tests');
}
if (!/_test(\?.*)?$/.test(testUrl)) {
  throw new Error(
    'TEST_DATABASE_URL must point to a database whose name ends with _test',
  );
}

process.env.DATABASE_URL = testUrl;
