# ninsho-hook-account-lock

[![build and publish](https://github.com/ninsho/ninsho-hook-account-lock/actions/workflows/run-build-and-publish.yml/badge.svg)](https://github.com/ninsho/ninsho-hook-account-lock/actions/workflows/run-build-and-publish.yml)
[![Coverage Status](https://coveralls.io/repos/github/ninsho/ninsho-hook-account-lock/badge.svg?branch=main)](https://coveralls.io/github/ninsho/ninsho-hook-account-lock?branch=main)

Hook plugin for [ninsho](https://www.npmjs.com/package/ninsho) to lock accounts after multiple failed attempts.

# USAGE:

```
hooks: [
  {
    hookPoint: 'beforePasswordCheck', // Fixed value
    hook: AccountLockHook(
      3, // failures_allowed_limit
      60 * 60 * 24, // account_unlock_duration_sec
    )
  },
]
```

# required in options

```
columnToRetrieve: [
  'failed_attempts',
  'last_failed_attempts_at'
],
```

## Development Warning

This project is in development. Features may change without notice.

<!-- README.md -->
