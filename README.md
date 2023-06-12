# ninsho-hook-account-lock

[![build and publish](https://github.com/ninsho/ninsho-hook-account-lock/actions/workflows/run-build-and-publish.yml/badge.svg)](https://github.com/ninsho/ninsho-hook-account-lock/actions/workflows/run-build-and-publish.yml)
[![Coverage Status](https://coveralls.io/repos/github/ninsho/ninsho-hook-account-lock/badge.svg?branch=main)](https://coveralls.io/github/ninsho/ninsho-hook-account-lock?branch=main)

Hook plugin for [ninsho](https://www.npmjs.com/package/ninsho) to lock accounts after multiple failed attempts.

# Sample Code
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

# Sample Source

https://github.com/ninsho/ninsho-example/blob/main/src/index.ts#L281

# Required Arguments

The number of authentication failures that trigger an account lock.
```
failures_allowed_limit: number
```

The number of seconds until the account lock is lifted.
If set to 0, the lock will not be lifted. 
```
account_unlock_duration_sec: number
```

# Optional arguments to set in "options"

The setting for whether to send a notification email when the number of unauthorized authentications exceeds the limit. The default is true (send).  
```
sendLockNotice?: boolean
```

Overwriting the default email subject.
```
mailSubject?: string,
```

Overwriting the default email body.
```
mailBody?: string,
```

# Required in API options
When using this hook, the following specification is required in the options of the API itself.
```
columnToRetrieve: [
  'failed_attempts',
  'last_failed_attempts_at'
],
```



# Development Warning

This project is in development. Features may change without notice.

<!-- README.md -->
