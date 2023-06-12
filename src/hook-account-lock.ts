import { MemberInsert, E400, E401, E429, E500, ErrorBase, IResult, Success, LendType, HookAccept } from 'ninsho-base'
import { getCurrentTimeDiffInSec, localTimeToUnixTime } from 'ninsho-utils'

/**
 * @param failures_allowed_limit 
 * @param account_unlock_duration_sec 
 * @param options
 *    sendLockNotice: notification preference
 *    mailSubject: When specified, apply the text.
 *    mailBody: When specified, apply the text.
 * @returns Hook function
 */
export default function AccountLockHook(
  failures_allowed_limit: number,
  account_unlock_duration_sec: number,
  options?: {
    sendLockNotice?: boolean,
    mailSubject?: string,
    mailBody?: string
  }
) {

  /**
   * Preparation for sending emails
   */
  const sender = async function notice(
    lend: LendType,
    accept: HookAccept
  ) {
    /** request element */
    const req = accept.req
    /** database element */
    const props = accept.props
    /** elements prepared by the caller */
    const others = accept.others

    try {
      await lend.modules.mailer.sender(
        req.mail,
        options?.mailSubject || '[important]Account Lock Notice',
        options?.mailBody
        || 'Dear {{name}}.\n'
        + '\nYour account has been temporarily locked due to multiple failed authentication attempts. '
        + '\nIt will be automatically unlocked after a certain period.',
        {
          ...req,
          ...{
            unlock_duration_hour: /* istanbul ignore next */ account_unlock_duration_sec
              ? Math.floor(account_unlock_duration_sec / 60 / 60)
              : 0,
          }
        }
      )
    } catch (e) /* istanbul ignore next */ {
      return new E500(0.1000, 'fail send notice')
    }
  }

  /**
   * Returning a method
   */
  return async (
    lend: LendType,
    accept: HookAccept
  ): Promise<IResult<any, ErrorBase>> => {
    /* istanbul ignore if */
    if (!accept.props) return new E400(0.1001, 'database irregular case')
    /** request element */
    const req = accept.req
    /** database element */
    const props = accept.props
    /** elements prepared by the caller */
    const others = accept.others

    // Error if no password (password is required when using this hook).
    if (!req.pass) {
      throw new Error('The process will not be executed because the password is undefined.')
    }

    const conditionSet: { m_name?: string, m_mail?: string } = {}
    if (req.name) conditionSet.m_name = req.name
    if (req.mail) conditionSet.m_mail = req.mail
    /* istanbul ignore if */ // Assumptions that have been validated by the API.
    if (!Object.keys(conditionSet).length) return new E400(0.1002)

    /** Number of failures */
    let failedCount = props.failed_attempts || 0
    /** Account is locked */
    let nowLocking = failedCount >= failures_allowed_limit
    /** Expiration removal */
    let Expired = false
    /** valid password flag */
    const isValidPassword = lend.modules.secure.checkHashPassword(req.pass, props.m_pass)

    if (props.last_failed_attempts_at) {
      const diff = getCurrentTimeDiffInSec(localTimeToUnixTime(props.last_failed_attempts_at))
      if (account_unlock_duration_sec && diff > account_unlock_duration_sec) {
        failedCount = 0
        nowLocking = false
        Expired = true
      } else if (nowLocking && isValidPassword) {
        // Even if the password is correct, it will be an error if the account is locked.
        return new E429(0.1003, 'Too Many Requests')
      }
    }

    if (!isValidPassword) {

      nowLocking = ++failedCount >= failures_allowed_limit

      const upd = await lend.modules.pool.updateOneOrThrow<MemberInsert>(
        {
          failed_attempts: failedCount,
          last_failed_attempts_at: (new Date).toISOString()
        },
        conditionSet,
        'AND',
        lend.options.tableName.members)
        /* istanbul ignore if */
      if (upd.fail()) return upd.pushReplyCode(0.1004)

      // notification
      if (options?.sendLockNotice && failures_allowed_limit && failedCount === failures_allowed_limit) {
        await sender(lend, accept)
      }

      if (nowLocking) {
        return new E429(0.1004, 'Too Many Requests')
      } else {
        return new E401(0.1005, 'unauthorized password')
      }

    } else if (Expired) {
      const upd = await lend.modules.pool.updateOneOrThrow<MemberInsert>(
        {
          failed_attempts: 0,
          last_failed_attempts_at: null
        },
        conditionSet,
        'AND',
        lend.options.tableName.members)
      /* istanbul ignore if */
      if (upd.fail()) return upd.pushReplyCode(0.1006)
      
    }

    others.passwordChecked = true

    return new Success(null)
  }

}
