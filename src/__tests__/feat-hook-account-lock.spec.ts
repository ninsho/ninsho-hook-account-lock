import { HooksObjType, MemberInsert } from 'ninsho-base'
import { initializeLocalPlugin, log } from './x-service'

import { MailerStorage } from 'ninsho-module-mailer'

const { pool, plugin } = initializeLocalPlugin()

import AccountLockHook from '../hook-account-lock'

describe('hook-account-lock', () => {

  const user = {
    name: 'test_user',
    mail: 'test@localhost_com',
    newEmail: 'new@localhost_com',
    pass: 'test1234',
    ip: '127.0.0.1',
    sessionDevice: 'test-client',
    view_name: 'is test view',
    tel: '000-0000-0001'
  }

  type MCustomT = Partial<{
    view_name: string,
    tel: string
  }>

  const create = async () => {
    const res = await plugin.createUser<MCustomT>(
      user.name,
      user.mail,
      user.pass,
      user.ip,
      user.sessionDevice,
      {
        view_name: user.view_name,
        tel: user.tel
      },
      {
        sendCompleatNotice: false
      }
    )
    if (res.fail()) throw 100
    return res
  }

  it('200: Positive case', async () => {
    const res0_create = await create()
    // test
    const res1 = await plugin.loginUser(
      user.name,
      user.mail,
      user.pass,
      user.ip,
      user.sessionDevice,
      {
        sendCompleatNotice: false,
        columnToRetrieve: [
          'failed_attempts',
          'last_failed_attempts_at'
        ],
        hooks: [
          {
            hookPoint: 'beforePasswordCheck',
            hook: AccountLockHook(
              3,
              40,
              {
                sendLockNotice: false
              }
            )
          },
        ]
      }
    )
    if (res1.fail()) {
      console.log(res1)
      throw 1
    }
    expect(res1.statusCode).toEqual(200)
    expect(Object.keys(MailerStorage).length).toEqual(0)
  })

  it('429: over fail limit & customize mail text', async () => {
    const res0_create = await create()
    // hook
    const hooks: HooksObjType[] = [
      {
        hookPoint: 'beforePasswordCheck',
        hook: AccountLockHook(
          3,
          60 * 60 * 3,
          {
            sendLockNotice: true,
            mailSubject: 'hi {{name}}!',
            mailBody: 'your account locked.'
          }
        )
      },
    ]
    // test
    for (let expectStatusCode of [401, 401, 429]) {
      const res1 = await plugin.loginUser(
        user.name,
        user.mail,
        user.pass + 'XXX',
        user.ip,
        user.sessionDevice,
        {
          sendCompleatNotice: false,
          columnToRetrieve: [
            'failed_attempts',
            'last_failed_attempts_at'
          ],
          hooks: hooks
        }
      )
      if (!!!res1.fail()) throw 1
      expect(res1.statusCode).toEqual(expectStatusCode)
    }
    expect(MailerStorage[user.mail].mailSubject).toEqual('hi test_user!')
    expect(MailerStorage[user.mail].mailBody).toEqual('your account locked.')
  })

  it('429: over fail limit with default mail text', async () => {
    const res0_create = await create()
    // hook
    const hooks: HooksObjType[] = [
      {
        hookPoint: 'beforePasswordCheck',
        hook: AccountLockHook(
          3,
          60 * 60 * 3,
          {
            sendLockNotice: true
          }
        )
      },
    ]
    // test
    for (let expectStatusCode of [401, 401, 429]) {
      const res1 = await plugin.loginUser(
        user.name,
        user.mail,
        user.pass + 'XXX',
        user.ip,
        user.sessionDevice,
        {
          sendCompleatNotice: false,
          columnToRetrieve: [
            'failed_attempts',
            'last_failed_attempts_at'
          ],
          hooks: hooks
        }
      )
      if (!!!res1.fail()) throw 1
      expect(res1.statusCode).toEqual(expectStatusCode)
    }
    expect(MailerStorage[user.mail].mailSubject).toEqual('[important]Account Lock Notice')
    expect(MailerStorage[user.mail].mailBody).toEqual(
    'Dear test_user.\n'
        + '\nYour account has been temporarily locked due to multiple failed authentication attempts. '
        + '\nIt will be automatically unlocked after a certain period.'
    )
  })

  it('throw: no password', async () => {
    const res0_create = await create()
    // test
    let error: any = null
    try {
      await plugin.loginUser(
        user.name,
        user.mail,
        null as any,
        user.ip,
        user.sessionDevice,
        {
          sendCompleatNotice: false,
          columnToRetrieve: [
            'failed_attempts',
            'last_failed_attempts_at'
          ],
          hooks: [
            {
              hookPoint: 'beforePasswordCheck',
              hook: AccountLockHook(
                3,
                40,
                {
                  sendLockNotice: false
                }
              )
            },
          ]
        }
      )
    } catch (e) {
      error = e as any
    }
    expect(error.message).toEqual('The process will not be executed because the password is undefined.')
  })

  it('200: recovery', async () => {
    const res0_create = await create()
    // hook
    const hooks: HooksObjType[] = [
      {
        hookPoint: 'beforePasswordCheck',
        hook: AccountLockHook(
          3,
          1, // quick recovery
        )
      },
    ]
    for (let expectStatusCode of [401, 401, 429]) {
      const res1 = await plugin.loginUser(
        user.name,
        user.mail,
        user.pass + 'XXX',
        user.ip,
        user.sessionDevice,
        {
          sendCompleatNotice: false,
          columnToRetrieve: [
            'failed_attempts',
            'last_failed_attempts_at'
          ],
          hooks: hooks
        }
      )
      if (!!!res1.fail()) throw 1
      expect(res1.statusCode).toEqual(expectStatusCode)
    }
    // wait
    await new Promise(resolve => setTimeout(resolve, 2000))
    // test
    const res2 = await plugin.loginUser(
      user.name,
      user.mail,
      user.pass,
      user.ip,
      user.sessionDevice,
      {
        sendCompleatNotice: false,
        columnToRetrieve: [
          'failed_attempts',
          'last_failed_attempts_at'
        ],
        hooks: hooks
      }
    )
    if (res2.fail()) throw 1
    expect(res2.statusCode).toEqual(200)
  })

  it('429: correct password in account locking', async () => {
    const res0_create = await create()
    // hook
    const hooks: HooksObjType[] = [
      {
        hookPoint: 'beforePasswordCheck',
        hook: AccountLockHook(
          3,
          3600,
        )
      },
    ]
    for (let expectStatusCode of [401, 401, 429]) {
      const res1 = await plugin.loginUser(
        user.name,
        user.mail,
        user.pass + 'XXX',
        user.ip,
        user.sessionDevice,
        {
          sendCompleatNotice: false,
          columnToRetrieve: [
            'failed_attempts',
            'last_failed_attempts_at'
          ],
          hooks: hooks
        }
      )
      if (!!!res1.fail()) throw 1
      expect(res1.statusCode).toEqual(expectStatusCode)
    }
    // test
    const res2 = await plugin.loginUser(
      user.name,
      user.mail,
      user.pass,
      user.ip,
      user.sessionDevice,
      {
        sendCompleatNotice: false,
        columnToRetrieve: [
          'failed_attempts',
          'last_failed_attempts_at'
        ],
        hooks: hooks
      }
    )
    if (!!!res2.fail()) throw 2
    expect(res2.statusCode).toEqual(429)

  })


  it('400: no name and mail', async () => {
    const res0_create = await create()
    // test
    const res1 = await plugin.loginUser(
      null,
      null,
      user.pass,
      user.ip,
      user.sessionDevice,
      {
        sendCompleatNotice: false,
        columnToRetrieve: [
          'failed_attempts',
          'last_failed_attempts_at'
        ],
        hooks: [
          {
            hookPoint: 'beforePasswordCheck',
            hook: AccountLockHook(
              3,
              40,
              {
                sendLockNotice: false
              }
            )
          },
        ]
      }
    )
    if (!res1.fail()) {
      console.log(res1)
      throw 1
    }
    console.log(res1.body)
    expect(res1.statusCode).toEqual(400)
  })


})
