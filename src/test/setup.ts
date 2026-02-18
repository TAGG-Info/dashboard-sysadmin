// Global test setup
// Reset module-level singletons between tests where needed
beforeEach(() => {
  // Ensure clean env for each test
  delete process.env.NEXTAUTH_SECRET;
  delete process.env.CRYPTO_SALT;
  delete process.env.REDIS_URL;
  delete process.env.LDAP_ADMIN_GROUP;
});
