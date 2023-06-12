import util from 'util'
export const log = (...args: any[]) => {
  process.stdout.write(util.format(...args) + '\n')
}

import { defaultOptions } from 'ninsho-base'
import ImmediatelyAPI from 'ninsho-plugin-immediately-api'
import ModPg from 'ninsho-module-pg'
import ModSecure from 'ninsho-module-secure'
import Mailer from 'ninsho-module-mailer'

jest.setTimeout(8000)

/**
 * initializeLocalPlugin
 * @returns [plugin, env, pool]
 */
export function initializeLocalPlugin() {

  const pool = ModPg.init(
    {
      user: 'postgres',
      host: 'localhost',
      database: 'postgres',
      password: 'postgres',
      port: 5432,
      forceRelease: true
    }
  ).setOptions(defaultOptions)

  const secure = ModSecure.init({ secretKey: 'Abracadabra' })

  const mailer = Mailer.initForTest()

  const plugin = ImmediatelyAPI.init().setModules(
    {
      options: defaultOptions,
      pool: pool,
      mailer: mailer,
      secure: secure
    }
  )

  beforeEach(async function() {
    await pool.truncate(['members', 'sessions'])
    log(expect.getState().currentTestName)
  })

  return {
    plugin,
    pool,
    secure
  }
}
